import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import net from "node:net";
import { pipeline } from "node:stream/promises";
import { config } from "../config.js";
import { ObjectStorageUnavailableError } from "./object-storage.js";

export type DetectedUploadKind =
  | "pdf"
  | "png"
  | "jpeg"
  | "webp"
  | "tiff"
  | "musicxml"
  | "zip"
  | "json"
  | "midi"
  | "wav"
  | "mp3"
  | "aac"
  | "flac"
  | "ogg"
  | "aiff"
  | "mp4-audio"
  | "mp4-video"
  | "quicktime"
  | "webm";

const MIME_BY_KIND: Record<DetectedUploadKind, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
  tiff: "image/tiff",
  musicxml: "application/vnd.recordare.musicxml+xml",
  zip: "application/vnd.recordare.musicxml",
  json: "application/json",
  midi: "audio/midi",
  wav: "audio/wav",
  mp3: "audio/mpeg",
  aac: "audio/aac",
  flac: "audio/flac",
  ogg: "audio/ogg",
  aiff: "audio/aiff",
  "mp4-audio": "audio/mp4",
  "mp4-video": "video/mp4",
  quicktime: "video/quicktime",
  webm: "video/webm",
};

export const uploadKinds = {
  pdf: ["pdf"],
  musicXml: ["musicxml", "zip"],
  scoreJson: ["json"],
  midi: ["midi"],
  omr: ["pdf", "png", "jpeg", "webp", "tiff"],
  audio: ["wav", "mp3", "aac", "flac", "ogg", "aiff", "mp4-audio"],
  performance: ["wav", "mp3", "aac", "flac", "ogg", "aiff", "mp4-audio", "mp4-video", "quicktime", "webm"],
  classroomResource: [
    "pdf", "png", "jpeg", "webp", "tiff", "musicxml", "zip", "json", "midi",
    "wav", "mp3", "aac", "flac", "ogg", "aiff", "mp4-audio", "mp4-video", "quicktime", "webm",
  ],
} satisfies Record<string, readonly DetectedUploadKind[]>;

const mediaUploadKinds = new Set<DetectedUploadKind>([
  "wav", "mp3", "aac", "flac", "ogg", "aiff", "mp4-audio", "mp4-video", "quicktime", "webm",
]);

export class UploadSecurityError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "EMPTY_FILE"
      | "UNSUPPORTED_FILE_TYPE"
      | "MALWARE_DETECTED"
      | "SCANNER_UNAVAILABLE"
      | "SCANNER_FAILED"
      | "MEDIA_TOOLS_UNAVAILABLE"
      | "MEDIA_PROBE_FAILED"
      | "MEDIA_STREAM_INVALID"
      | "MEDIA_TOO_LONG"
      | "MEDIA_TRANSCODE_FAILED"
      | "UNSAFE_STORAGE_PATH",
    public readonly statusCode: 400 | 413 | 422 | 503 = 400,
  ) {
    super(message);
    this.name = "UploadSecurityError";
  }
}

export type MediaSafetyMode = "audio" | "performance";

export type MediaInspection = {
  durationSeconds: number;
  formatName: string;
  audioStreams: number;
  videoStreams: number;
  width: number | null;
  height: number | null;
};

export type MediaSafetyPolicy = {
  mode: MediaSafetyMode;
  maxDurationSeconds: number;
  maxVideoWidth?: number;
  maxVideoHeight?: number;
};

type MediaProbePayload = {
  format?: { duration?: string | number; format_name?: string };
  streams?: Array<{
    index?: number;
    codec_type?: string;
    codec_name?: string;
    duration?: string | number;
    width?: number;
    height?: number;
  }>;
};

function finitePositive(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function parseMediaProbe(payload: string, policy: MediaSafetyPolicy): MediaInspection {
  let parsed: MediaProbePayload;
  try {
    parsed = JSON.parse(payload) as MediaProbePayload;
  } catch {
    throw new UploadSecurityError("The uploaded media could not be inspected.", "MEDIA_PROBE_FAILED", 422);
  }

  const streams = Array.isArray(parsed.streams) ? parsed.streams : [];
  if (streams.length === 0 || streams.length > 16) {
    throw new UploadSecurityError("The uploaded media has an invalid stream layout.", "MEDIA_STREAM_INVALID", 422);
  }

  const audioStreams = streams.filter((stream) => stream.codec_type === "audio");
  const videoStreams = streams.filter((stream) => stream.codec_type === "video");
  if (audioStreams.length === 0 || (policy.mode === "audio" && videoStreams.length > 0)) {
    throw new UploadSecurityError("The uploaded media does not contain a supported audio stream.", "MEDIA_STREAM_INVALID", 422);
  }

  const durations = [parsed.format?.duration, ...streams.map((stream) => stream.duration)]
    .map(finitePositive)
    .filter((value): value is number => value !== null);
  const durationSeconds = durations.length > 0 ? Math.max(...durations) : 0;
  if (durationSeconds <= 0) {
    throw new UploadSecurityError("The uploaded media duration could not be verified.", "MEDIA_PROBE_FAILED", 422);
  }
  if (durationSeconds > policy.maxDurationSeconds) {
    throw new UploadSecurityError(
      `The uploaded media is longer than the ${policy.maxDurationSeconds}-second limit.`,
      "MEDIA_TOO_LONG",
      413,
    );
  }

  const width = videoStreams.reduce<number | null>((largest, stream) => {
    const value = finitePositive(stream.width);
    return value === null ? largest : Math.max(largest ?? 0, value);
  }, null);
  const height = videoStreams.reduce<number | null>((largest, stream) => {
    const value = finitePositive(stream.height);
    return value === null ? largest : Math.max(largest ?? 0, value);
  }, null);
  if (
    (width !== null && width > (policy.maxVideoWidth ?? config.mediaUploadMaxVideoWidth))
    || (height !== null && height > (policy.maxVideoHeight ?? config.mediaUploadMaxVideoHeight))
  ) {
    throw new UploadSecurityError("The uploaded video resolution exceeds the supported safety limit.", "MEDIA_STREAM_INVALID", 422);
  }

  return {
    durationSeconds,
    formatName: parsed.format?.format_name?.slice(0, 120) ?? "unknown",
    audioStreams: audioStreams.length,
    videoStreams: videoStreams.length,
    width,
    height,
  };
}

function execFileCapture(command: string, args: string[], timeoutMs: number) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    execFile(command, args, { timeout: timeoutMs, windowsHide: true, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

export async function inspectMediaWithFfprobe(input: { filePath: string; policy: MediaSafetyPolicy; command?: string; timeoutMs?: number }) {
  const command = input.command ?? config.ffprobeCommand;
  if (!command) {
    throw new UploadSecurityError("Media inspection is temporarily unavailable.", "MEDIA_TOOLS_UNAVAILABLE", 503);
  }

  try {
    const result = await execFileCapture(command, [
      "-v", "error",
      "-show_entries", "format=duration,format_name:stream=index,codec_type,codec_name,duration,width,height",
      "-of", "json",
      input.filePath,
    ], input.timeoutMs ?? config.ffmpegTimeoutMs);
    return parseMediaProbe(result.stdout, input.policy);
  } catch (error) {
    if (error instanceof UploadSecurityError) throw error;
    throw new UploadSecurityError("The uploaded media could not be inspected.", "MEDIA_PROBE_FAILED", 422);
  }
}

export function buildSafeMediaTranscodeArgs(input: {
  sourcePath: string;
  targetPath: string;
  detectedKind: DetectedUploadKind;
  policy: MediaSafetyPolicy;
}) {
  const common = [
    "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
    "-i", input.sourcePath,
    "-map_metadata", "-1", "-map_chapters", "-1", "-sn", "-dn",
    "-t", String(input.policy.maxDurationSeconds),
  ];

  if (["mp4-video", "quicktime", "webm"].includes(input.detectedKind)) {
    const video = ["-map", "0:v:0", "-map", "0:a:0", "-vf", "scale=w='min(iw,1920)':h='min(ih,1080)':force_original_aspect_ratio=decrease:force_divisible_by=2"];
    if (input.detectedKind === "webm") {
      return [...common, ...video, "-c:v", "libvpx-vp9", "-crf", "32", "-b:v", "0", "-deadline", "good", "-cpu-used", "4", "-c:a", "libopus", "-b:a", "160k", "-f", "webm", input.targetPath];
    }
    return [...common, ...video, "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-f", input.detectedKind === "quicktime" ? "mov" : "mp4", input.targetPath];
  }

  const audio = ["-map", "0:a:0", "-vn", "-ac", "2", "-ar", "44100"];
  const outputByKind: Partial<Record<DetectedUploadKind, string[]>> = {
    wav: ["-c:a", "pcm_s16le", "-f", "wav"],
    mp3: ["-c:a", "libmp3lame", "-b:a", "192k", "-f", "mp3"],
    aac: ["-c:a", "aac", "-b:a", "192k", "-f", "adts"],
    flac: ["-c:a", "flac", "-compression_level", "5", "-f", "flac"],
    ogg: ["-c:a", "libopus", "-b:a", "160k", "-f", "ogg"],
    aiff: ["-c:a", "pcm_s16be", "-f", "aiff"],
    "mp4-audio": ["-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-f", "mp4"],
  };
  const output = outputByKind[input.detectedKind];
  if (!output) {
    throw new UploadSecurityError("The uploaded media format cannot be safely transcoded.", "MEDIA_STREAM_INVALID", 422);
  }
  return [...common, ...audio, ...output, input.targetPath];
}

export async function sanitizeMediaUpload(input: {
  sourcePath: string;
  targetPath: string;
  detectedKind: DetectedUploadKind;
  policy: MediaSafetyPolicy;
}) {
  if (!config.ffprobeCommand || !config.ffmpegCommand) {
    if (config.mediaSafetyRequired) {
      throw new UploadSecurityError("Safe media processing is temporarily unavailable.", "MEDIA_TOOLS_UNAVAILABLE", 503);
    }
    return { status: "skipped" as const, inspection: null };
  }

  const inspection = await inspectMediaWithFfprobe({ filePath: input.sourcePath, policy: input.policy });
  try {
    await execFileCapture(
      config.ffmpegCommand,
      buildSafeMediaTranscodeArgs(input),
      config.ffmpegTimeoutMs,
    );
    const stats = await fs.promises.stat(input.targetPath);
    if (stats.size === 0) throw new Error("ffmpeg produced an empty file");
  } catch (error) {
    if (error instanceof UploadSecurityError) throw error;
    throw new UploadSecurityError("The uploaded media could not be safely transcoded.", "MEDIA_TRANSCODE_FAILED", 422);
  }
  return { status: "sanitized" as const, inspection };
}

function startsWith(buffer: Buffer, signature: number[]) {
  return signature.every((byte, index) => buffer[index] === byte);
}

function asciiAt(buffer: Buffer, start: number, length: number) {
  return buffer.subarray(start, start + length).toString("ascii");
}

export function detectUploadKind(buffer: Buffer): DetectedUploadKind | null {
  if (buffer.length === 0) return null;
  if (asciiAt(buffer, 0, 5) === "%PDF-") return "pdf";
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return "jpeg";
  if (asciiAt(buffer, 0, 4) === "RIFF" && asciiAt(buffer, 8, 4) === "WEBP") return "webp";
  if (startsWith(buffer, [0x49, 0x49, 0x2a, 0x00]) || startsWith(buffer, [0x4d, 0x4d, 0x00, 0x2a])) return "tiff";
  if (startsWith(buffer, [0x50, 0x4b, 0x03, 0x04]) || startsWith(buffer, [0x50, 0x4b, 0x05, 0x06])) return "zip";
  if (asciiAt(buffer, 0, 4) === "MThd") return "midi";
  if (asciiAt(buffer, 0, 4) === "RIFF" && asciiAt(buffer, 8, 4) === "WAVE") return "wav";
  if (asciiAt(buffer, 0, 3) === "ID3") return "mp3";
  if (buffer[0] === 0xff && (buffer[1] & 0xf6) === 0xf0) return "aac";
  if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) return "mp3";
  if (asciiAt(buffer, 0, 4) === "fLaC") return "flac";
  if (asciiAt(buffer, 0, 4) === "OggS") return "ogg";
  if (asciiAt(buffer, 0, 4) === "FORM" && ["AIFF", "AIFC"].includes(asciiAt(buffer, 8, 4))) return "aiff";
  if (startsWith(buffer, [0x1a, 0x45, 0xdf, 0xa3])) return "webm";

  if (asciiAt(buffer, 4, 4) === "ftyp") {
    const brand = asciiAt(buffer, 8, 4);
    if (brand === "qt  ") return "quicktime";
    if (["M4A ", "M4B ", "M4P ", "F4A ", "F4B "].includes(brand)) return "mp4-audio";
    return "mp4-video";
  }

  const text = buffer.toString("utf8").replace(/^\uFEFF/, "").trimStart();
  if (/^(?:<\?xml\b[\s\S]{0,8192})?<score-(?:partwise|timewise)\b/i.test(text)) return "musicxml";

  if (text.startsWith("{") || text.startsWith("[")) {
    return "json";
  }

  return null;
}

async function readDetectionWindow(filePath: string) {
  const handle = await fs.promises.open(filePath, "r");
  try {
    const stats = await handle.stat();
    const buffer = Buffer.alloc(Math.min(stats.size, 64 * 1024));
    await handle.read(buffer, 0, buffer.length, 0);
    return buffer;
  } finally {
    await handle.close();
  }
}

export type UploadScanResult = "clean" | "skipped";

async function writeSocket(socket: net.Socket, chunk: Buffer) {
  if (!socket.write(chunk)) await once(socket, "drain");
}

export async function scanUploadWithClamd(input: { filePath: string; host: string; port: number; timeoutMs: number }): Promise<UploadScanResult> {
  const socket = net.createConnection({ host: input.host, port: input.port });
  socket.setTimeout(input.timeoutMs, () => socket.destroy(new Error("ClamAV scan timed out.")));
  let response = Buffer.alloc(0);

  try {
    await once(socket, "connect");
    const responsePromise = new Promise<string>((resolve, reject) => {
      socket.on("data", (chunk: Buffer) => {
        response = Buffer.concat([response, chunk]);
        if (response.length > 64 * 1024) {
          reject(new Error("ClamAV returned an oversized response."));
          socket.destroy();
          return;
        }
        const terminator = response.indexOf(0);
        if (terminator >= 0) resolve(response.subarray(0, terminator).toString("utf8"));
      });
      socket.once("error", reject);
      socket.once("end", () => {
        if (response.length > 0) resolve(response.toString("utf8"));
        else reject(new Error("ClamAV closed the connection without a result."));
      });
    });
    await writeSocket(socket, Buffer.from("zINSTREAM\0", "ascii"));
    for await (const value of fs.createReadStream(input.filePath, { highWaterMark: 64 * 1024 })) {
      const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value);
      const length = Buffer.alloc(4);
      length.writeUInt32BE(chunk.length);
      await writeSocket(socket, length);
      await writeSocket(socket, chunk);
    }
    await writeSocket(socket, Buffer.alloc(4));
    const result = await responsePromise;
    if (/\bFOUND\b/iu.test(result)) {
      throw new UploadSecurityError("The uploaded file failed the malware safety scan.", "MALWARE_DETECTED");
    }
    if (!/:\s*OK\s*$/iu.test(result)) {
      throw new UploadSecurityError("The malware scanner could not verify this upload. Please try again later.", "SCANNER_FAILED", 503);
    }
    return "clean";
  } catch (error) {
    if (error instanceof UploadSecurityError) throw error;
    throw new UploadSecurityError("The malware scanner could not verify this upload. Please try again later.", "SCANNER_FAILED", 503);
  } finally {
    socket.destroy();
  }
}

export async function scanUploadWithClamAv(filePath: string): Promise<UploadScanResult> {
  if (config.clamAvHost) {
    return scanUploadWithClamd({ filePath, host: config.clamAvHost, port: config.clamAvPort, timeoutMs: config.clamAvTimeoutMs });
  }

  if (!config.clamAvCommand) {
    if (config.clamAvRequired) {
      throw new UploadSecurityError("Malware scanning is temporarily unavailable. Please try again later.", "SCANNER_UNAVAILABLE", 503);
    }
    return "skipped";
  }

  return await new Promise<UploadScanResult>((resolve, reject) => {
    execFile(
      config.clamAvCommand,
      ["--no-summary", filePath],
      { timeout: config.clamAvTimeoutMs, windowsHide: true, maxBuffer: 1024 * 1024 },
      (error) => {
        if (!error) {
          resolve("clean");
          return;
        }

        const exitCode = "code" in error ? error.code : null;
        if (exitCode === 1) {
          reject(new UploadSecurityError("The uploaded file failed the malware safety scan.", "MALWARE_DETECTED"));
          return;
        }

        reject(new UploadSecurityError("The malware scanner could not verify this upload. Please try again later.", "SCANNER_FAILED", 503));
      },
    );
  });
}

export async function storeVerifiedUpload(input: {
  stream: NodeJS.ReadableStream;
  targetPath: string;
  allowedKinds: readonly DetectedUploadKind[];
  scan?: (filePath: string) => Promise<UploadScanResult>;
  quarantineDir?: string;
  mediaSafety?: MediaSafetyPolicy;
  processMedia?: typeof sanitizeMediaUpload;
}) {
  const storageRoot = path.resolve(input.quarantineDir ? path.dirname(input.quarantineDir) : config.storageDir);
  const quarantineDir = resolveUploadPath(storageRoot, input.quarantineDir ?? path.join(storageRoot, ".quarantine"));
  const targetPath = resolveUploadPath(storageRoot, input.targetPath);
  await fs.promises.mkdir(quarantineDir, { recursive: true });
  const quarantinePath = path.join(quarantineDir, `${randomUUID()}.upload`);
  const sanitizedPath = path.join(quarantineDir, `${randomUUID()}.safe`);

  try {
    await pipeline(input.stream, fs.createWriteStream(quarantinePath, { flags: "wx" }));
    const stats = await fs.promises.stat(quarantinePath);
    if (stats.size === 0) {
      throw new UploadSecurityError("The uploaded file is empty.", "EMPTY_FILE");
    }

    const detectedKind = detectUploadKind(await readDetectionWindow(quarantinePath));
    if (!detectedKind || !input.allowedKinds.includes(detectedKind)) {
      throw new UploadSecurityError("The uploaded file content does not match a supported file type.", "UNSUPPORTED_FILE_TYPE");
    }

    const scan = input.scan ?? scanUploadWithClamAv;
    const scanStatus = await scan(quarantinePath);
    const mediaResult = input.mediaSafety && mediaUploadKinds.has(detectedKind)
      ? await (input.processMedia ?? sanitizeMediaUpload)({
          sourcePath: quarantinePath,
          targetPath: sanitizedPath,
          detectedKind,
          policy: input.mediaSafety,
        })
      : null;
    const promotedPath = mediaResult?.status === "sanitized" ? sanitizedPath : quarantinePath;
    if (mediaResult?.status === "sanitized") await scan(sanitizedPath);
    await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.promises.rename(promotedPath, targetPath);
    if (promotedPath !== quarantinePath) await fs.promises.rm(quarantinePath, { force: true });
    const promotedStats = await fs.promises.stat(targetPath);

    return {
      detectedKind,
      mimeType: MIME_BY_KIND[detectedKind],
      sizeBytes: promotedStats.size,
      scanStatus,
      mediaStatus: mediaResult?.status ?? "not_applicable",
      mediaInspection: mediaResult?.inspection ?? null,
    };
  } catch (error) {
    await fs.promises.rm(quarantinePath, { force: true }).catch(() => undefined);
    await fs.promises.rm(sanitizedPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

function resolveUploadPath(root: string, candidate: string) {
  const resolved = path.resolve(candidate);
  const relative = path.relative(root, resolved);
  if (relative === "" || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new UploadSecurityError("The upload target escaped the configured storage directory.", "UNSAFE_STORAGE_PATH");
  }
  return resolved;
}

export function uploadErrorResponse(error: unknown) {
  if (error && typeof error === "object" && "code" in error && "statusCode" in error
    && (error.code === "PLAN_STORAGE_QUOTA_EXCEEDED" || error.code === "PLAN_JOB_QUOTA_EXCEEDED")) {
    const quotaError = error as { message: string; code: string; statusCode: number; quota?: unknown };
    return { statusCode: quotaError.statusCode, body: { error: quotaError.message, code: quotaError.code, quota: quotaError.quota } };
  }
  if (error instanceof ObjectStorageUnavailableError) {
    return {
      statusCode: 503 as const,
      body: {
        error: error.message,
        code: error.code,
        ...(config.nodeEnv === "staging" ? { diagnostic: error.diagnostic } : {}),
      },
    };
  }
  if (error instanceof UploadSecurityError) {
    return { statusCode: error.statusCode, body: { error: error.message, code: error.code } };
  }
  return { statusCode: 400 as const, body: { error: "The upload could not be verified. Check the file size and try again.", code: "UPLOAD_FAILED" } };
}
