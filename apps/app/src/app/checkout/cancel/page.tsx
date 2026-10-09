import { AppCheckoutCancelClient } from "../../../components/AppCheckoutCancelClient";
import { getBillingMessages } from "../../../lib/billing-messages";
import { readAppLocale } from "../../../lib/locale";
export default async function CheckoutCancelPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
 const params = await searchParams; const copy = getBillingMessages(await readAppLocale()).checkout.status;
 return <section className="container page-shell"><AppCheckoutCancelClient orderId={typeof params.order_id === "string" ? params.order_id : ""} title={copy.cancelledTitle} body={copy.cancelledBody} /></section>;
}
