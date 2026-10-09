import { AppCheckoutStatusClient } from "../../../components/AppCheckoutStatusClient";
import { getBillingMessages } from "../../../lib/billing-messages";
import { readAppLocale } from "../../../lib/locale";
export const dynamic = "force-dynamic";
export default async function CheckoutSuccessPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const locale = await readAppLocale();
  const copy = getBillingMessages(locale).checkout.status;
  const orderId = typeof params.order_id === "string" ? params.order_id : "";
  const token = typeof params.token === "string" ? params.token : "";
  return <section className="container page-shell">{orderId && token ? <AppCheckoutStatusClient orderId={orderId} token={token} provider={params.provider === "paddle" ? "paddle" : "stripe"} sessionId={typeof params.session_id === "string" ? params.session_id : undefined} locale={locale} copy={copy} /> : <p role="alert">{copy.fallbackError}</p>}</section>;
}
