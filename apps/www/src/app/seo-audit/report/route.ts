import { auditFeatureSeo, buildFeatureSeoManifest } from "../../../lib/feature-seo";
import { platformFeaturePages } from "../../../lib/platform-feature-pages";
import { canAccessInternalTools, getBearerToken } from "../../../lib/internal-access";

export function GET(request: Request) {
  if (!canAccessInternalTools(getBearerToken(request))) {
    return Response.json({ error: "Not found." }, { status: 404, headers: { "X-Robots-Tag": "noindex, nofollow" } });
  }
  const report = auditFeatureSeo(platformFeaturePages);
  return Response.json({ ...report, manifest: buildFeatureSeoManifest(platformFeaturePages, undefined, report.generatedAt) }, {
    headers: {
      "Content-Disposition": "attachment; filename=\"scoretransposer-seo-audit.json\"",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
