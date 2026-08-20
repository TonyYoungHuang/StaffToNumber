import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { readSiteLocale } from "../../lib/locale";
import { getCheckoutUrl } from "../../lib/site";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function CheckoutPage() {
  const locale = await readSiteLocale();
  redirect(getCheckoutUrl(locale));
}
