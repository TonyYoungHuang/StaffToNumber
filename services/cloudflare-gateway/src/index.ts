import { Container, getContainer, type StopParams } from "@cloudflare/containers";
import { env as workerEnv } from "cloudflare:workers";
import { withProxyHeaders } from "./request-proxy.js";

export { ContainerProxy } from "@cloudflare/containers";

type Bindings = {
  API_CONTAINER: DurableObjectNamespace<ApiContainer>;
  COLLABORATION_CONTAINER: DurableObjectNamespace<CollaborationContainer>;
  MUSIC_WORKER_CONTAINER: DurableObjectNamespace<MusicWorkerContainer>;
  SCORE_ASSETS: R2Bucket;
  DEPLOYMENT_ENV: string;
  API_CONTAINER_NAME: string;
  COLLABORATION_CONTAINER_NAME: string;
  MUSIC_WORKER_CONTAINER_NAME: string;
  RUNTIME_DATABASE_PRIMARY: string;
  POSTGRES_SCHEMA: string;
  PUBLIC_SITE_URL: string;
  PUBLIC_APP_URL: string;
  PUBLIC_API_URL: string;
  PUBLIC_COLLABORATION_URL: string;
  ALLOWED_ORIGINS: string;
  GOOGLE_CLIENT_ID: string;
  S3_BUCKET: string;
  S3_KEY_PREFIX: string;
  POSTGRES_URL: string;
  REDIS_URL: string;
  S3_ENDPOINT: string;
  S3_ACCESS_KEY_ID: string;
  S3_SECRET_ACCESS_KEY: string;
  SECURITY_AUDIT_HASH_SALT: string;
  METRICS_BEARER_TOKEN: string;
  ADMIN_API_KEY: string;
  SEED_ACTIVATION_CODES?: string;
  EMAIL_DELIVERY_ENABLED: string;
  RESEND_API_KEY?: string;
  PAYMENT_PROVIDERS?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_ID?: string;
  STRIPE_SCHOOL_PRICE_ID?: string;
  STRIPE_MANAGED_PAYMENTS_ENABLED: string;
  PADDLE_API_KEY?: string;
  PADDLE_WEBHOOK_SECRET?: string;
  PADDLE_PRICE_ID?: string;
  PADDLE_SCHOOL_PRICE_ID?: string;
  PADDLE_ENVIRONMENT?: string;
  PADDLE_DEFAULT_PAYMENT_LINK?: string;
  SOUNDFONT_OBJECT_KEY?: string;
  SOUNDFONT_LICENSE_OBJECT_KEY?: string;
  OBJECT_STORAGE_GATEWAY_TOKEN?: string;
};

function baseContainerEnvironment(env: Bindings) {
  const emailDeliveryEnabled = env.EMAIL_DELIVERY_ENABLED === "true";
  const paymentProviders = env.PAYMENT_PROVIDERS?.trim() ?? "";
  const stripeEnabled = paymentProviders.split(",").map((provider) => provider.trim()).includes("stripe");
  const paddleEnabled = paymentProviders.split(",").map((provider) => provider.trim()).includes("paddle");

  return {
    NODE_ENV: env.DEPLOYMENT_ENV === "production" ? "production" : "staging",
    HOST: "0.0.0.0",
    RUNTIME_DATABASE_PRIMARY: env.RUNTIME_DATABASE_PRIMARY,
    POSTGRES_URL: env.POSTGRES_URL,
    POSTGRES_SCHEMA: env.POSTGRES_SCHEMA,
    REDIS_URL: env.REDIS_URL,
    JOB_BROKER_BACKEND: "bullmq",
    JOB_BROKER_REDIS_URL: env.REDIS_URL,
    JOB_BROKER_PREFIX: `score-jobs-${env.DEPLOYMENT_ENV}`,
    STORAGE_BACKEND: "s3",
    STORAGE_DIR: "/tmp/scoretransposer/storage",
    S3_BUCKET: env.S3_BUCKET,
    S3_REGION: "auto",
    S3_ENDPOINT: env.S3_ENDPOINT,
    S3_FORCE_PATH_STYLE: "false",
    S3_ACCESS_KEY_ID: env.S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: env.S3_SECRET_ACCESS_KEY,
    S3_KEY_PREFIX: env.S3_KEY_PREFIX,
    S3_MAX_ATTEMPTS: "3",
    OBJECT_STORAGE_GATEWAY_URL: env.OBJECT_STORAGE_GATEWAY_TOKEN
      ? `${env.PUBLIC_API_URL.replace(/\/+$/u, "")}/__edge/storage`
      : "",
    OBJECT_STORAGE_GATEWAY_TOKEN: env.OBJECT_STORAGE_GATEWAY_TOKEN ?? "",
    PUBLIC_SITE_URL: env.PUBLIC_SITE_URL,
    PUBLIC_APP_URL: env.PUBLIC_APP_URL,
    PUBLIC_API_URL: env.PUBLIC_API_URL,
    APP_PUBLIC_URL: env.PUBLIC_APP_URL,
    GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
    SECURITY_AUDIT_HASH_SALT: env.SECURITY_AUDIT_HASH_SALT,
    METRICS_BEARER_TOKEN: env.METRICS_BEARER_TOKEN,
    ADMIN_API_KEY: env.ADMIN_API_KEY,
    SEED_ACTIVATION_CODES: env.DEPLOYMENT_ENV === "staging" ? env.SEED_ACTIVATION_CODES ?? "" : "",
    EMAIL_DELIVERY_ENABLED: String(emailDeliveryEnabled),
    RESEND_API_KEY: emailDeliveryEnabled ? env.RESEND_API_KEY ?? "" : "",
    EMAIL_FROM_ADDRESS: "ScoreTransposer <no-reply@notify.scoretransposer.com>",
    EMAIL_REPLY_TO: "support@scoretransposer.com",
    SUPPORT_EMAIL: "support@scoretransposer.com",
    PAYMENT_NOTIFICATION_EMAIL: "support@scoretransposer.com",
    PAYMENT_PROVIDERS: paymentProviders,
    PAYMENT_BILLING_MODE: "subscription",
    STRIPE_SECRET_KEY: stripeEnabled ? env.STRIPE_SECRET_KEY ?? "" : "",
    STRIPE_WEBHOOK_SECRET: stripeEnabled ? env.STRIPE_WEBHOOK_SECRET ?? "" : "",
    STRIPE_PRICE_ID: stripeEnabled ? env.STRIPE_PRICE_ID ?? "" : "",
    STRIPE_SCHOOL_PRICE_ID: stripeEnabled ? env.STRIPE_SCHOOL_PRICE_ID ?? "" : "",
    STRIPE_MANAGED_PAYMENTS_ENABLED: env.STRIPE_MANAGED_PAYMENTS_ENABLED,
    PADDLE_API_KEY: paddleEnabled ? env.PADDLE_API_KEY ?? "" : "",
    PADDLE_WEBHOOK_SECRET: paddleEnabled ? env.PADDLE_WEBHOOK_SECRET ?? "" : "",
    PADDLE_PRICE_ID: paddleEnabled ? env.PADDLE_PRICE_ID ?? "" : "",
    PADDLE_SCHOOL_PRICE_ID: paddleEnabled ? env.PADDLE_SCHOOL_PRICE_ID ?? "" : "",
    PADDLE_ENVIRONMENT: env.PADDLE_ENVIRONMENT ?? (env.DEPLOYMENT_ENV === "production" ? "production" : "sandbox"),
    PADDLE_DEFAULT_PAYMENT_LINK: env.PADDLE_DEFAULT_PAYMENT_LINK ?? `${env.PUBLIC_SITE_URL.replace(/\/+$/u, "")}/checkout/paddle`,
    TRUST_PROXY: "true",
    RATE_LIMIT_ENABLED: "true",
    API_REPLICA_COUNT: "1",
    LIFECYCLE_CLEANUP_ENABLED: "true",
    MEDIA_SAFETY_REQUIRED: "true",
  };
}

const configuredEnvironment = workerEnv as unknown as Bindings;

abstract class ObservableContainer extends Container {
  abstract serviceName: string;

  override onStart() {
    console.log(JSON.stringify({ event: "container.started", service: this.serviceName }));
  }

  override onStop(params: StopParams) {
    console.log(JSON.stringify({ event: "container.stopped", service: this.serviceName, ...params }));
  }

  override onError(error: unknown) {
    console.error(JSON.stringify({
      event: "container.error",
      service: this.serviceName,
      error: error instanceof Error ? error.message : String(error),
    }));
    throw error;
  }
}

const apiContainerEntrypoint = [
  "sh",
  "-lc",
  [
    "test -r /etc/cloudflare/certs/cloudflare-containers-ca.crt",
    "if [ \"$(id -u)\" = \"0\" ]; then cp /etc/cloudflare/certs/cloudflare-containers-ca.crt /usr/local/share/ca-certificates/cloudflare-containers-ca.crt && update-ca-certificates && exec runuser -u node -- node services/api/dist/index.js; else exec node services/api/dist/index.js; fi",
  ].join(" && "),
];

export class ApiContainer extends ObservableContainer {
  static outboundByHost = {
    "api.stripe.com": (request: Request) => fetch(request),
    "api.paddle.com": (request: Request) => fetch(request),
    "sandbox-api.paddle.com": (request: Request) => fetch(request),
    "api.resend.com": (request: Request) => fetch(request),
    "api-staging.scoretransposer.com": (request: Request) => fetch(request),
    "api.scoretransposer.com": (request: Request) => fetch(request),
  };

  serviceName = "api";
  defaultPort = 4000;
  requiredPorts = [4000];
  pingEndpoint = "container/health";
  sleepAfter = "30m";
  enableInternet = true;
  interceptHttps = true;
  entrypoint = apiContainerEntrypoint;
  envVars = {
    ...baseContainerEnvironment(configuredEnvironment),
    NODE_EXTRA_CA_CERTS: "/etc/cloudflare/certs/cloudflare-containers-ca.crt",
    PORT: "4000",
    RATE_LIMIT_REDIS_URL: "",
    MUSIC21_COMMAND: "/opt/score-python/bin/python",
  };
}

export class CollaborationContainer extends ObservableContainer {
  serviceName = "collaboration";
  defaultPort = 4001;
  requiredPorts = [4001];
  pingEndpoint = "container/health";
  sleepAfter = "30m";
  enableInternet = true;
  envVars = {
    ...baseContainerEnvironment(configuredEnvironment),
    COLLABORATION_PORT: "4001",
    COLLABORATION_INSTANCE_ID: "cloudflare-primary",
    COLLABORATION_REDIS_PREFIX: `score-collaboration-${configuredEnvironment.DEPLOYMENT_ENV}`,
  };
}

export class MusicWorkerContainer extends ObservableContainer {
  serviceName = "music-worker";
  defaultPort = 8080;
  requiredPorts = [8080];
  pingEndpoint = "container/health";
  sleepAfter = "10m";
  enableInternet = true;
  envVars = {
    ...baseContainerEnvironment(configuredEnvironment),
    HEALTH_PORT: "8080",
    WORKER_RUNTIME_READY_FILE: "/tmp/scoretransposer/runtime/worker-ready.json",
    JOB_BROKER_CONCURRENCY: "1",
    AUDIVERIS_COMMAND: "/opt/audiveris/bin/Audiveris",
    BASIC_PITCH_COMMAND: "/opt/score-python/bin/basic-pitch",
    MUSIC21_COMMAND: "/opt/score-python/bin/python",
    YT_DLP_COMMAND: "/opt/score-python/bin/yt-dlp",
    MUSESCORE_COMMAND: "/usr/bin/musescore3",
    FLUIDSYNTH_COMMAND: "/usr/bin/fluidsynth",
    FFMPEG_COMMAND: "/usr/bin/ffmpeg",
    FFPROBE_COMMAND: "/usr/bin/ffprobe",
    SOUNDFONT_PATH: "/usr/share/sounds/sf2/FluidR3_GM.sf2",
    SOUNDFONT_OBJECT_KEY: configuredEnvironment.SOUNDFONT_OBJECT_KEY ?? "",
    SOUNDFONT_LICENSE_OBJECT_KEY: configuredEnvironment.SOUNDFONT_LICENSE_OBJECT_KEY ?? "",
  };
}

function musicWorkerEnvironment(env: Bindings) {
  return {
    ...baseContainerEnvironment(env),
    HEALTH_PORT: "8080",
    WORKER_RUNTIME_READY_FILE: "/tmp/scoretransposer/runtime/worker-ready.json",
    JOB_BROKER_CONCURRENCY: "1",
    AUDIVERIS_COMMAND: "/opt/audiveris/bin/Audiveris",
    BASIC_PITCH_COMMAND: "/opt/score-python/bin/basic-pitch",
    MUSIC21_COMMAND: "/opt/score-python/bin/python",
    YT_DLP_COMMAND: "/opt/score-python/bin/yt-dlp",
    MUSESCORE_COMMAND: "/usr/bin/musescore3",
    FLUIDSYNTH_COMMAND: "/usr/bin/fluidsynth",
    FFMPEG_COMMAND: "/usr/bin/ffmpeg",
    FFPROBE_COMMAND: "/usr/bin/ffprobe",
    SOUNDFONT_PATH: "/usr/share/sounds/sf2/FluidR3_GM.sf2",
    SOUNDFONT_OBJECT_KEY: env.SOUNDFONT_OBJECT_KEY ?? "",
    SOUNDFONT_LICENSE_OBJECT_KEY: env.SOUNDFONT_LICENSE_OBJECT_KEY ?? "",
  };
}

async function startMusicWorker(env: Bindings) {
  const worker = getContainer(env.MUSIC_WORKER_CONTAINER, env.MUSIC_WORKER_CONTAINER_NAME);
  await worker.startAndWaitForPorts({
    ports: [8080],
    cancellationOptions: {
      instanceGetTimeoutMS: 300_000,
      portReadyTimeoutMS: 300_000,
      waitInterval: 1000,
    },
    startOptions: {
      enableInternet: true,
      envVars: musicWorkerEnvironment(env),
    },
  });
  return worker;
}

function edgeResponse(env: Bindings) {
  const databaseReady = env.RUNTIME_DATABASE_PRIMARY === "postgres" && Boolean(env.POSTGRES_SCHEMA?.trim());
  return Response.json({
    status: databaseReady ? "ready" : "blocked",
    service: "cloudflare-gateway",
    environment: env.DEPLOYMENT_ENV,
    region: "ENAM",
    databasePrimary: env.RUNTIME_DATABASE_PRIMARY,
    databaseSchema: env.POSTGRES_SCHEMA,
    productionReady: databaseReady,
  }, {
    status: databaseReady ? 200 : 503,
    headers: { "cache-control": "no-store" },
  });
}

async function readHealthResponse(response: Response) {
  let body: Record<string, unknown> = {};
  const rawBody = await response.text();
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    const responsePreview = rawBody.replace(/\s+/g, " ").trim().slice(0, 300);
    body = { status: "invalid_response", ...(responsePreview ? { responsePreview } : {}) };
  }
  return { ok: response.ok, statusCode: response.status, ...body };
}

async function runtimeReadinessResponse(env: Bindings) {
  const api = getContainer(env.API_CONTAINER, env.API_CONTAINER_NAME);
  const collaboration = getContainer(env.COLLABORATION_CONTAINER, env.COLLABORATION_CONTAINER_NAME);
  const worker = await startMusicWorker(env);
  const [apiHealth, collaborationHealth, workerHealth] = await Promise.all([
    api.fetch(new Request("http://container/ready")).then(readHealthResponse),
    collaboration.fetch(new Request("http://container/ready")).then(readHealthResponse),
    worker.fetch(new Request("http://container/ready")).then(readHealthResponse),
  ]);
  const ready = apiHealth.ok && collaborationHealth.ok && workerHealth.ok;
  return Response.json({
    status: ready ? "ready" : "not_ready",
    service: "cloudflare-gateway",
    environment: env.DEPLOYMENT_ENV,
    databasePrimary: env.RUNTIME_DATABASE_PRIMARY,
    databaseSchema: env.POSTGRES_SCHEMA,
    dependencies: {
      api: apiHealth,
      collaboration: collaborationHealth,
      worker: workerHealth,
    },
  }, {
    status: ready ? 200 : 503,
    headers: { "cache-control": "no-store" },
  });
}

function secureResponse(response: Response) {
  if (response.status === 101 || response.webSocket) return response;
  const headers = new Headers(response.headers);
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("permissions-policy", "camera=(), geolocation=(), microphone=(self)");
  headers.set("strict-transport-security", "max-age=31536000; includeSubDomains");
  if (!headers.has("cache-control")) headers.set("cache-control", "no-store");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function secureTokenEquals(left: string, right: string) {
  const length = Math.max(left.length, right.length);
  let mismatch = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    mismatch |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return mismatch === 0;
}

function storageObjectKey(url: URL, env: Bindings) {
  const key = url.searchParams.get("key")?.trim() ?? "";
  const prefix = env.S3_KEY_PREFIX.trim().replace(/^\/+|\/+$/gu, "");
  if (!key || key.length > 2_048 || key.includes("\0") || key.startsWith("/") || key.includes("../")) return null;
  if (prefix && key !== prefix && !key.startsWith(`${prefix}/`)) return null;
  return key;
}

async function storageGatewayResponse(request: Request, env: Bindings) {
  const configuredToken = env.OBJECT_STORAGE_GATEWAY_TOKEN?.trim() ?? "";
  const requestToken = request.headers.get("x-score-storage-token") ?? "";
  if (!configuredToken || !secureTokenEquals(configuredToken, requestToken)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const route = url.pathname.slice("/__edge/storage/".length);
  if (route === "health" && request.method === "GET") {
    await env.SCORE_ASSETS.list({ prefix: `${env.S3_KEY_PREFIX.replace(/\/+$/u, "")}/`, limit: 1 });
    return Response.json({ status: "ready", backend: "r2", bucket: env.S3_BUCKET });
  }

  if (route === "object") {
    const key = storageObjectKey(url, env);
    if (!key) return Response.json({ error: "Invalid object key." }, { status: 400 });
    if (request.method === "PUT") {
      if (!request.body) return Response.json({ error: "Object body is required." }, { status: 400 });
      await env.SCORE_ASSETS.put(key, request.body, {
        httpMetadata: { contentType: request.headers.get("content-type") ?? "application/octet-stream" },
        customMetadata: { sha256Hex: request.headers.get("x-score-sha256") ?? "" },
      });
      return Response.json({ stored: true, key }, { status: 201 });
    }
    if (request.method === "GET") {
      const object = await env.SCORE_ASSETS.get(key);
      if (!object) return Response.json({ error: "Object not found." }, { status: 404 });
      const headers = new Headers({ etag: object.httpEtag, "content-length": String(object.size) });
      object.writeHttpMetadata(headers);
      return new Response(object.body, { headers });
    }
    if (request.method === "HEAD") {
      const object = await env.SCORE_ASSETS.head(key);
      if (!object) return new Response(null, { status: 404 });
      const headers = new Headers({ etag: object.httpEtag, "content-length": String(object.size) });
      object.writeHttpMetadata(headers);
      return new Response(null, { headers });
    }
    if (request.method === "DELETE") {
      await env.SCORE_ASSETS.delete(key);
      return new Response(null, { status: 204 });
    }
  }

  if (route === "multipart" && request.method === "POST") {
    const payload = await request.json() as { objectKey?: string; contentType?: string };
    const keyUrl = new URL(url);
    keyUrl.searchParams.set("key", payload.objectKey ?? "");
    const key = storageObjectKey(keyUrl, env);
    if (!key) return Response.json({ error: "Invalid object key." }, { status: 400 });
    const upload = await env.SCORE_ASSETS.createMultipartUpload(key, {
      httpMetadata: { contentType: payload.contentType?.trim() || "application/octet-stream" },
    });
    return Response.json({ uploadId: upload.uploadId });
  }

  const partMatch = /^multipart\/([^/]+)\/parts\/(\d+)$/u.exec(route);
  if (partMatch && request.method === "PUT") {
    const key = storageObjectKey(url, env);
    const partNumber = Number(partMatch[2]);
    if (!key || !Number.isInteger(partNumber) || partNumber < 1 || partNumber > 10_000 || !request.body) {
      return Response.json({ error: "Invalid multipart upload request." }, { status: 400 });
    }
    const upload = env.SCORE_ASSETS.resumeMultipartUpload(key, decodeURIComponent(partMatch[1]));
    const part = await upload.uploadPart(partNumber, request.body);
    return Response.json({ etag: part.etag, partNumber: part.partNumber });
  }

  const completeMatch = /^multipart\/([^/]+)\/complete$/u.exec(route);
  if (completeMatch && request.method === "POST") {
    const key = storageObjectKey(url, env);
    const payload = await request.json() as { parts?: Array<{ partNumber: number; etag: string }> };
    if (!key || !Array.isArray(payload.parts) || payload.parts.length === 0) {
      return Response.json({ error: "Invalid multipart completion request." }, { status: 400 });
    }
    const upload = env.SCORE_ASSETS.resumeMultipartUpload(key, decodeURIComponent(completeMatch[1]));
    await upload.complete(payload.parts);
    return Response.json({ completed: true, key });
  }

  const abortMatch = /^multipart\/([^/]+)$/u.exec(route);
  if (abortMatch && request.method === "DELETE") {
    const key = storageObjectKey(url, env);
    if (!key) return Response.json({ error: "Invalid object key." }, { status: 400 });
    const upload = env.SCORE_ASSETS.resumeMultipartUpload(key, decodeURIComponent(abortMatch[1]));
    await upload.abort();
    return new Response(null, { status: 204 });
  }

  return Response.json({ error: "Storage route not found." }, { status: 404 });
}

async function routeRequest(request: Request, env: Bindings) {
  const url = new URL(request.url);
  if (url.pathname === "/__edge/health") return edgeResponse(env);
  if (url.pathname === "/__edge/readiness") return runtimeReadinessResponse(env);
  if (url.pathname.startsWith("/__edge/storage/")) return secureResponse(await storageGatewayResponse(request, env));

  const collaborationRequest = url.hostname === new URL(env.PUBLIC_COLLABORATION_URL).hostname
    || url.hostname.startsWith("collab.")
    || url.hostname.startsWith("collab-")
    || url.pathname === "/collaboration"
    || url.pathname.startsWith("/collaboration/");
  const container = collaborationRequest
    ? getContainer(env.COLLABORATION_CONTAINER, env.COLLABORATION_CONTAINER_NAME)
    : getContainer(env.API_CONTAINER, env.API_CONTAINER_NAME);
  const port = collaborationRequest ? 4001 : 4000;
  await container.startAndWaitForPorts({
    ports: [port],
    cancellationOptions: {
      instanceGetTimeoutMS: 120_000,
      portReadyTimeoutMS: 120_000,
      waitInterval: 500,
    },
    startOptions: {
      enableInternet: true,
      ...(collaborationRequest ? {} : { entrypoint: apiContainerEntrypoint }),
      envVars: collaborationRequest
        ? {
            ...baseContainerEnvironment(env),
            COLLABORATION_PORT: "4001",
            COLLABORATION_INSTANCE_ID: "cloudflare-primary",
            COLLABORATION_REDIS_PREFIX: `score-collaboration-${env.DEPLOYMENT_ENV}`,
          }
          : {
            ...baseContainerEnvironment(env),
            NODE_EXTRA_CA_CERTS: "/etc/cloudflare/certs/cloudflare-containers-ca.crt",
            PORT: "4000",
            RATE_LIMIT_REDIS_URL: "",
            MUSIC21_COMMAND: "/opt/score-python/bin/python",
          },
    },
  });
  const response = await container.fetch(await withProxyHeaders(request));
  return secureResponse(response);
}

async function keepMusicWorkerAlive(env: Bindings) {
  const worker = await startMusicWorker(env);
  const response = await worker.fetch(new Request("http://container/health"));
  if (!response.ok) throw new Error(`Music worker keepalive returned ${response.status}.`);
}

export default {
  fetch(request: Request, env: Bindings, ctx: ExecutionContext) {
    const response = routeRequest(request, env).catch((error: unknown) => {
      console.error(JSON.stringify({ event: "edge.request_failed", error: error instanceof Error ? error.message : String(error) }));
      return Response.json({ error: "Service temporarily unavailable." }, { status: 503, headers: { "cache-control": "no-store" } });
    });
    ctx.waitUntil(response.then(() => undefined));
    return response;
  },
  scheduled(_controller: ScheduledController, env: Bindings, ctx: ExecutionContext) {
    ctx.waitUntil(keepMusicWorkerAlive(env));
  },
} satisfies ExportedHandler<Bindings>;
