import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import Fastify from "fastify";
import { PRODUCT_NAME } from "@score/shared";
import { config } from "./config.js";
import { initDb } from "./db.js";
import { authPlugin } from "./plugins/auth.js";
import { ensureActivationCode } from "./repositories/auth-repository.js";
import { activationRoutes } from "./routes/activation.js";
import { authRoutes } from "./routes/auth.js";
import { fileRoutes } from "./routes/files.js";
import { jobRoutes } from "./routes/jobs.js";

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: true,
});

await app.register(multipart, {
  limits: {
    files: 1,
    fileSize: 20 * 1024 * 1024,
  },
});

await app.register(authPlugin);
await app.register(authRoutes, { prefix: "/api" });
await app.register(activationRoutes, { prefix: "/api" });
await app.register(fileRoutes, { prefix: "/api" });
await app.register(jobRoutes, { prefix: "/api" });

initDb();
for (const code of config.seedActivationCodes) {
  ensureActivationCode(code, config.entitlementDays);
}

app.get("/health", async () => {
  return {
    status: "ok",
    service: "api",
    product: PRODUCT_NAME,
  };
});

app.get("/", async () => {
  return {
    message: "Online PDF Score Converter API is running.",
  };
});

async function start() {
  try {
    await app.listen({ port: config.port, host: config.host });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void start();
