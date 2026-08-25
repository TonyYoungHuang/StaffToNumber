import type { FastifyInstance } from "fastify";
import {
  createAudienceEvidenceSnapshot,
  createSeoContentReviewDecision,
  createSeoSearchSnapshot,
  getAudienceEvidenceReport,
  getSeoSearchDashboard,
  listAudienceEvidenceSnapshots,
  listSeoContentReviews,
  listSeoSearchSnapshots,
  registerSeoContentManifest,
  type SeoContentManifestItemInput,
  type SeoContentReviewStatus,
  type SeoIndexIssueInput,
  type SeoSearchMetricInput,
  type SeoSearchProvider,
} from "../repositories/seo-repository.js";
import { audienceEvidenceReportCsv, normalizeAudienceEvidenceImport } from "../lib/audience-evidence.js";

const providers = new Set<SeoSearchProvider>(["google_search_console", "baidu_ziyuan", "bing_webmaster", "manual"]);
const reviewStatuses = new Set<SeoContentReviewStatus>(["in_review", "approved", "changes_requested"]);

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function finiteNumber(value: unknown, minimum = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= minimum ? number : null;
}

function normalizeMetrics(value: unknown): SeoSearchMetricInput[] | null {
  if (!Array.isArray(value) || value.length > 10000) return null;
  const rows: SeoSearchMetricInput[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") return null;
    const item = raw as Record<string, unknown>;
    const page = typeof item.page === "string" ? item.page.trim() : "";
    const clicks = finiteNumber(item.clicks);
    const impressions = finiteNumber(item.impressions);
    const ctr = finiteNumber(item.ctr);
    const position = finiteNumber(item.position);
    if (!page || page.length > 2048 || clicks == null || impressions == null || ctr == null || ctr > 1 || position == null) return null;
    rows.push({
      query: typeof item.query === "string" ? item.query.trim().slice(0, 1000) || null : null,
      page,
      country: typeof item.country === "string" ? item.country.trim().slice(0, 40) || null : null,
      device: typeof item.device === "string" ? item.device.trim().slice(0, 40) || null : null,
      searchAppearance: typeof item.searchAppearance === "string" ? item.searchAppearance.trim().slice(0, 120) || null : null,
      clicks,
      impressions,
      ctr,
      position,
    });
  }
  return rows;
}

function normalizeIndexIssues(value: unknown): SeoIndexIssueInput[] | null {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 5000) return null;
  const rows: SeoIndexIssueInput[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") return null;
    const item = raw as Record<string, unknown>;
    const page = typeof item.page === "string" ? item.page.trim() : "";
    const issueType = typeof item.issueType === "string" ? item.issueType.trim() : "";
    const severity = item.severity === "error" || item.severity === "warning" || item.severity === "info" ? item.severity : null;
    if (!page || page.length > 2048 || !issueType || issueType.length > 240 || !severity) return null;
    const optional = (key: string, max = 2048) => typeof item[key] === "string" ? item[key].trim().slice(0, max) || null : null;
    rows.push({
      page,
      issueType,
      severity,
      verdict: optional("verdict", 120),
      coverageState: optional("coverageState", 240),
      robotsTxtState: optional("robotsTxtState", 120),
      indexedCanonical: optional("indexedCanonical"),
      userCanonical: optional("userCanonical"),
      lastCrawlAt: optional("lastCrawlAt", 80),
      details: item.details && typeof item.details === "object" && !Array.isArray(item.details) ? item.details as Record<string, unknown> : null,
    });
  }
  return rows;
}

function normalizeManifest(value: unknown): SeoContentManifestItemInput[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) return null;
  const rows: SeoContentManifestItemInput[] = [];
  const slugs = new Set<string>();
  const canonicals = new Set<string>();
  for (const raw of value) {
    if (!raw || typeof raw !== "object") return null;
    const item = raw as Record<string, unknown>;
    const slug = typeof item.slug === "string" ? item.slug.trim() : "";
    const contentHash = typeof item.contentHash === "string" ? item.contentHash.trim().toLowerCase() : "";
    const title = typeof item.title === "string" ? item.title.trim() : "";
    const description = typeof item.description === "string" ? item.description.trim() : "";
    const canonical = typeof item.canonical === "string" ? item.canonical.trim() : "";
    const primaryKeyword = typeof item.primaryKeyword === "string" ? item.primaryKeyword.trim() : "";
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !/^[a-f0-9]{64}$/.test(contentHash)) return null;
    if (!title || title.length > 200 || !description || description.length > 1000 || !canonical.startsWith("/") || canonical.length > 2048 || !primaryKeyword || primaryKeyword.length > 200) return null;
    if (slugs.has(slug) || canonicals.has(canonical)) return null;
    slugs.add(slug);
    canonicals.add(canonical);
    rows.push({
      slug,
      contentHash,
      title,
      description,
      canonical,
      primaryKeyword,
      evidence: item.evidence && typeof item.evidence === "object" && !Array.isArray(item.evidence)
        ? item.evidence as Record<string, unknown>
        : {},
    });
  }
  return rows;
}

export async function adminSeoRoutes(app: FastifyInstance) {
  app.get("/admin/seo/audience-evidence", { preHandler: app.requireAdmin }, async (request) => {
    const query = (request.query ?? {}) as { snapshotId?: string; limit?: string };
    const limit = Number(query.limit ?? 20);
    return {
      snapshots: listAudienceEvidenceSnapshots(Number.isFinite(limit) ? limit : 20),
      report: getAudienceEvidenceReport(query.snapshotId?.trim() || null),
    };
  });

  app.get("/admin/seo/audience-evidence/export", { preHandler: app.requireAdmin }, async (request, reply) => {
    const query = (request.query ?? {}) as { snapshotId?: string; format?: string };
    const report = getAudienceEvidenceReport(query.snapshotId?.trim() || null);
    if (!report) return reply.code(404).send({ error: "Audience evidence snapshot not found." });
    if (query.format?.trim().toLowerCase() !== "csv") return { report };
    reply.header("content-type", "text/csv; charset=utf-8");
    reply.header("content-disposition", `attachment; filename="audience-evidence-${report.snapshot.id}.csv"`);
    return reply.send(audienceEvidenceReportCsv(report));
  });

  app.post("/admin/seo/audience-evidence/import", { preHandler: app.requireAdmin }, async (request, reply) => {
    const body = (request.body ?? {}) as Record<string, unknown>;
    const propertyUri = typeof body.propertyUri === "string" ? body.propertyUri.trim() : "";
    const evidence = normalizeAudienceEvidenceImport(body);
    const startDate = isIsoDate(body.startDate) ? body.startDate : null;
    const endDate = isIsoDate(body.endDate) ? body.endDate : null;
    if (!propertyUri || propertyUri.length > 2048 || !startDate || !endDate || !evidence) {
      return reply.code(400).send({ error: "A valid period plus aggregated Cloudflare and GA4 evidence export is required." });
    }
    if (startDate > endDate) {
      return reply.code(400).send({ error: "Start date must not be after end date." });
    }
    if (evidence.ga4.startDate !== startDate || evidence.ga4.endDate !== endDate) {
      return reply.code(400).send({ error: "The GA4 export period must exactly match the report period." });
    }
    if (evidence.cloudflare.rows.some((row) => row.date < startDate || row.date > endDate)) {
      return reply.code(400).send({ error: "Every Cloudflare segment date must fall inside the reporting period." });
    }
    const report = createAudienceEvidenceSnapshot({
      propertyUri,
      startDate,
      endDate,
      importedBy: request.adminId ?? "admin-api",
      evidence,
    });
    return reply.code(201).send({ report, snapshots: listAudienceEvidenceSnapshots(20) });
  });

  app.get("/admin/seo/search", { preHandler: app.requireAdmin }, async (request) => {
    const query = (request.query ?? {}) as { snapshotId?: string; limit?: string };
    const limit = Number(query.limit ?? 25);
    return {
      snapshots: listSeoSearchSnapshots(20),
      dashboard: getSeoSearchDashboard(query.snapshotId?.trim() || null, Number.isFinite(limit) ? limit : 25),
      contentReviews: listSeoContentReviews(),
    };
  });

  app.post("/admin/seo/content/manifest", { preHandler: app.requireAdmin }, async (request, reply) => {
    const body = (request.body ?? {}) as Record<string, unknown>;
    const nestedManifest = body.manifest && typeof body.manifest === "object" && !Array.isArray(body.manifest)
      ? body.manifest as Record<string, unknown>
      : null;
    const items = normalizeManifest(nestedManifest?.pages ?? body.pages);
    if (!items) {
      return reply.code(400).send({ error: "A valid versioned feature content manifest is required." });
    }
    return reply.code(201).send({ contentReviews: registerSeoContentManifest(items, request.adminId ?? "admin-api") });
  });

  app.post("/admin/seo/content/:slug/review", { preHandler: app.requireAdmin }, async (request, reply) => {
    const params = request.params as { slug?: string };
    const body = (request.body ?? {}) as Record<string, unknown>;
    const slug = params.slug?.trim() ?? "";
    const contentHash = typeof body.contentHash === "string" ? body.contentHash.trim().toLowerCase() : "";
    const status = typeof body.status === "string" && reviewStatuses.has(body.status as SeoContentReviewStatus)
      ? body.status as SeoContentReviewStatus
      : null;
    const reviewedBy = typeof body.reviewedBy === "string" ? body.reviewedBy.trim() : "";
    const factsChecked = body.factsChecked === true;
    const duplicationChecked = body.duplicationChecked === true;
    const evidenceChecked = body.evidenceChecked === true;
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";

    if (!slug || !/^[a-f0-9]{64}$/.test(contentHash) || !status || reviewedBy.length < 2 || reviewedBy.length > 120 || notes.length > 4000) {
      return reply.code(400).send({ error: "Review status, current content hash, and reviewer identity are required." });
    }
    if (status === "approved" && (!factsChecked || !duplicationChecked || !evidenceChecked)) {
      return reply.code(400).send({ error: "Approval requires fact, duplication, and evidence checks." });
    }
    const review = createSeoContentReviewDecision({
      slug,
      contentHash,
      status,
      factsChecked,
      duplicationChecked,
      evidenceChecked,
      reviewedBy,
      notes: notes || null,
    });
    if (!review) return reply.code(409).send({ error: "The content hash is stale or the manifest item does not exist." });
    return { review, contentReviews: listSeoContentReviews() };
  });

  app.post("/admin/seo/search/import", { preHandler: app.requireAdmin }, async (request, reply) => {
    const body = (request.body ?? {}) as Record<string, unknown>;
    const provider = typeof body.provider === "string" && providers.has(body.provider as SeoSearchProvider)
      ? body.provider as SeoSearchProvider
      : null;
    const propertyUri = typeof body.propertyUri === "string" ? body.propertyUri.trim() : "";
    const metrics = normalizeMetrics(body.metrics);
    const indexIssues = normalizeIndexIssues(body.indexIssues);

    if (!provider || !propertyUri || propertyUri.length > 2048 || !isIsoDate(body.startDate) || !isIsoDate(body.endDate)) {
      return reply.code(400).send({ error: "Provider, property URI, start date, and end date are required." });
    }
    if (body.startDate > body.endDate) {
      return reply.code(400).send({ error: "Start date must not be after end date." });
    }
    if (!metrics || !indexIssues) {
      return reply.code(400).send({ error: "Metrics or index issues have an invalid shape or exceed the import limit." });
    }

    const snapshot = createSeoSearchSnapshot({
      provider,
      propertyUri,
      startDate: body.startDate,
      endDate: body.endDate,
      importedBy: request.adminId ?? "admin-api",
      metrics,
      indexIssues,
      sourceMetadata: body.sourceMetadata && typeof body.sourceMetadata === "object" && !Array.isArray(body.sourceMetadata)
        ? body.sourceMetadata as Record<string, unknown>
        : null,
    });
    return reply.code(201).send({ snapshot, dashboard: getSeoSearchDashboard(snapshot?.id) });
  });
}
