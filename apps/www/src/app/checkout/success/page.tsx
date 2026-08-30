import type { Metadata } from "next";
import { Panel } from "@score/ui";
import { CheckoutStatusClient } from "../../../components/CheckoutStatusClient";
import { getCheckoutMessages } from "../../../lib/checkout-localization";
import { readSiteLocale } from "../../../lib/locale";
import { localizePublicHref } from "../../../lib/locale-routing";
import { getSupportUrl } from "../../../lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const copy = getCheckoutMessages(await readSiteLocale()).successPage;
  return {
    title: copy.metadataTitle,
    description: copy.metadataDescription,
    robots: { index: false, follow: false },
  };
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await readSiteLocale();
  const messages = getCheckoutMessages(locale);
  const copy = messages.successPage;
  const params = await searchParams;
  const provider = typeof params.provider === "string" && params.provider === "paddle" ? "paddle" : "stripe";
  const orderId = typeof params.order_id === "string" ? params.order_id : "";
  const token = typeof params.token === "string" ? params.token : "";
  const sessionId = typeof params.session_id === "string" ? params.session_id : undefined;

  return (
    <section className="public-container public-page stack-xl">
      {orderId && token ? (
        <CheckoutStatusClient
          orderId={orderId}
          token={token}
          provider={provider}
          sessionId={sessionId}
          copy={messages.status}
          translationNotice={messages.translationNotice}
        />
      ) : (
        <div className="surface-panel stack-lg">
          <h1 className="page-title">{copy.missingTitle}</h1>
          <p className="body-copy large">{copy.missingBody}</p>
          {messages.translationNotice ? <p className="helper-copy" role="note">{messages.translationNotice}</p> : null}
        </div>
      )}

      <Panel variant="glass" className="stack-md">
        <h2 className="card-title">{copy.supportTitle}</h2>
        <p className="body-copy">{copy.supportBody}</p>
        <div className="button-row">
          <a href={localizePublicHref(getSupportUrl("payment", "checkout-success"), locale)} className="public-button tertiary">
            {copy.supportAction}
          </a>
        </div>
      </Panel>
    </section>
  );
}
