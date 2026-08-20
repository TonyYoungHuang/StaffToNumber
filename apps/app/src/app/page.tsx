import { redirect } from "next/navigation";
import { readAppLocale } from "../lib/locale";
import { PUBLIC_SITE_URL } from "../lib/support";

export default async function AppRootPage() {
  const locale = await readAppLocale();
  const destination = new URL("/api/locale", `${PUBLIC_SITE_URL.replace(/\/$/u, "")}/`);
  destination.searchParams.set("locale", locale);
  destination.searchParams.set("next", "/");

  redirect(destination.toString());
}
