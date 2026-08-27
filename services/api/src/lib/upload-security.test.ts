import assert from "node:assert/strict";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import {
  buildSafeMediaTranscodeArgs,
  detectUploadKind,
  inspectPdfRasterSafety,
  parseMediaProbe,
  scanUploadWithClamd,
  storeVerifiedUpload,
  UploadSecurityError,
  uploadErrorResponse,
  uploadKinds,
} from "./upload-security.js";
import { ObjectStorageUnavailableError } from "./object-storage.js";

test("object storage failures retain a retryable 503 upload contract", () => {
  assert.deepEqual(uploadErrorResponse(new ObjectStorageUnavailableError()), {
    statusCode: 503,
    body: {
      error: "Object storage is temporarily unavailable. Please try again later.",
      code: "OBJECT_STORAGE_UNAVAILABLE",
    },
  });
});

async function startFakeClamd() {
  const server = net.createServer((socket) => {
    let pending = Buffer.alloc(0);
    let commandRead = false;
    const chunks: Buffer[] = [];
    socket.on("data", (incoming: Buffer) => {
      pending = Buffer.concat([pending, incoming]);
      if (!commandRead) {
        const terminator = pending.indexOf(0);
        if (terminator < 0) return;
        assert.equal(pending.subarray(0, terminator).toString("ascii"), "zINSTREAM");
        pending = pending.subarray(terminator + 1);
        commandRead = true;
      }

      while (pending.length >= 4) {
        const length = pending.readUInt32BE(0);
        if (length === 0) {
          const content = Buffer.concat(chunks).toString("utf8");
          socket.end(Buffer.from(content.includes("EICAR") ? "stream: Eicar-Test-Signature FOUND\0" : "stream: OK\0"));
          return;
        }
        if (pending.length < 4 + length) return;
        chunks.push(pending.subarray(4, 4 + length));
        pending = pending.subarray(4 + length);
      }
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");
  return { server, port: address.port };
}

test("detectUploadKind identifies score and media file signatures", () => {
  assert.equal(detectUploadKind(Buffer.from("%PDF-1.7\n")), "pdf");
  assert.equal(detectUploadKind(Buffer.from("MThd\0\0\0\x06")), "midi");
  assert.equal(detectUploadKind(Buffer.from("<?xml version=\"1.0\"?><score-partwise version=\"4.0\"/>")), "musicxml");
  assert.equal(detectUploadKind(Buffer.from('{"schemaVersion":2,"parts":[]}')), "json");
  assert.equal(detectUploadKind(Buffer.from("not really a score")), null);
});

test("media probe validation enforces audio streams, duration, and video dimensions", () => {
  const inspection = parseMediaProbe(JSON.stringify({
    format: { duration: "42.25", format_name: "mov,mp4" },
    streams: [
      { index: 0, codec_type: "video", codec_name: "h264", width: 1920, height: 1080, duration: "42.2" },
      { index: 1, codec_type: "audio", codec_name: "aac", duration: "42.25" },
    ],
  }), { mode: "performance", maxDurationSeconds: 60, maxVideoWidth: 1920, maxVideoHeight: 1080 });

  assert.equal(inspection.durationSeconds, 42.25);
  assert.equal(inspection.audioStreams, 1);
  assert.equal(inspection.videoStreams, 1);
  assert.equal(inspection.width, 1920);

  assert.throws(
    () => parseMediaProbe(JSON.stringify({ format: { duration: 61 }, streams: [{ codec_type: "audio" }] }), { mode: "audio", maxDurationSeconds: 60 }),
    (error: unknown) => error instanceof UploadSecurityError && error.code === "MEDIA_TOO_LONG" && error.statusCode === 413,
  );
  assert.throws(
    () => parseMediaProbe(JSON.stringify({ format: { duration: 10 }, streams: [{ codec_type: "video", width: 640, height: 360 }] }), { mode: "performance", maxDurationSeconds: 60 }),
    (error: unknown) => error instanceof UploadSecurityError && error.code === "MEDIA_STREAM_INVALID",
  );
});

test("safe media transcode arguments drop metadata and map only the first useful streams", () => {
  const audioArgs = buildSafeMediaTranscodeArgs({
    sourcePath: "source.mp3",
    targetPath: "safe.mp3",
    detectedKind: "mp3",
    policy: { mode: "audio", maxDurationSeconds: 900 },
  });
  assert.deepEqual(audioArgs.slice(0, 4), ["-nostdin", "-hide_banner", "-loglevel", "error"]);
  assert.ok(audioArgs.includes("-map_metadata"));
  assert.ok(audioArgs.includes("0:a:0"));
  assert.ok(audioArgs.includes("libmp3lame"));
  assert.equal(audioArgs.at(-1), "safe.mp3");

  const videoArgs = buildSafeMediaTranscodeArgs({
    sourcePath: "source.mp4",
    targetPath: "safe.mp4",
    detectedKind: "mp4-video",
    policy: { mode: "performance", maxDurationSeconds: 1200 },
  });
  assert.ok(videoArgs.includes("0:v:0"));
  assert.ok(videoArgs.includes("libx264"));
  assert.ok(videoArgs.includes("+faststart"));
});

test("storeVerifiedUpload promotes a clean file out of quarantine", async () => {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "score-upload-"));
  const targetPath = path.join(root, "stored", "score.pdf");

  try {
    const result = await storeVerifiedUpload({
      stream: Readable.from(Buffer.from("%PDF-1.7\nclean")),
      targetPath,
      allowedKinds: uploadKinds.pdf,
      scan: async () => "clean",
      quarantineDir: path.join(root, ".quarantine"),
    });

    assert.equal(result.detectedKind, "pdf");
    assert.equal(result.mimeType, "application/pdf");
    assert.equal(result.scanStatus, "clean");
    assert.equal(await fs.promises.readFile(targetPath, "utf8"), "%PDF-1.7\nclean");
  } finally {
    await fs.promises.rm(root, { recursive: true, force: true });
  }
});

test("storeVerifiedUpload rejects a target outside the quarantine storage root", async () => {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "score-upload-boundary-"));
  const outsidePath = path.join(path.dirname(root), `${path.basename(root)}-outside.pdf`);

  try {
    await assert.rejects(
      storeVerifiedUpload({
        stream: Readable.from(Buffer.from("%PDF-1.7\nclean")),
        targetPath: outsidePath,
        allowedKinds: uploadKinds.pdf,
        scan: async () => "clean",
        quarantineDir: path.join(root, ".quarantine"),
      }),
      (error: unknown) => error instanceof UploadSecurityError && error.code === "UNSAFE_STORAGE_PATH",
    );
    assert.equal(fs.existsSync(outsidePath), false);
  } finally {
    await fs.promises.rm(root, { recursive: true, force: true });
  }
});

test("storeVerifiedUpload promotes only the sanitized media result and scans both inputs", async () => {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "score-media-upload-"));
  const targetPath = path.join(root, "stored", "recording.wav");
  const scanned: string[] = [];

  try {
    const result = await storeVerifiedUpload({
      stream: Readable.from(Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WAVEunsafe-source")])),
      targetPath,
      allowedKinds: uploadKinds.audio,
      scan: async (filePath) => {
        scanned.push(filePath);
        return "clean";
      },
      quarantineDir: path.join(root, ".quarantine"),
      mediaSafety: { mode: "audio", maxDurationSeconds: 60 },
      processMedia: async ({ targetPath: safePath }) => {
        await fs.promises.writeFile(safePath, Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WAVEsanitized")]));
        return {
          status: "sanitized",
          inspection: { durationSeconds: 12, formatName: "wav", audioStreams: 1, videoStreams: 0, width: null, height: null },
        };
      },
    });

    assert.equal(result.mediaStatus, "sanitized");
    assert.equal(result.mediaInspection?.durationSeconds, 12);
    assert.equal(scanned.length, 2);
    assert.equal((await fs.promises.readFile(targetPath)).includes(Buffer.from("sanitized")), true);
    assert.equal((await fs.promises.readFile(targetPath)).includes(Buffer.from("unsafe-source")), false);
  } finally {
    await fs.promises.rm(root, { recursive: true, force: true });
  }
});

test("storeVerifiedUpload rejects spoofed extensions without promoting the file", async () => {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "score-upload-"));
  const targetPath = path.join(root, "stored", "fake.pdf");

  try {
    await assert.rejects(
      storeVerifiedUpload({
        stream: Readable.from(Buffer.from("MZ executable content")),
        targetPath,
        allowedKinds: uploadKinds.pdf,
        scan: async () => "clean",
        quarantineDir: path.join(root, ".quarantine"),
      }),
      (error: unknown) => error instanceof UploadSecurityError && error.code === "UNSUPPORTED_FILE_TYPE",
    );
    assert.equal(fs.existsSync(targetPath), false);
  } finally {
    await fs.promises.rm(root, { recursive: true, force: true });
  }
});

test("storeVerifiedUpload does not promote a file rejected by the scanner", async () => {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "score-upload-"));
  const targetPath = path.join(root, "stored", "score.pdf");

  try {
    await assert.rejects(
      storeVerifiedUpload({
        stream: Readable.from(Buffer.from("%PDF-1.7\nunsafe")),
        targetPath,
        allowedKinds: uploadKinds.pdf,
        scan: async () => {
          throw new UploadSecurityError("unsafe", "MALWARE_DETECTED");
        },
        quarantineDir: path.join(root, ".quarantine"),
      }),
      (error: unknown) => error instanceof UploadSecurityError && error.code === "MALWARE_DETECTED",
    );
    assert.equal(fs.existsSync(targetPath), false);
  } finally {
    await fs.promises.rm(root, { recursive: true, force: true });
  }
});

test("PDF raster safety rejects oversized pages and aggregate pixel overages", async () => {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "score-pdf-budget-"));
  const oversizedPath = path.join(root, "oversized.pdf");
  const multiPagePath = path.join(root, "multi-page.pdf");
  const policy = { dpi: 300, maxPagePixels: 12_000_000, maxTotalPixels: 120_000_000 };
  try {
    const oversized = await PDFDocument.create();
    oversized.addPage([17 * 72, 24 * 72]);
    await fs.promises.writeFile(oversizedPath, await oversized.save());
    await assert.rejects(
      inspectPdfRasterSafety(await fs.promises.readFile(oversizedPath), policy),
      (error: unknown) => error instanceof UploadSecurityError
        && error.code === "PDF_PAGE_PIXEL_LIMIT"
        && error.statusCode === 413,
    );

    const multiPage = await PDFDocument.create();
    multiPage.addPage([612, 792]);
    multiPage.addPage([612, 792]);
    await fs.promises.writeFile(multiPagePath, await multiPage.save());
    await assert.rejects(
      inspectPdfRasterSafety(await fs.promises.readFile(multiPagePath), { ...policy, maxTotalPixels: 10_000_000 }),
      (error: unknown) => error instanceof UploadSecurityError
        && error.code === "PDF_TOTAL_PIXEL_LIMIT"
        && error.statusCode === 413,
    );
  } finally {
    await fs.promises.rm(root, { recursive: true, force: true });
  }
});

test("storeVerifiedUpload keeps an over-budget PDF in quarantine", async () => {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "score-pdf-upload-"));
  const targetPath = path.join(root, "stored", "oversized.pdf");
  try {
    const oversized = await PDFDocument.create();
    oversized.addPage([17 * 72, 24 * 72]);
    const bytes = await oversized.save();
    await assert.rejects(
      storeVerifiedUpload({
        stream: Readable.from(Buffer.from(bytes)),
        targetPath,
        allowedKinds: uploadKinds.pdf,
        scan: async () => "clean",
        quarantineDir: path.join(root, ".quarantine"),
        pdfRasterSafety: { dpi: 300, maxPagePixels: 12_000_000, maxTotalPixels: 120_000_000 },
      }),
      (error: unknown) => error instanceof UploadSecurityError && error.code === "PDF_PAGE_PIXEL_LIMIT",
    );
    assert.equal(fs.existsSync(targetPath), false);
  } finally {
    await fs.promises.rm(root, { recursive: true, force: true });
  }
});

test("ClamAV daemon INSTREAM scanning accepts clean data and rejects a malware finding", async () => {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "score-clamd-"));
  const cleanPath = path.join(root, "clean.pdf");
  const infectedPath = path.join(root, "infected.pdf");
  await fs.promises.writeFile(cleanPath, "%PDF-1.7 clean");
  await fs.promises.writeFile(infectedPath, "%PDF-1.7 EICAR test marker");
  const { server, port } = await startFakeClamd();

  try {
    assert.equal(await scanUploadWithClamd({ filePath: cleanPath, host: "127.0.0.1", port, timeoutMs: 2000 }), "clean");
    await assert.rejects(
      scanUploadWithClamd({ filePath: infectedPath, host: "127.0.0.1", port, timeoutMs: 2000 }),
      (error: unknown) => error instanceof UploadSecurityError && error.code === "MALWARE_DETECTED",
    );
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await fs.promises.rm(root, { recursive: true, force: true });
  }
});

test("ClamAV daemon connection failures return a stable scanner error", async () => {
  const probe = net.createServer();
  await new Promise<void>((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", resolve);
  });
  const address = probe.address();
  assert.ok(address && typeof address === "object");
  const unavailablePort = address.port;
  await new Promise<void>((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "score-clamd-unavailable-"));
  const filePath = path.join(root, "score.pdf");
  await fs.promises.writeFile(filePath, "%PDF-1.7 clean");

  try {
    await assert.rejects(
      scanUploadWithClamd({ filePath, host: "127.0.0.1", port: unavailablePort, timeoutMs: 200 }),
      (error: unknown) => error instanceof UploadSecurityError && error.code === "SCANNER_FAILED" && error.statusCode === 503,
    );
  } finally {
    await fs.promises.rm(root, { recursive: true, force: true });
  }
});
