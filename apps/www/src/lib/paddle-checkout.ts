import { stripLocalePrefix } from "@score/i18n";

export function resolvePaddleSuccessUrl(input: {
  candidate: string | null;
  orderId: string | null;
  publicToken: string | null;
  allowedBaseUrls: string[];
}) {
  if (!input.candidate || !input.orderId || !input.publicToken) return null;

  try {
    const successUrl = new URL(input.candidate);
    const allowedOrigins = new Set(input.allowedBaseUrls.flatMap((value) => {
      try {
        return [new URL(value).origin];
      } catch {
        return [];
      }
    }));
    if (
      !allowedOrigins.has(successUrl.origin)
      || stripLocalePrefix(successUrl.pathname).pathname !== "/checkout/success"
    ) return null;
    if (successUrl.searchParams.get("provider") !== "paddle") return null;
    if (successUrl.searchParams.get("order_id") !== input.orderId) return null;
    if (successUrl.searchParams.get("token") !== input.publicToken) return null;
    return successUrl.toString();
  } catch {
    return null;
  }
}
