import path from "node:path";
import { runtimeDatabasePrimary } from "@score/runtime-database";

const rootDir = process.cwd();

function parseTrustProxy(value: string | undefined) {
  const normalized = value?.trim();
  if (!normalized || normalized === "false") return false;
  if (normalized === "true") return true;
  return normalized.split(",").map((entry) => entry.trim()).filter(Boolean);
}

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value ?? fallback);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function storageBackend(value: string | undefined) {
  return value?.trim().toLowerCase() === "s3" ? "s3" as const : "local" as const;
}

function storageEncryption(value: string | undefined): "AES256" | "aws:kms" | undefined {
  const normalized = value?.trim();
  return normalized === "AES256" || normalized === "aws:kms" ? normalized : undefined;
}

function deriveFfprobeCommand(ffmpegCommand: string) {
  if (!ffmpegCommand) return "";
  const parsed = path.parse(ffmpegCommand);
  if (!/^ffmpeg(?:\.exe)?$/iu.test(parsed.base)) return "";
  return path.join(parsed.dir, process.platform === "win32" ? "ffprobe.exe" : "ffprobe");
}

const ffmpegCommand = process.env.FFMPEG_COMMAND ?? "";

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  host: process.env.HOST ?? "0.0.0.0",
  port: Number(process.env.PORT ?? 4000),
  dbFile: process.env.DB_FILE ?? path.join(rootDir, "data", "app.sqlite"),
  postgresUrl: process.env.POSTGRES_URL ?? "",
  postgresSchema: process.env.POSTGRES_SCHEMA?.trim() || "public",
  runtimeDatabasePrimary: runtimeDatabasePrimary(process.env.RUNTIME_DATABASE_PRIMARY, process.env.NODE_ENV),
  storageDir: process.env.STORAGE_DIR ?? path.join(rootDir, "storage"),
  storageBackend: storageBackend(process.env.STORAGE_BACKEND),
  s3Bucket: process.env.S3_BUCKET ?? "",
  s3Region: process.env.S3_REGION ?? "",
  s3Endpoint: process.env.S3_ENDPOINT ?? "",
  s3ForcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  s3KeyPrefix: process.env.S3_KEY_PREFIX ?? "",
  s3MaxAttempts: positiveInteger(process.env.S3_MAX_ATTEMPTS, 3),
  s3ServerSideEncryption: storageEncryption(process.env.S3_SERVER_SIDE_ENCRYPTION),
  s3KmsKeyId: process.env.S3_KMS_KEY_ID ?? "",
  objectStorageGatewayUrl: process.env.OBJECT_STORAGE_GATEWAY_URL ?? "",
  objectStorageGatewayToken: process.env.OBJECT_STORAGE_GATEWAY_TOKEN ?? "",
  publicSiteUrl: process.env.PUBLIC_SITE_URL ?? "http://localhost:3000",
  publicAppUrl: process.env.PUBLIC_APP_URL ?? "http://localhost:3001",
  publicApiUrl: process.env.PUBLIC_API_URL ?? "http://localhost:4000",
  resetPasswordUrlBase: process.env.RESET_PASSWORD_URL_BASE ?? `${process.env.PUBLIC_APP_URL ?? "http://localhost:3001"}/reset-password`,
  sessionDays: Number(process.env.SESSION_DAYS ?? 30),
  entitlementDays: Number(process.env.DEFAULT_ENTITLEMENT_DAYS ?? 365),
  passwordResetTokenHours: Number(process.env.PASSWORD_RESET_TOKEN_HOURS ?? 2),
  workerHeartbeatStaleMs: Number(process.env.WORKER_HEARTBEAT_STALE_MS ?? 120000),
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  rateLimitEnabled: process.env.RATE_LIMIT_ENABLED !== "false",
  rateLimitMax: positiveInteger(process.env.RATE_LIMIT_MAX, 300),
  rateLimitTimeWindowMs: positiveInteger(process.env.RATE_LIMIT_TIME_WINDOW_MS, 60000),
  redisUrl: process.env.RATE_LIMIT_REDIS_URL ?? process.env.REDIS_URL ?? "",
  redisConnectTimeoutMs: positiveInteger(process.env.REDIS_CONNECT_TIMEOUT_MS, 2000),
  redisKeyPrefix: (process.env.REDIS_RATE_LIMIT_PREFIX ?? "score-rate-limit:").replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 80) || "score-rate-limit:",
  jobBrokerBackend: process.env.JOB_BROKER_BACKEND?.trim().toLowerCase() === "bullmq" ? "bullmq" as const : "database" as const,
  jobBrokerRedisUrl: process.env.JOB_BROKER_REDIS_URL ?? process.env.REDIS_URL ?? "",
  jobBrokerPrefix: (process.env.JOB_BROKER_PREFIX ?? "score-jobs").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || "score-jobs",
  jobDispatchIntervalMs: positiveInteger(process.env.JOB_DISPATCH_INTERVAL_MS, 1_000),
  jobDispatchRetryBaseMs: positiveInteger(process.env.JOB_DISPATCH_RETRY_BASE_MS, 1_000),
  jobDispatchStaleMs: positiveInteger(process.env.JOB_DISPATCH_STALE_MS, 300_000),
  apiReplicaCount: positiveInteger(process.env.API_REPLICA_COUNT, 1),
  metricsBearerToken: process.env.METRICS_BEARER_TOKEN ?? "",
  securityAuditHashSalt: process.env.SECURITY_AUDIT_HASH_SALT ?? "",
  securityAuditRetentionDays: positiveInteger(process.env.SECURITY_AUDIT_RETENTION_DAYS, 180),
  accountDeletionGraceDays: positiveInteger(process.env.ACCOUNT_DELETION_GRACE_DAYS, 14),
  orphanFileRetentionDays: positiveInteger(process.env.ORPHAN_FILE_RETENTION_DAYS, 30),
  quarantineRetentionHours: positiveInteger(process.env.QUARANTINE_RETENTION_HOURS, 24),
  lifecycleCleanupIntervalMs: positiveInteger(process.env.LIFECYCLE_CLEANUP_INTERVAL_MS, 24 * 60 * 60 * 1000),
  lifecycleCleanupEnabled: process.env.NODE_ENV === "production" || process.env.LIFECYCLE_CLEANUP_ENABLED === "true",
  uploadMaxBytes: positiveInteger(process.env.UPLOAD_MAX_BYTES, 100 * 1024 * 1024),
  clamAvCommand: process.env.CLAMAV_COMMAND ?? "",
  clamAvHost: process.env.CLAMAV_HOST ?? "",
  clamAvPort: positiveInteger(process.env.CLAMAV_PORT, 3310),
  clamAvTimeoutMs: positiveInteger(process.env.CLAMAV_TIMEOUT_MS, 120000),
  clamAvRequired: process.env.NODE_ENV === "production" || process.env.CLAMAV_REQUIRED === "true",
  museScoreCommand: process.env.MUSESCORE_COMMAND ?? "",
  museScoreTimeoutMs: Number(process.env.MUSESCORE_TIMEOUT_MS ?? 120000),
  audiverisCommand: process.env.AUDIVERIS_COMMAND ?? "",
  basicPitchCommand: process.env.BASIC_PITCH_COMMAND ?? "",
  music21Command: process.env.MUSIC21_COMMAND ?? "",
  music21TimeoutMs: Number(process.env.MUSIC21_TIMEOUT_MS ?? 120000),
  ytDlpCommand: process.env.YT_DLP_COMMAND ?? "",
  ytDlpTimeoutMs: Number(process.env.YT_DLP_TIMEOUT_MS ?? 300000),
  ffmpegCommand,
  ffprobeCommand: process.env.FFPROBE_COMMAND ?? deriveFfprobeCommand(ffmpegCommand),
  ffmpegTimeoutMs: Number(process.env.FFMPEG_TIMEOUT_MS ?? 180000),
  mediaSafetyRequired: process.env.NODE_ENV === "production" || process.env.MEDIA_SAFETY_REQUIRED === "true",
  audioUploadMaxDurationSeconds: positiveInteger(process.env.AUDIO_UPLOAD_MAX_DURATION_SECONDS, 900),
  performanceUploadMaxDurationSeconds: positiveInteger(process.env.PERFORMANCE_UPLOAD_MAX_DURATION_SECONDS, 1200),
  mediaUploadMaxVideoWidth: positiveInteger(process.env.MEDIA_UPLOAD_MAX_VIDEO_WIDTH, 3840),
  mediaUploadMaxVideoHeight: positiveInteger(process.env.MEDIA_UPLOAD_MAX_VIDEO_HEIGHT, 2160),
  fluidSynthCommand: process.env.FLUIDSYNTH_COMMAND ?? "",
  fluidSynthTimeoutMs: Number(process.env.FLUIDSYNTH_TIMEOUT_MS ?? 180000),
  defaultSoundFontPath: process.env.SOUNDFONT_PATH ?? "",
  supportEmail: process.env.SUPPORT_EMAIL ?? "support@scoretransposer.com",
  paymentNotificationEmail: process.env.PAYMENT_NOTIFICATION_EMAIL?.trim() || process.env.SUPPORT_EMAIL || "support@scoretransposer.com",
  copyrightResponseHours: positiveInteger(process.env.COPYRIGHT_RESPONSE_HOURS, 48),
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
  stripeSchoolPriceId: process.env.STRIPE_SCHOOL_PRICE_ID ?? "",
  stripeManagedPaymentsEnabled: process.env.STRIPE_MANAGED_PAYMENTS_ENABLED === "true",
  paddleApiKey: process.env.PADDLE_API_KEY ?? "",
  paddleWebhookSecret: process.env.PADDLE_WEBHOOK_SECRET ?? "",
  paddlePriceId: process.env.PADDLE_PRICE_ID ?? "",
  paddleSchoolPriceId: process.env.PADDLE_SCHOOL_PRICE_ID ?? "",
  paddleEnvironment: process.env.PADDLE_ENVIRONMENT ?? "sandbox",
  paddleDefaultPaymentLink: process.env.PADDLE_DEFAULT_PAYMENT_LINK ?? "",
  paymentBillingMode: process.env.PAYMENT_BILLING_MODE === "one_time" ? "payment" as const : "subscription" as const,
  freeTrialOmrJobs: positiveInteger(process.env.FREE_TRIAL_OMR_JOBS, 1),
  freeTrialMaxSourcePages: positiveInteger(process.env.FREE_TRIAL_MAX_SOURCE_PAGES, 1),
  quotaLegacyJobsPerMonth: positiveInteger(process.env.QUOTA_LEGACY_JOBS_PER_MONTH, 25),
  quotaProJobsPerMonth: positiveInteger(process.env.QUOTA_PRO_JOBS_PER_MONTH, 100),
  quotaEducationJobsPerMonth: positiveInteger(process.env.QUOTA_EDUCATION_JOBS_PER_MONTH, 500),
  quotaLegacyStorageBytes: positiveInteger(process.env.QUOTA_LEGACY_STORAGE_BYTES, 1024 * 1024 * 1024),
  quotaProStorageBytes: positiveInteger(process.env.QUOTA_PRO_STORAGE_BYTES, 10 * 1024 * 1024 * 1024),
  quotaEducationStorageBytes: positiveInteger(process.env.QUOTA_EDUCATION_STORAGE_BYTES, 50 * 1024 * 1024 * 1024),
  ltiEnabled: process.env.LTI_ENABLED === "true",
  ltiPrivateKeyBase64: process.env.LTI_PRIVATE_KEY_BASE64 ?? "",
  ltiKeyId: process.env.LTI_KEY_ID ?? "score-lti-1",
  seedActivationCodes: (process.env.SEED_ACTIVATION_CODES ?? "")
    .split(",")
    .map((code) => code.trim())
    .filter(Boolean),
};

export function validateRuntimeConfig() {
  if ((config.nodeEnv === "production" || config.nodeEnv === "staging") && config.runtimeDatabasePrimary !== "postgres") {
    throw new Error(`${config.nodeEnv} API requires RUNTIME_DATABASE_PRIMARY=postgres; SQLite fallback is disabled.`);
  }
  if (config.runtimeDatabasePrimary === "postgres" && !config.postgresUrl) {
    throw new Error("POSTGRES_URL is required when RUNTIME_DATABASE_PRIMARY=postgres.");
  }
  if (config.nodeEnv !== "production") return;
  const failures: string[] = [];
  if (config.securityAuditHashSalt.length < 32) failures.push("SECURITY_AUDIT_HASH_SALT must contain at least 32 characters");
  if (config.metricsBearerToken.length < 32) failures.push("METRICS_BEARER_TOKEN must contain at least 32 characters");
  if (!config.clamAvCommand && !config.clamAvHost) failures.push("CLAMAV_COMMAND or CLAMAV_HOST is required");
  if (!config.ffmpegCommand) failures.push("FFMPEG_COMMAND is required for safe media uploads");
  if (!config.ffprobeCommand) failures.push("FFPROBE_COMMAND is required for safe media uploads");
  if (config.apiReplicaCount > 1 && !config.redisUrl) failures.push("REDIS_URL is required when API_REPLICA_COUNT is greater than 1");
  if (config.jobBrokerBackend !== "bullmq") failures.push("JOB_BROKER_BACKEND=bullmq is required in production");
  if (!config.jobBrokerRedisUrl) failures.push("JOB_BROKER_REDIS_URL or REDIS_URL is required in production");
  if (config.storageBackend !== "s3") failures.push("STORAGE_BACKEND=s3 is required in production");
  if (!config.s3Bucket) failures.push("S3_BUCKET is required in production");
  if (!config.s3Region) failures.push("S3_REGION is required in production");
  if (config.paymentProviders.includes("stripe")) {
    if (!config.stripeSecretKey) failures.push("STRIPE_SECRET_KEY is required when Stripe is enabled");
    if (!config.stripeWebhookSecret) failures.push("STRIPE_WEBHOOK_SECRET is required when Stripe is enabled");
    if (!config.stripePriceId) failures.push("STRIPE_PRICE_ID is required when Stripe is enabled");
  }
  if (config.paymentProviders.includes("paddle")) {
    if (!config.paddleApiKey) failures.push("PADDLE_API_KEY is required when Paddle is enabled");
    if (!config.paddleWebhookSecret) failures.push("PADDLE_WEBHOOK_SECRET is required when Paddle is enabled");
    if (!config.paddlePriceId) failures.push("PADDLE_PRICE_ID is required when Paddle is enabled");
    if (!config.paddleDefaultPaymentLink) failures.push("PADDLE_DEFAULT_PAYMENT_LINK is required when Paddle is enabled");
  }
  if (config.ltiEnabled) {
    if (!config.publicApiUrl.startsWith("https://")) failures.push("PUBLIC_API_URL must use HTTPS when LTI is enabled");
    if (!config.ltiPrivateKeyBase64) failures.push("LTI_PRIVATE_KEY_BASE64 is required when LTI is enabled");
    if (!config.ltiKeyId) failures.push("LTI_KEY_ID is required when LTI is enabled");
  }
  if ((config.s3AccessKeyId && !config.s3SecretAccessKey) || (!config.s3AccessKeyId && config.s3SecretAccessKey)) {
    failures.push("S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY must be configured together");
  }
  if ((config.objectStorageGatewayUrl && !config.objectStorageGatewayToken) || (!config.objectStorageGatewayUrl && config.objectStorageGatewayToken)) {
    failures.push("OBJECT_STORAGE_GATEWAY_URL and OBJECT_STORAGE_GATEWAY_TOKEN must be configured together");
  }
  if (config.s3ServerSideEncryption === "aws:kms" && !config.s3KmsKeyId) failures.push("S3_KMS_KEY_ID is required when S3_SERVER_SIDE_ENCRYPTION=aws:kms");
  if (config.redisUrl) {
    try {
      const redisUrl = new URL(config.redisUrl);
      if (redisUrl.protocol !== "redis:" && redisUrl.protocol !== "rediss:") failures.push("REDIS_URL must use redis:// or rediss://");
    } catch {
      failures.push("REDIS_URL must be a valid URL");
    }
  }
  if (failures.length > 0) throw new Error(`Unsafe production configuration: ${failures.join("; ")}.`);
}
