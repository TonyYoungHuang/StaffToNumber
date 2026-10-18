import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { finishJobFailure, markJobFailed } from "./job-failure.js";

// Exercise the real reservation triggers, including both historical job tables.
const prepaidSchemaUrl = new URL("../../api/src/lib/prepaid-schema.ts", import.meta.url).href;
const { PREPAID_SQLITE_TRIGGERS } = await import(prepaidSchemaUrl) as { PREPAID_SQLITE_TRIGGERS: string };

for (const family of ["score", "legacy"] as const) {
  test(`${family} failure persists terminal state and releases credits before failing diagnostics`, () => {
    const db = new DatabaseSync(":memory:");
    db.exec(`CREATE TABLE score_jobs (id TEXT PRIMARY KEY, status TEXT, error_message TEXT, updated_at TEXT, completed_at TEXT, progress_percent INTEGER);
      CREATE TABLE jobs (id TEXT PRIMARY KEY, status TEXT, error_message TEXT, updated_at TEXT, completed_at TEXT);
      CREATE TABLE prepaid_credit_charges (job_family TEXT, job_id TEXT, credit_cost NUMERIC, status TEXT);
      INSERT INTO ${family === "score" ? "score_jobs" : "jobs"} (id,status) VALUES ('job-1','processing');
      INSERT INTO prepaid_credit_charges VALUES ('${family}','job-1',5,'reserved');
      ${PREPAID_SQLITE_TRIGGERS}`);
    const table = family === "score" ? "score_jobs" : "jobs";
    let nextDiagnosticRan = false, errors = 0;
    const assertReleased = () => {
      assert.equal((db.prepare(`SELECT status FROM ${table}`).get() as { status: string }).status, "failed");
      assert.equal((db.prepare("SELECT status FROM prepaid_credit_charges").get() as { status: string }).status, "released");
    };
    try {
      finishJobFailure({
        terminal: () => markJobFailed({ db, family, jobId: "job-1", message: "recognition failed", timestamp: "2026-10-18T00:00:00Z" }),
        diagnostics: [() => { assertReleased(); throw new Error("diagnostic store unavailable"); }, () => { assertReleased(); nextDiagnosticRan = true; }],
        onDiagnosticError: () => { errors += 1; throw new Error("logger unavailable"); },
      });
      assertReleased();
      assert.equal(nextDiagnosticRan, true);
      assert.equal(errors, 1);
      // A late failure cannot corrupt a succeeded job or release spent credits.
      db.exec(`UPDATE ${table} SET status='completed'; UPDATE prepaid_credit_charges SET status='spent';`);
      markJobFailed({ db, family, jobId: "job-1", message: "late failure", timestamp: "later" });
      assert.equal((db.prepare(`SELECT status FROM ${table}`).get() as { status: string }).status, "completed");
      assert.equal((db.prepare("SELECT status FROM prepaid_credit_charges").get() as { status: string }).status, "spent");
    } finally { db.close(); }
  });
}

test("failure diagnostics never run when the mandatory terminal write fails", () => {
  let called = false;
  assert.throws(() => finishJobFailure({ terminal: () => { throw new Error("database unavailable"); }, diagnostics: [() => { called = true; }] }), /database unavailable/u);
  assert.equal(called, false);
});
