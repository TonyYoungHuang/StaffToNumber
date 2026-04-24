import type { Metadata } from "next";
import { Panel } from "@score/ui";
import { CheckoutCancelClient } from "../../../components/CheckoutCancelClient";
import { readSiteLocale } from "../../../lib/locale";
import { getSupportUrl } from "../../../lib/site";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function CheckoutCancelPage() {
  const locale = await readSiteLocale();

  return (
    <section className="public-container public-page stack-xl">
      <CheckoutCancelClient />
      <Panel variant="glass" className="stack-md">
        <h2 className="card-title">{locale === "zh-CN" ? "如果你怀疑已经被扣款" : "If you believe you were charged"}</h2>
        <p className="body-copy">
          {locale === "zh-CN"
            ? "先不要立刻再次付款。请先核对支付渠道或银行记录，再把截图、邮箱和付款时间发给支持团队人工复核。"
            : "Avoid paying again immediately. Check the provider or bank record first, then send the screenshot, email, and payment time to support for manual review."}
        </p>
        <div className="button-row">
          <a href={getSupportUrl("payment", "checkout-cancel")} className="public-button tertiary">
            {locale === "zh-CN" ? "提交支付支持请求" : "Open payment support"}
          </a>
        </div>
      </Panel>
    </section>
  );
}
