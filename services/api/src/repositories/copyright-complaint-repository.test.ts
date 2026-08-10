import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import { config } from "../config.js";
import { db, initDb } from "../db.js";
import { authPlugin } from "../plugins/auth.js";
import { copyrightRoutes } from "../routes/copyright.js";
import {
  createCopyrightComplaint,
  deleteCopyrightComplaintForTest,
  findPublicCopyrightComplaint,
  listCopyrightComplaintEvents,
  transitionCopyrightComplaint,
} from "./copyright-complaint-repository.js";

test("copyright complaint access codes are hashed and public lookup exposes only public events", () => {
  initDb();
  const { complaint, accessCode } = createCopyrightComplaint({
    locale: "zh-CN",
    claimantName: "版权人",
    claimantEmail: "rights@example.test",
    rightsBasis: "owner",
    originalWorkDescription: "这是一份原创钢琴作品及其对应的正式出版乐谱。",
    allegedlyInfringingUrls: ["http://localhost:3001/scores/shared/test"],
    evidenceUrls: ["https://example.test/evidence"],
    requestedAction: "请暂停公开分享并保存相关处理记录。",
    signature: "版权人",
    responseHours: 48,
  });
  try {
    assert.notEqual(complaint.access_code_hash, accessCode);
    assert.equal(findPublicCopyrightComplaint(complaint.reference_code, "wrong"), undefined);
    assert.equal(findPublicCopyrightComplaint(complaint.reference_code, accessCode)?.id, complaint.id);
    const moved = transitionCopyrightComplaint({
      id: complaint.id,
      toStatus: "validating",
      actorId: "admin-test",
      publicMessage: "材料已进入核验。",
      internalNote: "internal-only evidence note",
    });
    assert.equal(moved.ok, true);
    assert.equal(listCopyrightComplaintEvents(complaint.id).some((event) => event.internal_note === "internal-only evidence note"), true);
  } finally {
    deleteCopyrightComplaintForTest(complaint.id);
  }
});

test("copyright complaint state machine requires public reasons and documented action", () => {
  initDb();
  const { complaint } = createCopyrightComplaint({
    locale: "en",
    claimantName: "Rights Owner",
    claimantEmail: "owner@example.test",
    rightsBasis: "owner",
    originalWorkDescription: "An original engraved score published by the claimant.",
    allegedlyInfringingUrls: ["http://localhost:3001/scores/shared/test"],
    evidenceUrls: [],
    requestedAction: "Disable public access while reviewing the claim.",
    signature: "Rights Owner",
    responseHours: 48,
  });
  try {
    assert.equal(transitionCopyrightComplaint({ id: complaint.id, toStatus: "actioned", actorId: "admin" }).reason, "invalid_transition");
    assert.equal(transitionCopyrightComplaint({ id: complaint.id, toStatus: "reviewing", actorId: "admin", internalNote: "verified" }).ok, true);
    assert.equal(transitionCopyrightComplaint({ id: complaint.id, toStatus: "actioned", actorId: "admin", actionTaken: "share revoked" }).reason, "public_message_required");
    assert.equal(transitionCopyrightComplaint({ id: complaint.id, toStatus: "actioned", actorId: "admin", publicMessage: "Access was disabled." }).reason, "action_required");
    assert.equal(transitionCopyrightComplaint({ id: complaint.id, toStatus: "actioned", actorId: "admin", publicMessage: "Access was disabled.", actionTaken: "share revoked" }).ok, true);
  } finally {
    deleteCopyrightComplaintForTest(complaint.id);
  }
});

test("copyright API validates declarations, protects lookup, and keeps admin notes private", async () => {
  initDb();
  const previousAdminKey = config.adminApiKey;
  config.adminApiKey = "copyright-admin-key-with-32-characters";
  const app = Fastify({ logger: false });
  await app.register(authPlugin);
  await app.register(copyrightRoutes, { prefix: "/api" });
  await app.ready();
  let complaintId: string | null = null;
  const previousLog = console.log;
  console.log = () => undefined;
  try {
    const payload = {
      locale: "zh-CN",
      claimantName: "测试权利人",
      claimantEmail: "claimant@example.test",
      rightsBasis: "owner",
      originalWorkDescription: "一份由测试权利人原创并独立出版的完整乐谱作品。",
      allegedlyInfringingUrls: ["http://localhost:3001/scores/shared/case"],
      evidenceUrls: [],
      requestedAction: "请暂时停止对应分享链接并核实上传授权。",
      signature: "测试权利人",
      goodFaithDeclared: true,
      accuracyDeclared: true,
    };
    const invalid = await app.inject({ method: "POST", url: "/api/copyright/complaints", payload: { ...payload, accuracyDeclared: false } });
    assert.equal(invalid.statusCode, 400);
    const created = await app.inject({ method: "POST", url: "/api/copyright/complaints", payload });
    assert.equal(created.statusCode, 201);
    const createdPayload = created.json() as { referenceCode: string; accessCode: string };
    const row = db.prepare("SELECT id, access_code_hash FROM copyright_complaints WHERE reference_code = ?").get(createdPayload.referenceCode) as { id: string; access_code_hash: string };
    complaintId = row.id;
    assert.notEqual(row.access_code_hash, createdPayload.accessCode);

    const denied = await app.inject({ method: "POST", url: "/api/copyright/complaints/lookup", payload: { referenceCode: createdPayload.referenceCode, accessCode: "wrong" } });
    assert.equal(denied.statusCode, 404);
    assert.equal((await app.inject({ method: "GET", url: "/api/admin/copyright/complaints" })).statusCode, 401);
    const transitioned = await app.inject({
      method: "PATCH",
      url: `/api/admin/copyright/complaints/${row.id}`,
      headers: { "x-admin-api-key": config.adminApiKey },
      payload: { status: "validating", publicMessage: "已开始核验材料。", internalNote: "never-return-this-note" },
    });
    assert.equal(transitioned.statusCode, 200);
    const lookup = await app.inject({ method: "POST", url: "/api/copyright/complaints/lookup", payload: createdPayload });
    assert.equal(lookup.statusCode, 200);
    assert.equal(lookup.body.includes("已开始核验材料"), true);
    assert.equal(lookup.body.includes("never-return-this-note"), false);
    assert.equal(lookup.body.includes("claimant@example.test"), false);
  } finally {
    console.log = previousLog;
    if (complaintId) deleteCopyrightComplaintForTest(complaintId);
    config.adminApiKey = previousAdminKey;
    await app.close();
  }
});
