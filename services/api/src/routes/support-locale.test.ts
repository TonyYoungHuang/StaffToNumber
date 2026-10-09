import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import { config } from "../config.js";
import { initDb } from "../db.js";
import { authPlugin } from "../plugins/auth.js";
import { listSupportRequests } from "../repositories/support-repository.js";
import { supportRoutes } from "./support.js";

test("French support requests retain their locale in storage and both email paths", async (t) => {
  initDb();
  const saved = { key: config.resendApiKey, from: config.emailFromAddress };
  config.resendApiKey = "test-placeholder";
  config.emailFromAddress = "test@example.invalid";
  const messages: Array<{ to: string[]; subject: string; text: string; html: string }> = [];
  // All email delivery is intercepted locally; this test never contacts Resend.
  t.mock.method(globalThis, "fetch", async (url: string | URL | Request, options?: RequestInit) => {
    assert.equal(String(url), "https://api.resend.com/emails");
    messages.push(JSON.parse(String(options?.body)));
    return new Response('{"id":"test-message"}', { status: 200 });
  });
  const app = Fastify();
  try {
    await app.register(authPlugin);
    await app.register(supportRoutes, { prefix: "/api" });
    const response = await app.inject({ method: "POST", url: "/api/support/requests", payload: {
      locale: "fr-FR", category: "payment", contactEmail: "french-test@example.invalid",
      contactName: "Test", subject: "Question sur mon accès", message: "Ceci est une demande de test locale.",
    } });
    assert.equal(response.statusCode, 201, response.body);
    const receipt = response.json();
    const stored = listSupportRequests({ limit: 100 }).find(item => item.reference_code === receipt.referenceCode);
    assert.equal(stored?.locale, "fr");
    assert.equal(messages.length, 2);
    const confirmation = messages.find(item => item.to.includes("french-test@example.invalid"))!;
    assert.match(confirmation.subject, /demande d’assistance reçue/u);
    assert.match(confirmation.text, /Paiement et vérification de commande/u);
    assert.match(confirmation.text, /\/fr\/support/u);
    assert.equal(receipt.confirmationDelivery, "resend");
  } finally {
    config.resendApiKey = saved.key;
    config.emailFromAddress = saved.from;
    await app.close();
  }
});
