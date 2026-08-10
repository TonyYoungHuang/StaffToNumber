import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { db, initDb } from "../db.js";

test("schema triggers create, acknowledge, and recreate legacy dispatches in task transactions", () => {
  initDb();
  const suffix = randomUUID();
  const userId = `user-${suffix}`;
  const fileId = `file-${suffix}`;
  const jobId = `job-${suffix}`;
  const now = "2026-07-17T00:00:00.000Z";
  db.prepare("INSERT INTO users (id, email, password_hash, password_salt, created_at, updated_at) VALUES (?, ?, 'hash', 'salt', ?, ?)")
    .run(userId, `${suffix}@example.test`, now, now);
  db.prepare(`
    INSERT INTO files (id, user_id, original_name, stored_name, storage_path, mime_type, size_bytes, file_kind, created_at)
    VALUES (?, ?, 'score.pdf', 'score.pdf', 'test/score.pdf', 'application/pdf', 1, 'source_pdf', ?)
  `).run(fileId, userId, now);
  db.prepare(`
    INSERT INTO jobs (id, user_id, input_file_id, direction, status, result_kind, created_at, updated_at)
    VALUES (?, ?, ?, 'staff_pdf_to_numbered', 'queued', 'none', ?, ?)
  `).run(jobId, userId, fileId, now, now);

  const queued = db.prepare("SELECT id, status FROM job_dispatch_outbox WHERE job_family = 'legacy' AND job_id = ?").all(jobId) as Array<{
    id: string;
    status: string;
  }>;
  assert.equal(queued.length, 1);
  assert.equal(queued[0].status, "queued");
  db.prepare("UPDATE jobs SET status = 'processing', updated_at = ? WHERE id = ?").run("2026-07-17T00:00:01.000Z", jobId);
  assert.equal((db.prepare("SELECT status FROM job_dispatch_outbox WHERE id = ?").get(queued[0].id) as Record<string, unknown>).status, "acknowledged");
  db.prepare("UPDATE jobs SET status = 'failed', updated_at = ? WHERE id = ?").run("2026-07-17T00:00:02.000Z", jobId);
  db.prepare("UPDATE jobs SET status = 'queued', updated_at = ? WHERE id = ?").run("2026-07-17T00:00:03.000Z", jobId);
  const dispatches = db.prepare("SELECT status FROM job_dispatch_outbox WHERE job_family = 'legacy' AND job_id = ? ORDER BY created_at, id").all(jobId) as Array<Record<string, unknown>>;
  assert.deepEqual(dispatches.map((entry) => entry.status).sort(), ["acknowledged", "queued"]);

  db.prepare("DELETE FROM job_dispatch_outbox WHERE job_family = 'legacy' AND job_id = ?").run(jobId);
  db.prepare("DELETE FROM jobs WHERE id = ?").run(jobId);
  db.prepare("DELETE FROM files WHERE id = ?").run(fileId);
  db.prepare("DELETE FROM users WHERE id = ?").run(userId);
});
