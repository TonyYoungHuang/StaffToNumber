export const PRODUCT_NAME = "Online PDF Score Converter";

export const APP_ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  activate: "/activate",
  dashboard: "/dashboard",
  upload: "/upload",
  jobs: "/jobs",
} as const;

export type ConversionDirection = "staff_pdf_to_numbered" | "numbered_pdf_to_staff";

export type ActivationCodeStatus = "available" | "redeemed" | "disabled";

export type EntitlementStatus = "inactive" | "active" | "expired";

export type StoredFileKind = "input_pdf" | "output_pdf" | "draft_bundle";

export type JobStatus = "queued" | "processing" | "completed" | "failed";

export type JobResultKind = "none" | "final" | "draft";
