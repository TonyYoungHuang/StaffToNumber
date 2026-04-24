import path from "node:path";

const rootDir = process.cwd();

export const config = {
  host: process.env.HOST ?? "0.0.0.0",
  port: Number(process.env.PORT ?? 4000),
  dbFile: process.env.DB_FILE ?? path.join(rootDir, "data", "app.sqlite"),
  storageDir: process.env.STORAGE_DIR ?? path.join(rootDir, "storage"),
  publicSiteUrl: process.env.PUBLIC_SITE_URL ?? "http://localhost:3000",
  publicAppUrl: process.env.PUBLIC_APP_URL ?? "http://localhost:3001",
  resetPasswordUrlBase: process.env.RESET_PASSWORD_URL_BASE ?? `${process.env.PUBLIC_APP_URL ?? "http://localhost:3001"}/reset-password`,
  sessionDays: Number(process.env.SESSION_DAYS ?? 30),
  entitlementDays: Number(process.env.DEFAULT_ENTITLEMENT_DAYS ?? 365),
  passwordResetTokenHours: Number(process.env.PASSWORD_RESET_TOKEN_HOURS ?? 2),
  workerHeartbeatStaleMs: Number(process.env.WORKER_HEARTBEAT_STALE_MS ?? 120000),
  supportEmail: process.env.SUPPORT_EMAIL ?? "support@scoretransposer.com",
  emailFromAddress: process.env.EMAIL_FROM_ADDRESS ?? "",
  emailReplyTo: process.env.EMAIL_REPLY_TO ?? process.env.SUPPORT_EMAIL ?? "",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  adminApiKey: process.env.ADMIN_API_KEY ?? "",
  paymentProviders: (process.env.PAYMENT_PROVIDERS ?? "stripe,paddle")
    .split(",")
    .map((provider) => provider.trim())
    .filter(Boolean),
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  stripePriceId: process.env.STRIPE_PRICE_ID ?? "",
  paddleApiKey: process.env.PADDLE_API_KEY ?? "",
  paddleWebhookSecret: process.env.PADDLE_WEBHOOK_SECRET ?? "",
  paddlePriceId: process.env.PADDLE_PRICE_ID ?? "",
  paddleEnvironment: process.env.PADDLE_ENVIRONMENT ?? "sandbox",
  paddleDefaultPaymentLink: process.env.PADDLE_DEFAULT_PAYMENT_LINK ?? "",
  seedActivationCodes: (process.env.SEED_ACTIVATION_CODES ?? "")
    .split(",")
    .map((code) => code.trim())
    .filter(Boolean),
};
