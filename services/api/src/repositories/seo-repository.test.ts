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
  createSeoContentReviewDecision,
  createSeoSearchSnapshot,
  getSeoSearchDashboard,
  listSeoContentReviews,
  listSeoSearchSnapshots,
  registerSeoContentManifest,
} = await import("./seo-repository.js");

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
