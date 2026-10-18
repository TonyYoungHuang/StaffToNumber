import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import Fastify from "fastify";
import multipart from "@fastify/multipart";
import { PDFDocument } from "pdf-lib";
import { initDb } from "../db.js";
import { config } from "../config.js";
import { authPlugin } from "../plugins/auth.js";
import { createUser, createSession, generateActivationCodes, redeemActivationCode } from "../repositories/auth-repository.js";
import { listScoreJobsByDocumentId } from "../repositories/score-repository.js";
import { stageOmrUpload } from "../lib/staged-omr-uploads.js";
import { scoreRoutes } from "./scores.js";

test("direct, staged confirmation and checkout preparation share fresh admission for lanes on/off and free/paid accounts", async () => {
  initDb();
  const previous = process.env.RECOGNITION_LANES_ENABLED;
  try {
    const pdf = await PDFDocument.create(); pdf.addPage([100, 100]); const bytes = Buffer.from(await pdf.save());
    for (const enabled of [false, true]) for (const paid of [false, true]) {
      process.env.RECOGNITION_LANES_ENABLED = String(enabled);
      const results = [];
      for (const entry of ["direct", "staged", "draft"] as const) {
        const user = createUser(`${randomUUID()}@admission-paths.test`, "hash", "salt")!;
        if (paid) {
          const code = generateActivationCodes({ planCode: "starter-monthly", quantity: 1, entitlementDays: 30 }).codes[0]!;
          assert.ok(redeemActivationCode(user.id, code.code).ok);
        }
        const token = randomUUID(); createSession(user.id, token, 1);
        const app = Fastify(); await app.register(multipart); await app.register(authPlugin); await app.register(scoreRoutes, { prefix: "/api" });
        const headers = { authorization: `Bearer ${token}`, "idempotency-key": randomUUID() };
        try {
          let response;
          if (entry === "direct") {
            const boundary = `score-${randomUUID()}`;
            response = await app.inject({ method: "POST", url: "/api/scores/import/omr?recognitionMode=simple", headers: { ...headers, "content-type": `multipart/form-data; boundary=${boundary}` },
              payload: Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="score.pdf"\r\nContent-Type: application/pdf\r\n\r\n`), bytes, Buffer.from(`\r\n--${boundary}--\r\n`)]) });
          } else {
            const sourcePath = path.join(config.storageDir, `${randomUUID()}.pdf`); await fs.mkdir(config.storageDir, { recursive: true }); await fs.writeFile(sourcePath, bytes);
            // Deliberately no old assessment: the current original source is authoritative.
            const staged = await stageOmrUpload({ sourcePath, userId: user.id, filename: "score.pdf", sizeBytes: bytes.length, mimeType: "application/pdf", detectedKind: "pdf" });
            response = await app.inject({ method: "POST", url: entry === "draft" ? "/api/scores/upload-drafts/prepare" : "/api/scores/import/omr", headers,
              payload: { stagedUploadId: staged.id, recognitionMode: "simple" } });
          }
          assert.equal(response.statusCode, 201, `${entry}/${enabled}/${paid}: ${response.body}`);
          if (entry === "draft") results.push(response.json().draft.memoryAssessment);
          else {
            const scoreId = response.json().score.id;
            const params = JSON.parse(listScoreJobsByDocumentId(scoreId)[0]!.params_json!);
            results.push(params.memoryAssessment);
            assert.equal(params.creditSource, paid ? "plan" : "free_trial");
          }
        } finally { await app.close(); }
      }
      assert.deepEqual(results[0], results[1]); assert.deepEqual(results[1], results[2]);
    }
  } finally { if (previous === undefined) delete process.env.RECOGNITION_LANES_ENABLED; else process.env.RECOGNITION_LANES_ENABLED = previous; }
});
