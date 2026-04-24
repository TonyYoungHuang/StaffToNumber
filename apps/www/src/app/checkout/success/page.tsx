import type { Metadata } from "next";
import { Panel } from "@score/ui";
import { CheckoutStatusClient } from "../../../components/CheckoutStatusClient";
import { readSiteLocale } from "../../../lib/locale";
import { getSupportUrl } from "../../../lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await readSiteLocale();
  const params = await searchParams;
  const provider = typeof params.provider === "string" && params.provider === "paddle" ? "paddle" : "stripe";
  const orderId = typeof params.order_id === "string" ? params.order_id : "";
  const token = typeof params.token === "string" ? params.token : "";
  const sessionId = typeof params.session_id === "string" ? params.session_id : undefined;

  return (
    <section className="public-container public-page stack-xl">
      {orderId && token ? (
        <CheckoutStatusClient orderId={orderId} token={token} provider={provider} sessionId={sessionId} />
      ) : (
        <div className="surface-panel stack-lg">
          <h1 className="page-title">{locale === "zh-CN" ? "缺少订单信息" : "Missing checkout details"}</h1>
          <p className="body-copy large">
            {locale === "zh-CN"
              ? "支付渠道已回跳，但缺少自动确认这笔购买所需的订单参数。请保留支付截图并联系支持。"
              : "The provider returned without the order reference required to confirm this purchase automatically. Keep your payment screenshot and contact support."}
          </p>
        </div>
      )}

      <Panel variant="glass" className="stack-md">
        <h2 className="card-title">{locale === "zh-CN" ? "如果没有看到激活码怎么办？" : "What if the activation code does not appear?"}</h2>
        <p className="body-copy">
          {locale === "zh-CN"
            ? "先不要立刻再次付款。请保留支付截图、订单邮箱和购买时间，然后联系支持人工核查。"
            : "Do not start a second payment immediately. Keep the payment screenshot, order email, and purchase time, then contact support for a manual check."}
        </p>
        <div className="button-row">
          <a href={getSupportUrl("payment", "checkout-success")} className="public-button tertiary">
            {locale === "zh-CN" ? "提交支付支持请求" : "Open payment support"}
          </a>
        </div>
      </Panel>
    </section>
  );
}
