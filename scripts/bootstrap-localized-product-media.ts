import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { DatabaseSync } from "node:sqlite";
import { request } from "@playwright/test";
import { createOmrCandidateFixture } from "../tests/e2e/omr-candidate-fixture.js";

const repositoryRoot = path.resolve(process.cwd());
const apiUrl = new URL(process.env.PRODUCT_MEDIA_API_URL?.trim() || "http://127.0.0.1:43102");
const appUrl = new URL(process.env.PRODUCT_MEDIA_APP_URL?.trim() || "http://127.0.0.1:43101");
const expectedFixtureApiOrigin = "http://127.0.0.1:43102";

function assertBootstrapEnvironment() {
  if (!fs.existsSync(path.join(repositoryRoot, "tests", "e2e", "omr-candidate-fixture.ts"))) {
    throw new Error("Run bootstrap-localized-product-media.ts from the repository root.");
  }
  if (apiUrl.origin !== expectedFixtureApiOrigin) {
    throw new Error(
      `The shared OMR fixture is intentionally bound to ${expectedFixtureApiOrigin}; PRODUCT_MEDIA_API_URL was ${apiUrl.origin}.`,
    );
  }
  if (!["http:", "https:"].includes(appUrl.protocol)) {
    throw new Error("PRODUCT_MEDIA_APP_URL must be HTTP(S).");
  }
}

function buildAgentBrowserState(token: string, sessionCookie: {
  name: string;
  value: string;
  expires: number;
  sameSite: "Strict" | "Lax" | "None";
}) {
  return {
    cookies: [
      {
        name: "score_locale",
        value: "en",
        domain: appUrl.hostname,
        path: "/",
        expires: -1,
        httpOnly: false,
        secure: appUrl.protocol === "https:",
        sameSite: "Lax",
      },
      {
        name: sessionCookie.name,
        value: sessionCookie.value,
        domain: appUrl.hostname,
        path: "/",
        expires: sessionCookie.expires,
        httpOnly: true,
        secure: appUrl.protocol === "https:",
        sameSite: sessionCookie.sameSite,
      },
    ],
    origins: [
      {
        origin: appUrl.origin,
        localStorage: [{ name: "score-auth-token", value: token }],
      },
    ],
  };
}

function replaceLegacyFixturePreview(userId: string) {
  const dbPath = path.join(repositoryRoot, ".tmp", "e2e", "app.sqlite");
  const notationFixture = path.join(
    repositoryRoot,
    "tests",
    "e2e",
    "omr-candidate-review.spec.ts-snapshots",
    process.platform === "win32" ? "vexflow-satb-page-chromium-win32.png" : "vexflow-satb-page-chromium-linux.png",
  );
  if (!fs.existsSync(notationFixture)) throw new Error(`Notation-only capture fixture is missing: ${notationFixture}`);
  const db = new DatabaseSync(dbPath);
  try {
    const output = db.prepare(
      "SELECT id, storage_path FROM files WHERE user_id = ? AND file_kind = 'omr_page_image' ORDER BY created_at DESC LIMIT 1",
    ).get(userId) as { id: string; storage_path: string } | undefined;
    if (!output) throw new Error("The product-media score fixture has no OMR page image.");
    fs.copyFileSync(notationFixture, output.storage_path);
    db.prepare("UPDATE files SET size_bytes = ? WHERE id = ?").run(fs.statSync(output.storage_path).size, output.id);
  } finally {
    db.close();
  }
}

async function main() {
  assertBootstrapEnvironment();
  const context = await request.newContext();
  try {
    const fixture = await createOmrCandidateFixture(context, "localized-product-media", "satb");
    replaceLegacyFixturePreview(fixture.userId);
    const accepted = await context.post(`${apiUrl.origin}/api/scores/${fixture.documentId}/candidate/accept`, {
      headers: { Authorization: `Bearer ${fixture.token}` },
      data: { pendingRevisionId: fixture.initialCandidateRevisionId },
    });
    if (accepted.status() !== 200) {
      throw new Error(`Could not accept the product-media fixture: ${accepted.status()} ${await accepted.text()}`);
    }
    const apiState = await context.storageState();
    const sessionCookie = apiState.cookies.find((cookie) => cookie.name.startsWith("score_session"));
    if (!sessionCookie) throw new Error("The API fixture did not issue a reusable score_session cookie.");

    const outputDirectory = path.join(repositoryRoot, ".tmp", "product-media");
    const statePath = path.join(outputDirectory, "agent-browser-state.json");
    const environmentPath = path.join(outputDirectory, "capture-env.ps1");
    fs.mkdirSync(outputDirectory, { recursive: true });
    fs.writeFileSync(statePath, `${JSON.stringify(buildAgentBrowserState(fixture.token, sessionCookie), null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    fs.writeFileSync(
      environmentPath,
      [
        `$env:PRODUCT_MEDIA_AUTH_STATE = '${statePath.replaceAll("'", "''")}'`,
        `$env:PRODUCT_MEDIA_SCORE_ID = '${fixture.documentId.replaceAll("'", "''")}'`,
        `$env:PRODUCT_MEDIA_APP_URL = '${appUrl.origin.replaceAll("'", "''")}'`,
        "$env:PRODUCT_MEDIA_AGENT_BROWSER_ARGS = '--no-sandbox'",
        "",
      ].join("\n"),
      "utf8",
    );

    process.stdout.write(`${JSON.stringify({
      authState: path.relative(repositoryRoot, statePath),
      captureEnvironment: path.relative(repositoryRoot, environmentPath),
      scoreId: fixture.documentId,
      appUrl: appUrl.origin,
      next: [
        `. .\\${path.relative(repositoryRoot, environmentPath).replaceAll("/", "\\\\")}`,
        "$env:PRODUCT_MEDIA_CAPTURED_AT = 'YYYY-MM-DD'",
        "$env:PRODUCT_MEDIA_SOURCE_REVISION = '<exact-product-revision>'",
        "npm run media:product:capture",
      ],
    }, null, 2)}\n`);
  } finally {
    await context.dispose();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
