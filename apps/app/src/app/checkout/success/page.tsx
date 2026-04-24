import { AppCheckoutStatusClient } from "../../../components/AppCheckoutStatusClient";

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const provider = typeof params.provider === "string" && params.provider === "paddle" ? "paddle" : "stripe";
  const orderId = typeof params.order_id === "string" ? params.order_id : "";
  const token = typeof params.token === "string" ? params.token : "";
  const sessionId = typeof params.session_id === "string" ? params.session_id : undefined;

  return (
    <section className="container page-shell">
      {orderId && token ? (
        <AppCheckoutStatusClient orderId={orderId} token={token} provider={provider} sessionId={sessionId} />
      ) : (
        <div className="surface-panel stack-lg">
          <h1 className="page-title">Missing checkout details</h1>
          <p className="body-copy large">The payment provider returned without the order reference required to confirm the purchase.</p>
        </div>
      )}
    </section>
  );
}
