import { buildFeatureExampleFile } from "../../../../lib/feature-example-files";
import { getFeatureSeoRecord } from "../../../../lib/feature-seo";
import { findPlatformFeaturePage } from "../../../../lib/platform-feature-pages";

type ExampleRouteParams = {
  featureSlug: string;
  side: string;
};

export async function GET(request: Request, { params }: { params: Promise<ExampleRouteParams> }) {
  const { featureSlug, side } = await params;
  const page = findPlatformFeaturePage(featureSlug);
  const seo = getFeatureSeoRecord(featureSlug);

  if (!page || !seo || (side !== "input" && side !== "output")) {
    return Response.json({ error: "Example not found." }, { status: 404 });
  }

  const requestedSemitones = Number(new URL(request.url).searchParams.get("semitones") ?? "0");
  const semitones = featureSlug === "score-to-audio" && side === "output" && requestedSemitones === 2 ? 2 : 0;
  const file = buildFeatureExampleFile(featureSlug, side, { semitones });
  if (!file) return Response.json({ error: "Example file is not configured." }, { status: 404 });

  return new Response(file.bytes, {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `${file.contentType === "audio/wav" ? "inline" : "attachment"}; filename="${featureSlug}-${side}-example.${file.extension}"`,
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "X-Robots-Tag": "noindex",
      "X-Example-Feature": page.slug,
      "X-Example-Model": "MusicXML-ScoreJSON",
    },
  });
}
