import { isIP } from "node:net";

export const audienceEvidenceSchema = "scoretransposer/audience-evidence-v1" as const;

export type CloudflareVisitorClassification = "likely_human" | "verified_bot" | "likely_automated" | "unknown";

export type CloudflareAudienceSegment = {
  date: string;
  classification: CloudflareVisitorClassification;
  botScoreBucket: string | null;
  asn: number | null;
  country: string | null;
  path: string | null;
  requests: number;
  uniqueIpCount: number | null;
};

export type Ga4AudienceEvidence = {
  propertyRef: string | null;
  startDate: string;
  endDate: string;
  exportedAt: string;
  activeUsers: number;
  engagedSessions: number;
  eventCount: number;
  keyEvents: number;
  internalTrafficExcluded: boolean | null;
  consentMode: "consent_required" | "not_reported";
  topEvents: Array<{ eventName: string; eventCount: number; activeUsers: number | null }>;
  sourceNotes: string | null;
};

export type NormalizedAudienceEvidenceImport = {
  schema: typeof audienceEvidenceSchema;
  cloudflare: {
    zoneRef: string | null;
    exportedAt: string;
    periodUniqueIpCount: number | null;
    rows: CloudflareAudienceSegment[];
    sourceNotes: string | null;
    rawIpStored: false;
  };
  ga4: Ga4AudienceEvidence;
  operatorNotes: string | null;
};

export type BackendAudienceEvidence = {
  calculatedAt: string;
  registrations: number;
  completedLegacyJobs: number;
  completedScoreJobs: number;
  completedJobUsers: number;
};

const visitorClassifications = new Set<CloudflareVisitorClassification>([
  "likely_human",
  "verified_bot",
  "likely_automated",
  "unknown",
]);

function optionalText(value: unknown, max: number) {
  if (typeof value !== "string") return null;
  return value.trim().slice(0, max) || null;
}

function nonNegativeInteger(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function optionalNonNegativeInteger(value: unknown) {
  if (value == null || value === "") return null;
  return nonNegativeInteger(value);
}

function isoTimestamp(value: unknown) {
  if (typeof value !== "string" || value.length > 80 || Number.isNaN(Date.parse(value))) return null;
  return new Date(value).toISOString();
}

function isoDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value ? null : value;
}

function containsRawIpField(value: Record<string, unknown>) {
  const forbidden = new Set(["ip", "clientip", "ipaddress", "clientipaddress"]);
  return Object.keys(value).some((key) => forbidden.has(key.toLowerCase().replace(/[_-]/gu, "")));
}

function containsSensitiveLiteral(value: unknown): boolean {
  if (typeof value === "string") {
    if (/[\w.!#$%&'*+/=?^`{|}~-]+@[\w-]+(?:\.[\w-]+)+/iu.test(value)) return true;
    const candidates = [
      ...(value.match(/(?<!\d)(?:\d{1,3}\.){3}\d{1,3}(?!\d)/gu) ?? []),
      ...(value.match(/\[?[0-9a-f:.]*:[0-9a-f:.]+\]?/giu) ?? []),
    ];
    return candidates.some((candidate) => {
      const normalized = candidate.trim().replace(/^\[|\]$/gu, "");
      return isIP(normalized) !== 0;
    });
  }
  if (Array.isArray(value)) return value.some(containsSensitiveLiteral);
  if (value && typeof value === "object") return Object.values(value as Record<string, unknown>).some(containsSensitiveLiteral);
  return false;
}

function normalizeCloudflare(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const exportedAt = isoTimestamp(source.exportedAt);
  if (!exportedAt || !Array.isArray(source.rows) || source.rows.length === 0 || source.rows.length > 10_000) return null;

  const rows: CloudflareAudienceSegment[] = [];
  for (const raw of source.rows) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const item = raw as Record<string, unknown>;
    if (containsRawIpField(item)) return null;
    const date = isoDate(item.date);
    const classification = typeof item.classification === "string" && visitorClassifications.has(item.classification as CloudflareVisitorClassification)
      ? item.classification as CloudflareVisitorClassification
      : null;
    const requests = nonNegativeInteger(item.requests);
    const asn = optionalNonNegativeInteger(item.asn);
    const uniqueIpCount = optionalNonNegativeInteger(item.uniqueIpCount);
    const path = optionalText(item.path, 2048);
    const countrySource = typeof item.country === "string" ? item.country.trim().toUpperCase() || null : null;
    if (
      !date
      || !classification
      || requests == null
      || item.asn != null && item.asn !== "" && asn == null
      || asn != null && asn > 4_294_967_295
      || item.uniqueIpCount != null && item.uniqueIpCount !== "" && uniqueIpCount == null
      || countrySource && !/^[A-Z]{2}$/u.test(countrySource)
      || item.path != null && item.path !== "" && (!path || !path.startsWith("/") || path.startsWith("//") || /[?#]/u.test(path))
    ) return null;
    rows.push({
      date,
      classification,
      botScoreBucket: optionalText(item.botScoreBucket, 40),
      asn,
      country: countrySource,
      path,
      requests,
      uniqueIpCount,
    });
  }

  const periodUniqueIpCount = optionalNonNegativeInteger(source.periodUniqueIpCount);
  if (source.periodUniqueIpCount != null && source.periodUniqueIpCount !== "" && periodUniqueIpCount == null) return null;
  return {
    zoneRef: optionalText(source.zoneRef, 160),
    exportedAt,
    periodUniqueIpCount,
    rows,
    sourceNotes: optionalText(source.sourceNotes, 2000),
    rawIpStored: false as const,
  };
}

function normalizeGa4(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const startDate = isoDate(source.startDate);
  const endDate = isoDate(source.endDate);
  const exportedAt = isoTimestamp(source.exportedAt);
  const activeUsers = nonNegativeInteger(source.activeUsers);
  const engagedSessions = nonNegativeInteger(source.engagedSessions);
  const eventCount = nonNegativeInteger(source.eventCount);
  const keyEvents = nonNegativeInteger(source.keyEvents);
  if (!startDate || !endDate || startDate > endDate || !exportedAt || activeUsers == null || engagedSessions == null || eventCount == null || keyEvents == null) return null;
  if (!Array.isArray(source.topEvents) || source.topEvents.length > 100) return null;

  const topEvents: Ga4AudienceEvidence["topEvents"] = [];
  for (const raw of source.topEvents) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const item = raw as Record<string, unknown>;
    const eventName = optionalText(item.eventName, 120);
    const itemEventCount = nonNegativeInteger(item.eventCount);
    const itemActiveUsers = optionalNonNegativeInteger(item.activeUsers);
    if (!eventName || itemEventCount == null || item.activeUsers != null && item.activeUsers !== "" && itemActiveUsers == null) return null;
    topEvents.push({ eventName, eventCount: itemEventCount, activeUsers: itemActiveUsers });
  }

  const internalTrafficExcluded = source.internalTrafficExcluded === true
    ? true
    : source.internalTrafficExcluded === false
      ? false
      : null;
  if (source.consentMode != null && source.consentMode !== "consent_required" && source.consentMode !== "not_reported") return null;
  return {
    propertyRef: optionalText(source.propertyRef, 160),
    startDate,
    endDate,
    exportedAt,
    activeUsers,
    engagedSessions,
    eventCount,
    keyEvents,
    internalTrafficExcluded,
    consentMode: source.consentMode === "consent_required" ? "consent_required" as const : "not_reported" as const,
    topEvents,
    sourceNotes: optionalText(source.sourceNotes, 2000),
  };
}

export function normalizeAudienceEvidenceImport(value: unknown): NormalizedAudienceEvidenceImport | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (containsSensitiveLiteral(value)) return null;
  const source = value as Record<string, unknown>;
  const cloudflare = normalizeCloudflare(source.cloudflare);
  const ga4 = normalizeGa4(source.ga4);
  if (!cloudflare || !ga4) return null;
  return {
    schema: audienceEvidenceSchema,
    cloudflare,
    ga4,
    operatorNotes: optionalText(source.operatorNotes, 4000),
  };
}

export function buildAudienceEvidenceReport(input: {
  snapshot: Record<string, unknown>;
  evidence: NormalizedAudienceEvidenceImport;
  backend: BackendAudienceEvidence;
}) {
  const edgeRequests = {
    total: 0,
    likelyHuman: 0,
    verifiedBot: 0,
    likelyAutomated: 0,
    unknown: 0,
  };
  for (const row of input.evidence.cloudflare.rows) {
    edgeRequests.total += row.requests;
    if (row.classification === "likely_human") edgeRequests.likelyHuman += row.requests;
    else if (row.classification === "verified_bot") edgeRequests.verifiedBot += row.requests;
    else if (row.classification === "likely_automated") edgeRequests.likelyAutomated += row.requests;
    else edgeRequests.unknown += row.requests;
  }
  const automatedRequests = edgeRequests.verifiedBot + edgeRequests.likelyAutomated;
  const automatedRequestShare = edgeRequests.total > 0 ? automatedRequests / edgeRequests.total : null;
  const allThreeSourcesHaveSignal = edgeRequests.likelyHuman > 0
    && input.evidence.ga4.engagedSessions > 0
    && input.backend.completedJobUsers > 0;
  const signalLevel = allThreeSourcesHaveSignal
    ? "strong_cross_source_product_use_signal"
    : input.backend.completedJobUsers > 0
      ? "backend_product_use_signal"
      : input.evidence.ga4.engagedSessions > 0 && edgeRequests.likelyHuman > 0
        ? "engaged_traffic_signal"
        : edgeRequests.total > 0
          ? "traffic_only"
          : "no_observed_signal";

  return {
    snapshot: input.snapshot,
    methodology: {
      correlationLevel: "aggregate_period",
      rawIpStored: false,
      canIdentifyIndividualVisitors: false,
      canProveEveryActiveUserIsHuman: false,
    },
    cloudflare: {
      ...edgeRequests,
      automatedRequestShare,
      periodUniqueIpCount: input.evidence.cloudflare.periodUniqueIpCount,
      segments: input.evidence.cloudflare.rows,
      exportedAt: input.evidence.cloudflare.exportedAt,
      sourceNotes: input.evidence.cloudflare.sourceNotes,
    },
    ga4: input.evidence.ga4,
    backend: input.backend,
    assessment: {
      signalLevel,
      strongProductActionUsers: input.backend.completedJobUsers,
      caveats: [
        "Cloudflare, GA4, and backend data are correlated only for the same reporting period; they are not joined to one visitor identity.",
        "GA4 active users include only measured, consented traffic and must not be treated as a census of people.",
        "Completed jobs are strong product-use evidence, but internal, test, shared, or automated accounts must be excluded operationally before calling them real customers.",
        "Unique IP counts are aggregate network observations; shared networks and changing addresses prevent an IP-to-person conversion.",
      ],
    },
    operatorNotes: input.evidence.operatorNotes,
  };
}

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function audienceEvidenceReportCsv(report: ReturnType<typeof buildAudienceEvidenceReport>) {
  const rows: Array<[string, string, unknown]> = [
    ["snapshot", "id", report.snapshot.id],
    ["snapshot", "property_uri", report.snapshot.propertyUri],
    ["snapshot", "start_date", report.snapshot.startDate],
    ["snapshot", "end_date", report.snapshot.endDate],
    ["snapshot", "imported_at", report.snapshot.importedAt],
    ["methodology", "correlation_level", report.methodology.correlationLevel],
    ["methodology", "raw_ip_stored", report.methodology.rawIpStored],
    ["methodology", "can_prove_every_active_user_is_human", report.methodology.canProveEveryActiveUserIsHuman],
    ["cloudflare", "requests_total", report.cloudflare.total],
    ["cloudflare", "requests_likely_human", report.cloudflare.likelyHuman],
    ["cloudflare", "requests_verified_bot", report.cloudflare.verifiedBot],
    ["cloudflare", "requests_likely_automated", report.cloudflare.likelyAutomated],
    ["cloudflare", "requests_unknown", report.cloudflare.unknown],
    ["cloudflare", "automated_request_share", report.cloudflare.automatedRequestShare],
    ["cloudflare", "period_unique_ip_count", report.cloudflare.periodUniqueIpCount],
    ["ga4", "period_start", report.ga4.startDate],
    ["ga4", "period_end", report.ga4.endDate],
    ["ga4", "active_users", report.ga4.activeUsers],
    ["ga4", "engaged_sessions", report.ga4.engagedSessions],
    ["ga4", "event_count", report.ga4.eventCount],
    ["ga4", "key_events", report.ga4.keyEvents],
    ["ga4", "internal_traffic_excluded", report.ga4.internalTrafficExcluded],
    ["ga4", "consent_mode", report.ga4.consentMode],
    ["backend", "registrations", report.backend.registrations],
    ["backend", "completed_legacy_jobs", report.backend.completedLegacyJobs],
    ["backend", "completed_score_jobs", report.backend.completedScoreJobs],
    ["backend", "completed_job_users", report.backend.completedJobUsers],
    ["assessment", "signal_level", report.assessment.signalLevel],
    ["assessment", "strong_product_action_users", report.assessment.strongProductActionUsers],
    ...report.assessment.caveats.map((caveat, index) => ["assessment", `caveat_${index + 1}`, caveat] as [string, string, unknown]),
    ["assessment", "operator_notes", report.operatorNotes],
  ];
  return ["source,metric,value", ...rows.map((row) => row.map(csvCell).join(","))].join("\n") + "\n";
}
