import { readFile } from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import { localizeFeaturePage } from "../../lib/feature-page-localization";
import { readSiteLocale } from "../../lib/locale";
import { findPlatformFeaturePage } from "../../lib/platform-feature-pages";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";


export async function generateImageMetadata({ params }: { params: { featureSlug: string } }) {
  const sourcePage = findPlatformFeaturePage(params.featureSlug);
  if (!sourcePage) return [];

  const locale = await readSiteLocale();
  const page = localizeFeaturePage(sourcePage, locale);
  return [{ id: "default", alt: `${page.title} | ScoreTransposer`, size, contentType }];
}

export default async function OpenGraphImage({
  params,
  id,
}: {
  params: Promise<{ featureSlug: string }>;
  id: Promise<string | number>;
}) {
  await id;
  const { featureSlug } = await params;
  const sourcePage = findPlatformFeaturePage(featureSlug);
  if (!sourcePage) {
    notFound();
  }
  const locale = await readSiteLocale();
  const page = localizeFeaturePage(sourcePage, locale);
  // Pre-rendered in a separate build process: Next 16.3.0's image optimizer
  // disables the SVG loader used by ImageResponse in the shared web process.
  const image = await readFile(path.join(process.cwd(), "public", "social", locale, `${page.slug}.png`));
  return new Response(image, { headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=0, must-revalidate" } });
}
