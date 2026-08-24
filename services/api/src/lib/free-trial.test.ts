import assert from "node:assert/strict";
import test from "node:test";
import { db, initDb } from "../db.js";
import { PDFDocument } from "pdf-lib";
import {
  assertFreeTrialOmrAvailable,
  assertFreeTrialPdfPageLimit,
  FreeTrialLimitError,
  FreeTrialPageLimitError,
  getFreeTrialAccess,
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
  assert.equal(initial.maxSourcePages, 1);
  assert.doesNotThrow(() => assertFreeTrialOmrAvailable(userId));

  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO score_jobs (id, user_id, document_id, input_file_id, job_type, status, created_at, updated_at)
    VALUES (?, ?, NULL, NULL, 'omr_import', 'completed', ?, ?)
  `).run(`trial-job-${suffix}`, userId, now, now);

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

test("the free PDF preview accepts one page and rejects a multi-page source", async () => {
  const onePage = await PDFDocument.create();
  onePage.addPage();
  assert.equal(await assertFreeTrialPdfPageLimit(await onePage.save(), 1), 1);

  const twoPages = await PDFDocument.create();
  twoPages.addPage();
  twoPages.addPage();
  const twoPageSource = await twoPages.save();
  await assert.rejects(
    () => assertFreeTrialPdfPageLimit(twoPageSource, 1),
    (error: unknown) => error instanceof FreeTrialPageLimitError
      && error.code === "FREE_TRIAL_PAGE_LIMIT_EXCEEDED"
      && error.actualPages === 2,
  );
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
