import path from "node:path";

const cwd = process.cwd();

function storageEncryption(value: string | undefined): "AES256" | "aws:kms" | undefined {
  return value === "AES256" || value === "aws:kms" ? value : undefined;
}

export const workerConfig = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  dbFile: process.env.DB_FILE ?? path.join(cwd, "..", "api", "data", "app.sqlite"),
  storageDir: process.env.STORAGE_DIR ?? path.join(cwd, "..", "api", "storage"),
  storageBackend: process.env.STORAGE_BACKEND?.trim().toLowerCase() === "s3" ? "s3" as const : "local" as const,
  s3Bucket: process.env.S3_BUCKET ?? "",
  s3Region: process.env.S3_REGION ?? "",
  s3Endpoint: process.env.S3_ENDPOINT ?? "",
  s3ForcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  s3KeyPrefix: process.env.S3_KEY_PREFIX ?? "",
  s3MaxAttempts: Number(process.env.S3_MAX_ATTEMPTS ?? 3),
  s3ServerSideEncryption: storageEncryption(process.env.S3_SERVER_SIDE_ENCRYPTION),
  s3KmsKeyId: process.env.S3_KMS_KEY_ID ?? "",
  pollIntervalMs: Number(process.env.WORKER_POLL_INTERVAL_MS ?? 3000),
  processingDelayMs: Number(process.env.WORKER_PROCESSING_DELAY_MS ?? 1500),
  jobBrokerBackend: process.env.JOB_BROKER_BACKEND?.trim().toLowerCase() === "bullmq" ? "bullmq" as const : "database" as const,
  jobBrokerRedisUrl: process.env.JOB_BROKER_REDIS_URL ?? process.env.REDIS_URL ?? "",
  jobBrokerPrefix: (process.env.JOB_BROKER_PREFIX ?? "score-jobs").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || "score-jobs",
  jobBrokerConcurrency: Math.max(1, Math.min(32, Number(process.env.JOB_BROKER_CONCURRENCY ?? 1))),
  audiverisCommand: process.env.AUDIVERIS_COMMAND ?? "",
  audiverisTimeoutMs: Number(process.env.AUDIVERIS_TIMEOUT_MS ?? 180000),
  basicPitchCommand: process.env.BASIC_PITCH_COMMAND ?? "",
  basicPitchTimeoutMs: Number(process.env.BASIC_PITCH_TIMEOUT_MS ?? 300000),
  ytDlpCommand: process.env.YT_DLP_COMMAND ?? "",
  ytDlpTimeoutMs: Number(process.env.YT_DLP_TIMEOUT_MS ?? 300000),
  museScoreCommand: process.env.MUSESCORE_COMMAND ?? "",
  museScoreTimeoutMs: Number(process.env.MUSESCORE_TIMEOUT_MS ?? 180000),
  fluidSynthCommand: process.env.FLUIDSYNTH_COMMAND ?? "",
  fluidSynthTimeoutMs: Number(process.env.FLUIDSYNTH_TIMEOUT_MS ?? 300000),
  soundFontPath: process.env.SOUNDFONT_PATH ?? "",
  ffmpegCommand: process.env.FFMPEG_COMMAND ?? "",
  ffmpegTimeoutMs: Number(process.env.FFMPEG_TIMEOUT_MS ?? 300000),
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  emailFromAddress: process.env.EMAIL_FROM_ADDRESS ?? "",
  emailReplyTo: process.env.EMAIL_REPLY_TO ?? "",
  appPublicUrl: process.env.APP_PUBLIC_URL ?? process.env.PUBLIC_APP_URL ?? "",
  notificationMaxAttempts: Number(process.env.NOTIFICATION_MAX_ATTEMPTS ?? 8),
  notificationRetryBaseMs: Number(process.env.NOTIFICATION_RETRY_BASE_MS ?? 60000),
  notificationLockTimeoutMs: Number(process.env.NOTIFICATION_LOCK_TIMEOUT_MS ?? 900000),
};

if (workerConfig.nodeEnv === "production" && (workerConfig.jobBrokerBackend !== "bullmq" || !workerConfig.jobBrokerRedisUrl)) {
  throw new Error("Production worker requires JOB_BROKER_BACKEND=bullmq and JOB_BROKER_REDIS_URL or REDIS_URL.");
}
