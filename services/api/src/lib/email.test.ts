import assert from "node:assert/strict";
import test from "node:test";
import { buildCheckoutIntentNotificationEmail, buildPaymentNotificationEmail, buildPasswordResetEmail, buildSupportConfirmationEmail, buildSupportNotificationEmail, buildPasswordResetUrl } from "./email.js";

test("French password reset keeps its language and token through the app handoff", () => {
  const resetUrl = buildPasswordResetUrl("https://app.example.test/reset-password?source=email", "test+token&value", "fr-FR");
  const handoff = new URL(resetUrl);
  assert.equal(handoff.pathname, "/api/locale");
  assert.equal(handoff.searchParams.get("locale"), "fr");
  const next = new URL(handoff.searchParams.get("next")!, handoff.origin);
  assert.equal(next.pathname, "/reset-password");
  assert.equal(next.searchParams.get("token"), "test+token&value");
  assert.equal(next.searchParams.get("source"), "email");
  const email = buildPasswordResetEmail({ email: "test@example.test", locale: "fr-FR", resetUrl, expiresHours: 2 });
  assert.match(email.subject, /réinitialisation/u);
  assert.match(email.text, /2 heure/u);
  assert.match(email.html, /lang="fr"/u);
  assert.match(email.html, /&amp;/u);
  assert.doesNotMatch(email.text, /password reset|You requested/u);
});

test("French support confirmation escapes customer text and retains the locale", () => {
  const input = { referenceCode: "SUP-TEST", locale: "fr", contactName: "<script>test</script>", contactEmail: "test@example.test", categoryLabel: "Paiement et vérification de commande", subject: "Accès & paiement", supportUrl: "https://example.test/fr/support" };
  const email = buildSupportConfirmationEmail(input);
  assert.match(email.subject, /demande d’assistance reçue/u);
  assert.match(email.text, /Paiement et vérification de commande/u);
  assert.match(email.html, /&lt;script&gt;/u);
  assert.doesNotMatch(email.html, /<script>/u);
  assert.match(email.html, /https:\/\/example.test\/fr\/support/u);
  const notification = buildSupportNotificationEmail({ ...input, message: "Question de test", createdAt: "2026-09-29T00:00:00Z" });
  assert.match(notification.text, /Locale: fr/u);
});

test("German and Russian customer emails preserve locale links and escape user content", () => {
  for (const locale of ["de", "ru"] as const) {
    const resetUrl = buildPasswordResetUrl("https://app.example.test", "test+token&value", locale);
    const email = buildPasswordResetEmail({ email:"test@example.test", locale, resetUrl, expiresHours:2 });
    assert.match(email.subject,/ScoreTransposer/);
    assert.doesNotMatch(email.text,/You requested|password reset link/);
    assert.match(email.html,new RegExp(`lang="${locale}"`));
    assert.match(email.html,/&amp;/);
    assert.equal(new URL(resetUrl).searchParams.get("locale"),locale);
    const support = buildSupportConfirmationEmail({referenceCode:"SUP-TEST",locale,contactName:"<script>test</script>",contactEmail:"test@example.test",categoryLabel:"Payment",subject:"Access & payment",supportUrl:`https://example.test/${locale}/support`});
    assert.match(support.html,/&lt;script&gt;/); assert.doesNotMatch(support.html,/<script>/);
    assert.match(support.html,new RegExp(`/${locale}/support`));
    assert.doesNotMatch(support.text,/Your support request/);
  }
});

test("Spanish reset and support messages preserve language, credentials and HTML escaping", () => {
  const resetUrl = buildPasswordResetUrl("https://app.example.test/reset-password", "test+token&value", "es-ES");
  const handoff = new URL(resetUrl);
  const next = new URL(handoff.searchParams.get("next")!, handoff.origin);
  assert.equal(handoff.searchParams.get("locale"), "es");
  assert.equal(next.searchParams.get("token"), "test+token&value");
  const reset = buildPasswordResetEmail({ email: "test@example.test", locale: "es-ES", resetUrl, expiresHours: 1 });
  assert.match(reset.html, /lang="es"/u);
  assert.match(reset.text, /Restablecer contraseña/u);
  assert.doesNotMatch(reset.text, /You requested|password reset/u);
  const support = buildSupportConfirmationEmail({ referenceCode: "SUP-TEST", locale: "es", contactName: "<script>test</script>", contactEmail: "test@example.test", categoryLabel: "Pago", subject: "Acceso & pago", supportUrl: "https://example.test/es/support" });
  assert.match(support.subject, /Solicitud de soporte recibida/u);
  assert.match(support.html, /&lt;script&gt;/u);
  assert.doesNotMatch(support.html, /<script>/u);
  assert.match(support.html, /\/es\/support/u);
});

test("payment notification email contains demand-validation details without secrets", () => {
  const email = buildPaymentNotificationEmail({
    provider: "paddle",
    environment: "sandbox",
    orderId: "order-123",
    providerReference: "txn_123",
    customerEmail: "buyer@example.com",
    amountMinor: 999,
    currency: "usd",
    billingKind: "subscription",
    paidAt: "2026-08-18T12:00:00.000Z",
  });

  assert.match(email.subject, /\[Payment TEST\]\[Paddle\] USD 9\.99/u);
  assert.match(email.text, /Order: order-123/u);
  assert.match(email.text, /Customer email: buyer@example\.com/u);
  assert.match(email.html, /txn_123/u);
  assert.doesNotMatch(email.text, /public_token|webhook secret|api key/iu);
  assert.match(email.text, /not evidence of customer demand/u);
});

test("checkout intent email distinguishes purchase interest from a completed payment", () => {
  const email = buildCheckoutIntentNotificationEmail({
    provider: "stripe",
    siteEnvironment: "production",
    providerEnabled: false,
    planCode: "converter-pro-monthly",
    orderId: "order-intent-123",
    userId: "user-123",
    customerEmail: "buyer@example.com",
    locale: "zh-CN",
    billingKind: "subscription",
    organizationId: null,
    seatQuantity: 1,
    createdAt: "2026-08-20T10:00:00.000Z",
  });

  assert.match(email.subject, /\[Checkout intent\]\[PRODUCTION SITE\]\[Stripe\]/u);
  assert.match(email.text, /purchase-intent evidence, not a confirmed payment/u);
  assert.match(email.text, /Provider status: not yet enabled/u);
  assert.match(email.text, /Selected plan: converter-pro-monthly/u);
  assert.match(email.text, /Customer email: buyer@example\.com/u);
  assert.match(email.html, /construction notice/u);
  assert.doesNotMatch(email.text, /public_token|webhook secret|api key/iu);
});
