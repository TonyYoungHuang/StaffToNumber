import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";

const testDir = fs.mkdtempSync(path.join(os.tmpdir(), "seo-search-repository-"));
process.env.DB_FILE = path.join(testDir, "test.sqlite");
process.env.STORAGE_DIR = path.join(testDir, "storage");

const { db, initDb } = await import("../db.js");
const {
  createAudienceEvidenceSnapshot,
  createSeoContentReviewDecision,
  createSeoSearchSnapshot,
  getAudienceEvidenceReport,
  getSeoSearchDashboard,
  listAudienceEvidenceSnapshots,
  listSeoContentReviews,
  listSeoSearchSnapshots,
  registerSeoContentManifest,
} = await import("./seo-repository.js");
const { normalizeAudienceEvidenceImport } = await import("../lib/audience-evidence.js");

initDb();

after(() => {
  db.close();
  fs.rmSync(testDir, { recursive: true, force: true });
});

test("search snapshots persist metrics and aggregate CTR and weighted position", () => {
  const snapshot = createSeoSearchSnapshot({
    provider: "google_search_console",
    propertyUri: "sc-domain:scoretransposer.com",
    startDate: "2026-07-01",
    endDate: "2026-07-14",
    importedBy: "test-admin",
    metrics: [
      { query: "transpose score", page: "https://scoretransposer.com/transpose-score", clicks: 10, impressions: 100, ctr: 0.1, position: 2 },
      { query: "transpose score", page: "https://scoretransposer.com/transpose-score", clicks: 5, impressions: 50, ctr: 0.1, position: 4 },
      { query: "staff to jianpu", page: "https://scoretransposer.com/staff-to-jianpu", clicks: 3, impressions: 60, ctr: 0.05, position: 8 },
    ],
    indexIssues: [
      { page: "https://scoretransposer.com/old-route", severity: "error", issueType: "not_found", verdict: "FAIL" },
    ],
    sourceMetadata: { export: "search-analytics" },
  });

  assert.ok(snapshot);
  assert.equal(snapshot.rowCount, 3);
  assert.equal(snapshot.issueCount, 1);
  assert.equal(listSeoSearchSnapshots()[0].id, snapshot.id);

  const dashboard = getSeoSearchDashboard(snapshot.id);
  assert.equal(dashboard.totals.clicks, 18);
  assert.equal(dashboard.totals.impressions, 210);
  assert.equal(dashboard.totals.ctr, 18 / 210);
  assert.equal(Math.round(dashboard.totals.position * 100) / 100, 4.19);
  assert.equal(dashboard.queries[0].query, "transpose score");
  assert.equal(dashboard.queries[0].clicks, 15);
  assert.equal(dashboard.pages[0].page, "https://scoretransposer.com/transpose-score");
  assert.equal(dashboard.indexIssues[0].issueType, "not_found");
});

test("dashboard returns an explicit empty state before any selected snapshot exists", () => {
  const dashboard = getSeoSearchDashboard("missing-snapshot");
  assert.equal(dashboard.snapshot, null);
  assert.deepEqual(dashboard.queries, []);
  assert.deepEqual(dashboard.pages, []);
});

test("audience evidence snapshot cross-checks aggregate edge and GA4 exports with completed backend work", () => {
  const createdAt = "2026-08-24T08:00:00.000Z";
  for (const id of ["audience-user-1", "audience-user-2"]) {
    db.prepare("INSERT INTO users (id, email, password_hash, password_salt, created_at, updated_at) VALUES (?, ?, 'hash', 'salt', ?, ?)")
      .run(id, `${id}@example.test`, createdAt, createdAt);
  }
  db.prepare(`
    INSERT INTO score_jobs (id, user_id, job_type, status, created_at, updated_at, completed_at)
    VALUES ('audience-score-job', 'audience-user-1', 'omr_import', 'completed', ?, ?, ?)
  `).run(createdAt, createdAt, createdAt);
  db.prepare(`
    INSERT INTO score_jobs (id, user_id, job_type, status, created_at, updated_at, completed_at)
    VALUES ('outside-period-job', 'audience-user-2', 'omr_import', 'completed', '2026-08-20T00:00:00.000Z', '2026-08-20T00:00:00.000Z', '2026-08-20T00:00:00.000Z')
  `).run();
  const evidence = normalizeAudienceEvidenceImport({
    cloudflare: {
      exportedAt: "2026-08-25T09:00:00Z",
      periodUniqueIpCount: 12,
      rows: [
        { date: "2026-08-24", classification: "likely_human", asn: 13335, requests: 60, uniqueIpCount: 10 },
        { date: "2026-08-24", classification: "likely_automated", asn: 16509, requests: 40, uniqueIpCount: 2 },
      ],
    },
    ga4: {
      startDate: "2026-08-24",
      endDate: "2026-08-24",
      exportedAt: "2026-08-25T09:05:00Z",
      activeUsers: 8,
      engagedSessions: 5,
      eventCount: 40,
      keyEvents: 2,
      internalTrafficExcluded: true,
      consentMode: "consent_required",
      topEvents: [{ eventName: "free_omr_preview_viewed", eventCount: 1, activeUsers: 1 }],
    },
  });
  assert.ok(evidence);

  const report = createAudienceEvidenceSnapshot({
    propertyUri: "https://scoretransposer.com",
    startDate: "2026-08-24",
    endDate: "2026-08-24",
    importedBy: "test-admin",
    evidence,
  });
  assert.ok(report);
  assert.equal(report.backend.registrations, 2);
  assert.equal(report.backend.completedScoreJobs, 1);
  assert.equal(report.backend.completedJobUsers, 1);
  assert.equal(report.methodology.canProveEveryActiveUserIsHuman, false);
  const snapshotId = report.snapshot.id;
  assert.equal(typeof snapshotId, "string");
  assert.equal(getAudienceEvidenceReport(snapshotId as string)?.assessment.signalLevel, "strong_cross_source_product_use_signal");
  assert.equal(listAudienceEvidenceSnapshots()[0].id, snapshotId);
  assert.equal(listSeoSearchSnapshots().some((snapshot) => snapshot.id === snapshotId), false, "audience imports must not replace the latest search-console snapshot");
  assert.equal(getSeoSearchDashboard(snapshotId as string).snapshot, null);
});

test("content approvals are bound to an exact manifest hash and become stale after content changes", () => {
  const baseItem = {
    slug: "transpose-score",
    contentHash: "a".repeat(64),
    title: "Transpose sheet music",
    description: "A factual feature description.",
    canonical: "/transpose-score",
    primaryKeyword: "transpose sheet music",
    evidence: { screenshot: "/product/transpose.png" },
  };
  registerSeoContentManifest([baseItem], "manifest-importer");
  assert.equal(listSeoContentReviews()[0].review, null);

  const approval = createSeoContentReviewDecision({
    slug: baseItem.slug,
    contentHash: baseItem.contentHash,
    status: "approved",
    factsChecked: true,
    duplicationChecked: true,
    evidenceChecked: true,
    reviewedBy: "Product editor",
    notes: "Compared with the current product build.",
  });
  assert.equal(approval?.status, "approved");
  assert.equal(listSeoContentReviews()[0].publishReady, true);

  registerSeoContentManifest([{ ...baseItem, contentHash: "b".repeat(64), title: "Updated transpose page" }], "manifest-importer");
  const changed = listSeoContentReviews()[0];
  assert.equal(changed.contentHash, "b".repeat(64));
  assert.equal(changed.review, null);
  assert.equal(changed.publishReady, false);
  assert.equal(createSeoContentReviewDecision({ ...approval!, contentHash: baseItem.contentHash, notes: null }), null);
});
