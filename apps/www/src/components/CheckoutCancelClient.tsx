"use client";

import { useMemo } from "react";
import { MetricCard, Panel, StatusPill } from "@score/ui";
import { getAppActivateUrl, getSupportUrl } from "../lib/site";
import { useSiteLocale } from "./SiteLocaleProvider";

export function CheckoutCancelClient() {
  const { locale } = useSiteLocale();
  const activateUrl = getAppActivateUrl();
  const copy = useMemo(
    () =>
      locale === "zh-CN"
        ? {
            badge: "未完成支付",
            title: "付款已取消或尚未完成",
            body: "这笔订单还没有完成支付。你可以重新发起 checkout；如果你已经通过其他渠道购买过激活码，也可以直接到应用内兑换。",
            retry: "重新支付",
            activate: "兑换激活码",
            home: "返回首页",
            contact: "联系支持",
            stateLabel: "当前状态",
            stateValue: "未激活",
            stateBody: "这次 checkout 尝试不会生成新的激活码。",
            altLabel: "替代路径",
            altValue: "直接兑换",
            altBody: "如果你已经在其他渠道付款并拿到了激活码，可以跳过在线支付。",
            noteLabel: "如看到临时扣款",
            noteValue: "以渠道记录为准",
            noteBody: "部分支付方式会先显示授权或待处理状态，最终结果以支付渠道和银行记录为准。",
            nextTitle: "接下来可以怎么做",
            nextSteps: [
              "先确认是否是在支付渠道页面关闭过早，导致回跳没有完成。",
              "如果付款并未成功，这次 checkout 不会自动为账号开通权限。",
              "如果你怀疑自己已经被扣款，请保留截图并联系支持人工核查。",
            ],
          }
        : {
            badge: "Checkout not completed",
            title: "Payment was cancelled or left unfinished",
            body: "This order did not complete payment. You can start checkout again, or redeem an activation code in the app if you already purchased one through another channel.",
            retry: "Try payment again",
            activate: "Redeem activation code",
            home: "Back to homepage",
            contact: "Contact support",
            stateLabel: "Current state",
            stateValue: "Not activated",
            stateBody: "This checkout attempt did not issue a new activation code.",
            altLabel: "Alternative path",
            altValue: "Redeem code",
            altBody: "If you already paid elsewhere and received an activation code, you can skip online checkout.",
            noteLabel: "If you see a temporary charge",
            noteValue: "Follow the provider record",
            noteBody: "Some payment methods may show an authorization or pending state first. The final outcome depends on the payment provider and bank record.",
            nextTitle: "What you can do next",
            nextSteps: [
              "Check whether you simply closed the provider page before the redirect finished.",
              "If payment did not succeed, this checkout attempt does not auto-activate the account.",
              "If you believe you were charged, keep the screenshot and contact support for manual review.",
            ],
          },
    [locale],
  );

  return (
    <div className="surface-panel stack-xl">
      <div className="stack-sm">
        <StatusPill tone="amber">{copy.badge}</StatusPill>
        <h1 className="page-title">{copy.title}</h1>
        <p className="body-copy large">{copy.body}</p>
      </div>

      <div className="button-row">
        <a href="/checkout" className="public-button primary">
          {copy.retry}
        </a>
        <a href={activateUrl} className="public-button secondary">
          {copy.activate}
        </a>
        <a href="/" className="public-button tertiary">
          {copy.home}
        </a>
      </div>

      <div className="metric-grid">
        <MetricCard label={copy.stateLabel} value={copy.stateValue} body={copy.stateBody} />
        <MetricCard label={copy.altLabel} value={copy.altValue} body={copy.altBody} />
        <MetricCard label={copy.noteLabel} value={copy.noteValue} body={copy.noteBody} />
      </div>

      <Panel variant="sunken" className="stack-md">
        <h2 className="card-title">{copy.nextTitle}</h2>
        {copy.nextSteps.map((item) => (
          <p key={item} className="body-copy">
            {item}
          </p>
        ))}
        <div className="button-row">
          <a href={getSupportUrl("payment", "checkout-cancel")} className="public-button tertiary">
            {copy.contact}
          </a>
        </div>
      </Panel>
    </div>
  );
}
