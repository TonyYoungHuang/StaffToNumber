export const PRODUCT_NAME = "Online PDF Score Converter";

export const LOCALE_COOKIE_NAME = "score_locale";

export const SUPPORTED_LOCALES = ["en", "zh-CN"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const APP_ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  activate: "/activate",
  checkout: "/checkout",
  checkoutSuccess: "/checkout/success",
  checkoutCancel: "/checkout/cancel",
  dashboard: "/dashboard",
  upload: "/upload",
  jobs: "/jobs",
  adminCodes: "/admin/codes",
  adminSupport: "/admin/support",
} as const;

export type ConversionDirection = "staff_pdf_to_numbered" | "numbered_pdf_to_staff";

export type ActivationCodeStatus = "available" | "redeemed" | "disabled";

export type EntitlementStatus = "inactive" | "active" | "expired";

export type StoredFileKind = "input_pdf" | "output_pdf" | "draft_bundle";

export type JobStatus = "queued" | "processing" | "completed" | "failed";

export type JobResultKind = "none" | "final" | "draft";

export type PaymentProvider = "stripe" | "paddle";

export type PaymentOrderStatus = "pending" | "paid" | "cancelled" | "failed";

export function isSupportedLocale(value: string | null | undefined): value is SupportedLocale {
  return value === "en" || value === "zh-CN";
}
