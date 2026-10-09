import { redirect } from "next/navigation";
import { siteConfig } from "../../../lib/site";
import type { Metadata } from "next";
import { Panel } from "@score/ui";
import { CheckoutCancelClient } from "../../../components/CheckoutCancelClient";
import { getCheckoutMessages } from "../../../lib/checkout-localization";
import { readSiteLocale } from "../../../lib/locale";
import { localizePublicHref } from "../../../lib/locale-routing";
import { getSupportUrl } from "../../../lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const copy = getCheckoutMessages(await readSiteLocale()).cancelPage;
  return {
    title: copy.metadataTitle,
    description: copy.metadataDescription,
    robots: { index: false, follow: false },
  };
}

export default async function CheckoutCancelPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const locale = await readSiteLocale();
  const params = await searchParams;
  if (typeof params.order_id === "string" && typeof params.token === "string") {
    const query = new URLSearchParams({ order_id: params.order_id, token: params.token, provider: params.provider === "paddle" ? "paddle" : "stripe" });
    const target = new URL("/api/locale", `${siteConfig.appUrl}/`);
    target.searchParams.set("locale", locale);
    target.searchParams.set("next", `/checkout/cancel?${query}`);
    redirect(target.toString());
  }
  const messages = getCheckoutMessages(locale);
  const copy = messages.cancelPage;

  return (
    <section className="public-container public-page stack-xl">
      <CheckoutCancelClient copy={messages.cancel} translationNotice={messages.translationNotice} />
      <Panel variant="glass" className="stack-md">
        <h2 className="card-title">{copy.supportTitle}</h2>
        <p className="body-copy">{copy.supportBody}</p>
        <div className="button-row">
          <a href={localizePublicHref(getSupportUrl("payment", "checkout-cancel"), locale)} className="public-button tertiary">
            {copy.supportAction}
          </a>
        </div>
      </Panel>
    </section>
  );
}
