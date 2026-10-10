// Shop fulfillment is separate from recurring/term-based website checkout.
export const SHOP_CREDIT_PACKS = {
  "credits-50": { credits: 50, storageTier: "starter" },
  "credits-200": { credits: 200, storageTier: "converter-pro" },
} as const;
export type ShopCreditPackCode = keyof typeof SHOP_CREDIT_PACKS;
export function isShopCreditPackCode(value: unknown): value is ShopCreditPackCode {
  return value === "credits-50" || value === "credits-200";
}
export type ShopActivationPlanCode = import("./index.ts").CheckoutPlanCode | "single-score" | ShopCreditPackCode;
export function isShopActivationPlanCode(value: unknown): value is ShopActivationPlanCode {
  return typeof value === "string" && (isShopCreditPackCode(value) || value === "single-score" || ["starter-monthly", "starter-annual", "converter-pro-monthly", "converter-pro-annual"].includes(value));
}
