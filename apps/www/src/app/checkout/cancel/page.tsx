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

export default async function CheckoutCancelPage() {
  const locale = await readSiteLocale();
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
