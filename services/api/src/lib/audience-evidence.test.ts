import assert from "node:assert/strict";
import test from "node:test";
import {
  audienceEvidenceReportCsv,
  buildAudienceEvidenceReport,
  normalizeAudienceEvidenceImport,
} from "./audience-evidence.js";

function validImport() {
  return {
    cloudflare: {
      zoneRef: "zone-export-reference",
      exportedAt: "2026-08-25T10:00:00Z",
      periodUniqueIpCount: 18,
      rows: [
        { date: "2026-08-24", classification: "likely_human", botScoreBucket: "30-99", asn: 13335, country: "us", requests: 80, uniqueIpCount: 12 },
        { date: "2026-08-24", classification: "verified_bot", botScoreBucket: "verified", asn: 15169, country: "US", requests: 20, uniqueIpCount: 3 },
      ],
    },
    ga4: {
      propertyRef: "GA4-property-reference",
      startDate: "2026-08-24",
      endDate: "2026-08-24",
      exportedAt: "2026-08-25T10:05:00Z",
      activeUsers: 9,
      engagedSessions: 7,
      eventCount: 51,
      keyEvents: 3,
      internalTrafficExcluded: true,
      consentMode: "consent_required",
      topEvents: [{ eventName: "free_omr_preview_viewed", eventCount: 3, activeUsers: 2 }],
    },
    operatorNotes: "Cloudflare and GA4 exports cover the same UTC period.",
  };
}

test("audience evidence accepts aggregate bot, ASN, IP-count, and GA4 data without raw IP storage", () => {
  const evidence = normalizeAudienceEvidenceImport(validImport());
  assert.ok(evidence);
  assert.equal(evidence.cloudflare.rawIpStored, false);
  assert.equal(evidence.cloudflare.rows[0].country, "US");
  assert.equal(evidence.ga4.internalTrafficExcluded, true);

  const withRawIp = validImport();
  (withRawIp.cloudflare.rows[0] as Record<string, unknown>).clientIp = "192.0.2.1";
  assert.equal(normalizeAudienceEvidenceImport(withRawIp), null, "raw visitor addresses must be rejected rather than persisted");

  const withCoercedMetric = validImport();
  (withCoercedMetric.ga4 as Record<string, unknown>).activeUsers = false;
  assert.equal(normalizeAudienceEvidenceImport(withCoercedMetric), null, "booleans and other coercible values must not become numeric evidence");

  const withImpossibleDate = validImport();
  (withImpossibleDate.ga4 as Record<string, unknown>).endDate = "2026-02-31";
  assert.equal(normalizeAudienceEvidenceImport(withImpossibleDate), null, "calendar-invalid reporting dates must be rejected");

  const withIpInNotes = validImport();
  withIpInNotes.operatorNotes = "Exclude test traffic from 203.0.113.8.";
  assert.equal(normalizeAudienceEvidenceImport(withIpInNotes), null, "raw IP literals hidden in free text must be rejected");

  const withEmailInNotes = validImport();
  withEmailInNotes.operatorNotes = "Exclude employee@example.test from the report.";
  assert.equal(normalizeAudienceEvidenceImport(withEmailInNotes), null, "direct identifiers hidden in free text must be rejected");

  const withQueryString = validImport();
  withQueryString.cloudflare.rows[0].path = "/score-editor?visitor=opaque-id";
  assert.equal(normalizeAudienceEvidenceImport(withQueryString), null, "evidence paths must not retain query-string identifiers");
});

test("cross-source report exposes strong product-use signals without claiming a person-level proof", () => {
  const evidence = normalizeAudienceEvidenceImport(validImport());
  assert.ok(evidence);
  const report = buildAudienceEvidenceReport({
    snapshot: { id: "snapshot-1", startDate: "2026-08-24", endDate: "2026-08-24" },
    evidence,
    backend: {
      calculatedAt: "2026-08-25T10:06:00.000Z",
      registrations: 3,
      completedLegacyJobs: 1,
      completedScoreJobs: 2,
      completedJobUsers: 2,
    },
  });

  assert.equal(report.cloudflare.total, 100);
  assert.equal(report.cloudflare.automatedRequestShare, 0.2);
  assert.equal(report.assessment.signalLevel, "strong_cross_source_product_use_signal");
  assert.equal(report.methodology.canProveEveryActiveUserIsHuman, false);
  assert.match(audienceEvidenceReportCsv(report), /"backend","completed_job_users","2"/u);
});
