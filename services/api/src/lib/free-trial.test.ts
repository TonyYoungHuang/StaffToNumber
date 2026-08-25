import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import { db, initDb } from "../db.js";
import { PDFDocument } from "pdf-lib";
import { createToken } from "./auth.js";
import { parseJianpuToScoreJson } from "./jianpu-score-parser.js";
import { authPlugin } from "../plugins/auth.js";
import { scoreRoutes } from "../routes/scores.js";
import { createSession } from "../repositories/auth-repository.js";
import {
  assertFreeTrialOmrAvailable,
  FreeTrialLimitError,
  getFreeTrialAccess,
  inspectFreeTrialPdf,
  isFreeTrialScoreDocumentForUser,
} from "./free-trial.js";

function insertUser(id: string, email: string) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO users (id, email, password_hash, password_salt, created_at, updated_at, account_status)
    VALUES (?, ?, 'hash', 'salt', ?, ?, 'active')
  `).run(id, email, now, now);
}

test("a new account receives exactly one OMR preview before upgrade", () => {
  initDb();
  const suffix = crypto.randomUUID();
  const userId = `trial-${suffix}`;
  insertUser(userId, `${suffix}@trial.test`);

  const initial = getFreeTrialAccess(userId);
  assert.equal(initial.omrJobsLimit, 1);
  assert.equal(initial.omrJobsUsed, 0);
  assert.equal(initial.omrJobsRemaining, 1);
  assert.equal(initial.available, true);
  assert.doesNotThrow(() => assertFreeTrialOmrAvailable(userId));

  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO score_jobs (id, user_id, document_id, input_file_id, job_type, status, params_json, created_at, updated_at)
    VALUES (?, ?, NULL, NULL, 'omr_import', 'completed', ?, ?, ?)
  `).run(`trial-job-${suffix}`, userId, JSON.stringify({ freeTrial: true }), now, now);

  const consumed = getFreeTrialAccess(userId);
  assert.equal(consumed.omrJobsUsed, 1);
  assert.equal(consumed.omrJobsRemaining, 0);
  assert.equal(consumed.available, false);
  assert.throws(
    () => assertFreeTrialOmrAvailable(userId),
    (error: unknown) => error instanceof FreeTrialLimitError
      && error.code === "FREE_TRIAL_OMR_LIMIT_REACHED"
      && error.statusCode === 403,
  );
});

test("the free score project accepts a complete multi-page PDF", async () => {
  const onePage = await PDFDocument.create();
  onePage.addPage();
  assert.deepEqual(await inspectFreeTrialPdf(await onePage.save()), { pageCount: 1 });

  const twoPages = await PDFDocument.create();
  twoPages.addPage();
  twoPages.addPage();
  assert.deepEqual(await inspectFreeTrialPdf(await twoPages.save()), { pageCount: 2 });
});

test("free editing access is scoped to the marked OMR project and its owner", () => {
  initDb();
  const suffix = crypto.randomUUID();
  const userId = `free-edit-owner-${suffix}`;
  const otherUserId = `free-edit-other-${suffix}`;
  const documentId = `free-edit-document-${suffix}`;
  const paidDocumentId = `paid-document-${suffix}`;
  const now = new Date().toISOString();
  insertUser(userId, `${suffix}-owner@trial.test`);
  insertUser(otherUserId, `${suffix}-other@trial.test`);

  db.prepare(`
    INSERT INTO score_documents (id, user_id, title, status, created_at, updated_at)
    VALUES (?, ?, 'Free editing project', 'candidate', ?, ?),
           (?, ?, 'Paid project', 'candidate', ?, ?)
  `).run(documentId, userId, now, now, paidDocumentId, userId, now, now);
  db.prepare(`
    INSERT INTO score_jobs (id, user_id, document_id, job_type, status, params_json, created_at, updated_at)
    VALUES (?, ?, ?, 'omr_import', 'completed', ?, ?, ?),
           (?, ?, ?, 'omr_import', 'completed', ?, ?, ?)
  `).run(
    `free-edit-job-${suffix}`, userId, documentId, JSON.stringify({ freeTrial: true }), now, now,
    `paid-job-${suffix}`, userId, paidDocumentId, JSON.stringify({ freeTrial: false }), now, now,
  );

  assert.equal(isFreeTrialScoreDocumentForUser(documentId, userId), true);
  assert.equal(isFreeTrialScoreDocumentForUser(documentId, otherUserId), false);
  assert.equal(isFreeTrialScoreDocumentForUser(paidDocumentId, userId), false);
});

test("the lifetime free project can use an endpoint that was previously paid-only", async () => {
  initDb();
  const suffix = crypto.randomUUID();
  const userId = `free-project-owner-${suffix}`;
  const documentId = `free-project-document-${suffix}`;
  const revisionId = `free-project-revision-${suffix}`;
  const now = new Date().toISOString();
  insertUser(userId, `${suffix}-project@trial.test`);
  const token = createToken();
  createSession(userId, token, 1);
  const scoreJson = parseJianpuToScoreJson({
    text: "1=C\n4/4\n| 1 2 3 4 |",
    importedAt: now,
    sourceOriginalName: "free-project.jianpu.txt",
  });
  db.prepare(`
    INSERT INTO score_documents (id, user_id, title, current_revision_id, status, created_at, updated_at)
    VALUES (?, ?, 'Free complete score', ?, 'ready', ?, ?)
  `).run(documentId, userId, revisionId, now, now);
  db.prepare(`
    INSERT INTO score_revisions (id, document_id, revision_number, score_json, created_from, created_at)
    VALUES (?, ?, 1, ?, 'omr_import', ?)
  `).run(revisionId, documentId, JSON.stringify(scoreJson), now);
  db.prepare(`
    INSERT INTO score_jobs (id, user_id, document_id, job_type, status, params_json, created_at, updated_at)
    VALUES (?, ?, ?, 'omr_import', 'completed', ?, ?, ?)
  `).run(`free-project-job-${suffix}`, userId, documentId, JSON.stringify({ freeTrial: true }), now, now);

  const app = Fastify({ logger: false });
  await app.register(authPlugin);
  await app.register(scoreRoutes, { prefix: "/api" });
  await app.ready();
  try {
    const playback = await app.inject({
      method: "GET",
      url: `/api/scores/${documentId}/playback`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(playback.statusCode, 200, playback.body);
    assert.ok(playback.json<{ playback: { events: unknown[] } }>().playback.events.length > 0);
  } finally {
    await app.close();
  }
});
