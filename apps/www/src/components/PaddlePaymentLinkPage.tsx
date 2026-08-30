"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { useSearchParams } from "next/navigation";
import type { PaddleCheckoutCopy } from "../lib/checkout-localization";
import { resolvePaddleSuccessUrl } from "../lib/paddle-checkout";

declare global {
  interface Window {
    Paddle?: {
      Environment: { set: (environment: "sandbox" | "production") => void };
      Initialize: (input: { token: string }) => void;
      Checkout: { open: (input: { transactionId: string; settings?: { successUrl: string } }) => void };
    };
  }
}

export function PaddlePaymentLinkPage({
  clientToken,
  environment,
  siteUrl,
  appUrl,
  copy,
  translationNotice,
}: {
  clientToken: string;
  environment: "sandbox" | "production";
  siteUrl: string;
  appUrl: string;
  copy: PaddleCheckoutCopy;
  translationNotice: string;
}) {
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const transactionId = searchParams.get("_ptxn");
  const orderId = searchParams.get("order_id");
  const publicToken = searchParams.get("token");
  const requestedSuccessUrl = searchParams.get("success_url");
  const successUrl = resolvePaddleSuccessUrl({
    candidate: requestedSuccessUrl,
    orderId,
    publicToken,
    allowedBaseUrls: [siteUrl, appUrl],
  });

  useEffect(() => {
    if (!ready) return;
    if (!clientToken) {
      setError(copy.config);
      return;
    }
    if (!transactionId) {
      setError(copy.missing);
      return;
    }
    if (!successUrl) {
      setError(copy.returnUrl);
      return;
    }
    if (!window.Paddle) {
      setError(copy.unavailable);
      return;
    }

    try {
      if (environment === "sandbox") window.Paddle.Environment.set("sandbox");
      window.Paddle.Initialize({ token: clientToken });
      window.Paddle.Checkout.open({ transactionId, settings: { successUrl } });
    } catch (checkoutError) {
      // Preserve Paddle's own diagnostic verbatim; only the frontend-owned fallback is localized.
      setError(checkoutError instanceof Error ? checkoutError.message : copy.openFailed);
    }
  }, [clientToken, copy, environment, ready, successUrl, transactionId]);

  return (
    <div className="surface-panel stack-lg">
      <Script src="https://cdn.paddle.com/paddle/v2/paddle.js" strategy="afterInteractive" onLoad={() => setReady(true)} />
      <div className="stack-sm">
        <h1 className="page-title">{copy.title}</h1>
        <p className="body-copy large">{copy.body}</p>
        {translationNotice ? <p className="helper-copy" role="note">{translationNotice}</p> : null}
      </div>
      {error ? <p className="form-status error" role="alert">{error}</p> : null}
      {!error ? <p className="helper-copy">{transactionId ?? "-"}</p> : null}
    </div>
  );
}
