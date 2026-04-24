"use client";

import { useEffect, useMemo, useState } from "react";
import Script from "next/script";
import { useSearchParams } from "next/navigation";
import { useSiteLocale } from "./SiteLocaleProvider";

declare global {
  interface Window {
    Paddle?: {
      Environment: {
        set: (environment: "sandbox" | "production") => void;
      };
      Initialize: (input: { token: string }) => void;
      Checkout: {
        open: (input: { transactionId: string }) => void;
      };
    };
  }
}

export function PaddlePaymentLinkPage({
  clientToken,
  environment,
}: {
  clientToken: string;
  environment: "sandbox" | "production";
}) {
  const { locale } = useSiteLocale();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const transactionId = searchParams.get("_ptxn");

  const copy = useMemo(
    () =>
      locale === "zh-CN"
        ? {
            title: "正在打开 Paddle 支付窗口",
            body: "如果支付窗口没有自动弹出，请刷新页面或重新从结算页发起支付。",
            missing: "当前没有检测到 Paddle 交易号。",
            config: "Paddle 客户端配置缺失。请先填写站点环境变量。",
          }
        : {
            title: "Opening the Paddle checkout",
            body: "If the checkout does not open automatically, refresh this page or restart from the checkout page.",
            missing: "No Paddle transaction id was found in the URL.",
            config: "Paddle client configuration is missing. Set the site environment variables first.",
          },
    [locale],
  );

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!clientToken) {
      setError(copy.config);
      return;
    }

    if (!transactionId) {
      setError(copy.missing);
      return;
    }

    if (!window.Paddle) {
      setError("Paddle.js is not available.");
      return;
    }

    try {
      if (environment === "sandbox") {
        window.Paddle.Environment.set("sandbox");
      }
      window.Paddle.Initialize({ token: clientToken });
      window.Paddle.Checkout.open({ transactionId });
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Unable to open Paddle checkout.");
    }
  }, [clientToken, copy.config, copy.missing, environment, ready, transactionId]);

  return (
    <div className="surface-panel stack-lg">
      <Script src="https://cdn.paddle.com/paddle/v2/paddle.js" strategy="afterInteractive" onLoad={() => setReady(true)} />
      <div className="stack-sm">
        <h1 className="page-title">{copy.title}</h1>
        <p className="body-copy large">{copy.body}</p>
      </div>
      {error ? <p className="form-status error">{error}</p> : null}
      {!error ? <p className="helper-copy">{transactionId ?? "-"}</p> : null}
    </div>
  );
}
