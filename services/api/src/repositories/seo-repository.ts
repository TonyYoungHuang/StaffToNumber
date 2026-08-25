import { randomUUID } from "node:crypto";
import { db } from "../db.js";
import {
  buildAudienceEvidenceReport,
  normalizeAudienceEvidenceImport,
  type BackendAudienceEvidence,
  type NormalizedAudienceEvidenceImport,
} from "../lib/audience-evidence.js";

export type SeoSearchProvider = "google_search_console" | "baidu_ziyuan" | "bing_webmaster" | "manual" | "audience_evidence";

export type SeoSearchMetricInput = {
  query: string | null;
  page: string;
  country?: string | null;
  device?: string | null;
  searchAppearance?: string | null;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type SeoIndexIssueInput = {
  page: string;
  severity: "error" | "warning" | "info";
  issueType: string;
  verdict?: string | null;
  coverageState?: string | null;
  robotsTxtState?: string | null;
  indexedCanonical?: string | null;
  userCanonical?: string | null;
  lastCrawlAt?: string | null;
  details?: Record<string, unknown> | null;
};

export type SeoContentManifestItemInput = {
  slug: string;
  contentHash: string;
  title: string;
  description: string;
  canonical: string;
  primaryKeyword: string;
  evidence: Record<string, unknown>;
};

export type SeoContentReviewStatus = "in_review" | "approved" | "changes_requested";

export type SeoContentReviewDecisionInput = {
  slug: string;
  contentHash: string;
  status: SeoContentReviewStatus;
  factsChecked: boolean;
  duplicationChecked: boolean;
  evidenceChecked: boolean;
  reviewedBy: string;
  notes?: string | null;
};

type SnapshotRow = {
  id: string;
  provider: SeoSearchProvider;
  property_uri: string;
  start_date: string;
  end_date: string;
  imported_by: string;
  imported_at: string;
  row_count: number;
  issue_count: number;
  source_metadata_json: string | null;
};

type MetricAggregateRow = {
  query: string | null;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

type IndexIssueRow = {
  id: string;
  page_url: string;
  severity: "error" | "warning" | "info";
  issue_type: string;
  verdict: string | null;
  coverage_state: string | null;
  robots_txt_state: string | null;
  indexed_canonical: string | null;
  user_canonical: string | null;
  last_crawl_at: string | null;
  details_json: string | null;
};

type ContentItemRow = {
  slug: string;
  content_hash: string;
  title: string;
  description: string;
  canonical: string;
  primary_keyword: string;
  evidence_json: string;
  registered_by: string;
  registered_at: string;
};

type ContentReviewRow = {
  id: string;
  slug: string;
  content_hash: string;
  status: SeoContentReviewStatus;
  facts_checked: number;
  duplication_checked: number;
  evidence_checked: number;
  reviewed_by: string;
  notes: string | null;
  created_at: string;
};

function parseJsonRecord(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function mapSnapshot(row: SnapshotRow) {
  return {
    id: row.id,
    provider: row.provider,
    propertyUri: row.property_uri,
    startDate: row.start_date,
    endDate: row.end_date,
    importedBy: row.imported_by,
    importedAt: row.imported_at,
    rowCount: row.row_count,
    issueCount: row.issue_count,
    sourceMetadata: parseJsonRecord(row.source_metadata_json),
  };
}

export function createSeoSearchSnapshot(input: {
  provider: SeoSearchProvider;
  propertyUri: string;
  startDate: string;
  endDate: string;
  importedBy: string;
  metrics: SeoSearchMetricInput[];
  indexIssues: SeoIndexIssueInput[];
  sourceMetadata?: Record<string, unknown> | null;
}) {
  const snapshotId = randomUUID();
  const importedAt = new Date().toISOString();
  const insertSnapshot = db.prepare(`
    INSERT INTO seo_search_snapshots
      (id, provider, property_uri, start_date, end_date, imported_by, imported_at, row_count, issue_count, source_metadata_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertMetric = db.prepare(`
    INSERT INTO seo_search_metrics
      (id, snapshot_id, query_text, page_url, country, device, search_appearance, clicks, impressions, ctr, position)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertIssue = db.prepare(`
    INSERT INTO seo_index_issues
      (id, snapshot_id, page_url, severity, issue_type, verdict, coverage_state, robots_txt_state, indexed_canonical, user_canonical, last_crawl_at, details_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.exec("BEGIN IMMEDIATE");
  try {
    insertSnapshot.run(
      snapshotId,
      input.provider,
      input.propertyUri,
      input.startDate,
      input.endDate,
      input.importedBy,
      importedAt,
      input.metrics.length,
      input.indexIssues.length,
      input.sourceMetadata ? JSON.stringify(input.sourceMetadata) : null,
    );
    for (const metric of input.metrics) {
      insertMetric.run(
        randomUUID(), snapshotId, metric.query, metric.page, metric.country ?? null, metric.device ?? null,
        metric.searchAppearance ?? null, metric.clicks, metric.impressions, metric.ctr, metric.position,
      );
    }
    for (const issue of input.indexIssues) {
      insertIssue.run(
        randomUUID(), snapshotId, issue.page, issue.severity, issue.issueType, issue.verdict ?? null,
        issue.coverageState ?? null, issue.robotsTxtState ?? null, issue.indexedCanonical ?? null,
        issue.userCanonical ?? null, issue.lastCrawlAt ?? null, issue.details ? JSON.stringify(issue.details) : null,
      );
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return getSeoSearchSnapshot(snapshotId);
}

export function getSeoSearchSnapshot(snapshotId: string) {
  const row = db.prepare("SELECT * FROM seo_search_snapshots WHERE id = ?").get(snapshotId) as SnapshotRow | undefined;
  return row ? mapSnapshot(row) : null;
}

export function listSeoSearchSnapshots(limit = 20) {
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  return (db.prepare("SELECT * FROM seo_search_snapshots WHERE provider <> 'audience_evidence' ORDER BY imported_at DESC LIMIT ?").all(safeLimit) as SnapshotRow[]).map(mapSnapshot);
}

export function getSeoSearchDashboard(snapshotId?: string | null, limit = 25) {
  const snapshot = snapshotId
    ? getSeoSearchSnapshot(snapshotId)
    : (() => {
        const row = db.prepare("SELECT * FROM seo_search_snapshots WHERE provider <> 'audience_evidence' ORDER BY imported_at DESC LIMIT 1").get() as SnapshotRow | undefined;
        return row ? mapSnapshot(row) : null;
      })();

  if (!snapshot || snapshot.provider === "audience_evidence") {
    return { snapshot: null, totals: { clicks: 0, impressions: 0, ctr: 0, position: 0 }, queries: [], pages: [], indexIssues: [] };
  }

  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const totals = db.prepare(`
    SELECT COALESCE(SUM(clicks), 0) AS clicks,
           COALESCE(SUM(impressions), 0) AS impressions,
           CASE WHEN SUM(impressions) > 0 THEN SUM(clicks) / SUM(impressions) ELSE 0 END AS ctr,
           CASE WHEN SUM(impressions) > 0 THEN SUM(position * impressions) / SUM(impressions) ELSE 0 END AS position
    FROM seo_search_metrics WHERE snapshot_id = ?
  `).get(snapshot.id) as { clicks: number; impressions: number; ctr: number; position: number };

  const selectAggregate = (dimension: "query_text" | "page_url") => db.prepare(`
    SELECT ${dimension} AS ${dimension === "query_text" ? "query" : "page"},
           ${dimension === "query_text" ? "MIN(page_url) AS page," : "NULL AS query,"}
           SUM(clicks) AS clicks,
           SUM(impressions) AS impressions,
           CASE WHEN SUM(impressions) > 0 THEN SUM(clicks) / SUM(impressions) ELSE 0 END AS ctr,
           CASE WHEN SUM(impressions) > 0 THEN SUM(position * impressions) / SUM(impressions) ELSE 0 END AS position
    FROM seo_search_metrics
    WHERE snapshot_id = ? ${dimension === "query_text" ? "AND query_text IS NOT NULL" : ""}
    GROUP BY ${dimension}
    ORDER BY clicks DESC, impressions DESC
    LIMIT ?
  `).all(snapshot.id, safeLimit) as MetricAggregateRow[];

  const indexIssues = (db.prepare(`
    SELECT * FROM seo_index_issues WHERE snapshot_id = ?
    ORDER BY CASE severity WHEN 'error' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END, page_url
    LIMIT ?
  `).all(snapshot.id, safeLimit) as IndexIssueRow[]).map((row) => ({
    id: row.id,
    page: row.page_url,
    severity: row.severity,
    issueType: row.issue_type,
    verdict: row.verdict,
    coverageState: row.coverage_state,
    robotsTxtState: row.robots_txt_state,
    indexedCanonical: row.indexed_canonical,
    userCanonical: row.user_canonical,
    lastCrawlAt: row.last_crawl_at,
    details: parseJsonRecord(row.details_json),
  }));

  return {
    snapshot,
    totals,
    queries: selectAggregate("query_text"),
    pages: selectAggregate("page_url"),
    indexIssues,
  };
}

function endDateExclusive(endDate: string) {
  const end = new Date(`${endDate}T00:00:00.000Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  return end.toISOString();
}

function countValue(sql: string, ...parameters: unknown[]) {
  const row = db.prepare(sql).get(...parameters) as { count?: number | string } | undefined;
  return Number(row?.count ?? 0);
}

function collectBackendAudienceEvidence(startDate: string, endDate: string): BackendAudienceEvidence {
  const start = `${startDate}T00:00:00.000Z`;
  const end = endDateExclusive(endDate);
  return {
    calculatedAt: new Date().toISOString(),
    registrations: countValue("SELECT COUNT(*) AS count FROM users WHERE created_at >= ? AND created_at < ?", start, end),
    completedLegacyJobs: countValue("SELECT COUNT(*) AS count FROM jobs WHERE status = 'completed' AND completed_at >= ? AND completed_at < ?", start, end),
    completedScoreJobs: countValue("SELECT COUNT(*) AS count FROM score_jobs WHERE status = 'completed' AND completed_at >= ? AND completed_at < ?", start, end),
    completedJobUsers: countValue(`
      SELECT COUNT(*) AS count FROM (
        SELECT user_id FROM jobs WHERE status = 'completed' AND completed_at >= ? AND completed_at < ?
        UNION
        SELECT user_id FROM score_jobs WHERE status = 'completed' AND completed_at >= ? AND completed_at < ?
      ) completed_users
    `, start, end, start, end),
  };
}

function normalizedStoredBackend(value: unknown): BackendAudienceEvidence | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const calculatedAt = typeof source.calculatedAt === "string" && !Number.isNaN(Date.parse(source.calculatedAt))
    ? source.calculatedAt
    : null;
  const integer = (item: unknown) => Number.isSafeInteger(Number(item)) && Number(item) >= 0 ? Number(item) : null;
  const registrations = integer(source.registrations);
  const completedLegacyJobs = integer(source.completedLegacyJobs);
  const completedScoreJobs = integer(source.completedScoreJobs);
  const completedJobUsers = integer(source.completedJobUsers);
  if (!calculatedAt || registrations == null || completedLegacyJobs == null || completedScoreJobs == null || completedJobUsers == null) return null;
  return { calculatedAt, registrations, completedLegacyJobs, completedScoreJobs, completedJobUsers };
}

export function createAudienceEvidenceSnapshot(input: {
  propertyUri: string;
  startDate: string;
  endDate: string;
  importedBy: string;
  evidence: NormalizedAudienceEvidenceImport;
}) {
  const snapshotId = randomUUID();
  const importedAt = new Date().toISOString();
  db.exec("BEGIN");
  try {
    const backend = collectBackendAudienceEvidence(input.startDate, input.endDate);
    const sourceMetadata = { ...input.evidence, backend };
    db.prepare(`
      INSERT INTO seo_search_snapshots
        (id, provider, property_uri, start_date, end_date, imported_by, imported_at, row_count, issue_count, source_metadata_json)
      VALUES (?, 'audience_evidence', ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(
      snapshotId,
      input.propertyUri,
      input.startDate,
      input.endDate,
      input.importedBy,
      importedAt,
      input.evidence.cloudflare.rows.length + input.evidence.ga4.topEvents.length,
      JSON.stringify(sourceMetadata),
    );
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return getAudienceEvidenceReport(snapshotId);
}

export function listAudienceEvidenceSnapshots(limit = 20) {
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  return (db.prepare("SELECT * FROM seo_search_snapshots WHERE provider = 'audience_evidence' ORDER BY imported_at DESC LIMIT ?").all(safeLimit) as SnapshotRow[]).map(mapSnapshot);
}

export function getAudienceEvidenceReport(snapshotId?: string | null) {
  const row = snapshotId
    ? db.prepare("SELECT * FROM seo_search_snapshots WHERE id = ? AND provider = 'audience_evidence'").get(snapshotId) as SnapshotRow | undefined
    : db.prepare("SELECT * FROM seo_search_snapshots WHERE provider = 'audience_evidence' ORDER BY imported_at DESC LIMIT 1").get() as SnapshotRow | undefined;
  if (!row) return null;
  const metadata = parseJsonRecord(row.source_metadata_json);
  const evidence = normalizeAudienceEvidenceImport(metadata);
  const backend = normalizedStoredBackend(metadata?.backend);
  if (!evidence || !backend) return null;
  return buildAudienceEvidenceReport({ snapshot: { ...mapSnapshot(row) }, evidence, backend });
}

function mapContentReview(row: ContentReviewRow | undefined) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    contentHash: row.content_hash,
    status: row.status,
    factsChecked: Boolean(row.facts_checked),
    duplicationChecked: Boolean(row.duplication_checked),
    evidenceChecked: Boolean(row.evidence_checked),
    reviewedBy: row.reviewed_by,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export function registerSeoContentManifest(items: SeoContentManifestItemInput[], registeredBy: string) {
  const registeredAt = new Date().toISOString();
  const upsert = db.prepare(`
    INSERT INTO seo_content_items
      (slug, content_hash, title, description, canonical, primary_keyword, evidence_json, registered_by, registered_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(slug) DO UPDATE SET
      content_hash = excluded.content_hash,
      title = excluded.title,
      description = excluded.description,
      canonical = excluded.canonical,
      primary_keyword = excluded.primary_keyword,
      evidence_json = excluded.evidence_json,
      registered_by = excluded.registered_by,
      registered_at = excluded.registered_at
  `);

  db.exec("BEGIN IMMEDIATE");
  try {
    for (const item of items) {
      upsert.run(
        item.slug,
        item.contentHash,
        item.title,
        item.description,
        item.canonical,
        item.primaryKeyword,
        JSON.stringify(item.evidence),
        registeredBy,
        registeredAt,
      );
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return listSeoContentReviews();
}

export function listSeoContentReviews() {
  const items = db.prepare("SELECT * FROM seo_content_items ORDER BY canonical").all() as ContentItemRow[];
  const latestReview = db.prepare(`
    SELECT * FROM seo_content_review_events
    WHERE slug = ? AND content_hash = ?
    ORDER BY created_at DESC, id DESC LIMIT 1
  `);
  return items.map((item) => {
    const review = latestReview.get(item.slug, item.content_hash) as ContentReviewRow | undefined;
    return {
      slug: item.slug,
      contentHash: item.content_hash,
      title: item.title,
      description: item.description,
      canonical: item.canonical,
      primaryKeyword: item.primary_keyword,
      evidence: parseJsonRecord(item.evidence_json) ?? {},
      registeredBy: item.registered_by,
      registeredAt: item.registered_at,
      review: mapContentReview(review),
      publishReady: review?.status === "approved"
        && Boolean(review.facts_checked)
        && Boolean(review.duplication_checked)
        && Boolean(review.evidence_checked),
    };
  });
}

export function createSeoContentReviewDecision(input: SeoContentReviewDecisionInput) {
  const current = db.prepare("SELECT content_hash FROM seo_content_items WHERE slug = ?").get(input.slug) as { content_hash: string } | undefined;
  if (!current || current.content_hash !== input.contentHash) return null;

  const id = randomUUID();
  const createdAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO seo_content_review_events
      (id, slug, content_hash, status, facts_checked, duplication_checked, evidence_checked, reviewed_by, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.slug,
    input.contentHash,
    input.status,
    input.factsChecked ? 1 : 0,
    input.duplicationChecked ? 1 : 0,
    input.evidenceChecked ? 1 : 0,
    input.reviewedBy,
    input.notes ?? null,
    createdAt,
  );
  const row = db.prepare("SELECT * FROM seo_content_review_events WHERE id = ?").get(id) as ContentReviewRow;
  return mapContentReview(row);
}
