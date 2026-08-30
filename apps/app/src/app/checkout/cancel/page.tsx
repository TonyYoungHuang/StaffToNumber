import { redirect } from "next/navigation";
import { localizePathname } from "@score/i18n";
import { readAppLocale } from "../../../lib/locale";

export default async function CheckoutCancelPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const locale = await readAppLocale();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://scoretransposer.com";
  const destination = new URL(localizePathname("/checkout/cancel", locale), `${siteUrl.replace(/\/$/u, "")}/`);

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") destination.searchParams.set(key, value);
    else if (Array.isArray(value)) value.forEach((item) => destination.searchParams.append(key, item));
  }

  redirect(destination.toString());
}
