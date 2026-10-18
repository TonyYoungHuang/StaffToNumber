import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Pool } from "pg";
import { db, initDb } from "../db.js";
import { normalizePaddleBillingEvent, normalizeStripeBillingEvent } from "../lib/billing-events.js";
import { processReconciledBillingWebhook, reconcileBillingSubscription } from "../lib/billing-reconciliation.js";
import { billingRefundCanCancelSubscription, BillingSnapshotRequiredError, processBillingWebhookEvent, type NormalizedBillingEvent } from "./billing-repository.js";

const at = (minute: number) => new Date(Date.UTC(2026, 9, 18, 0, minute)).toISOString();
function fixture(provider: "stripe" | "paddle") {
  initDb();
  const sub = crypto.randomUUID(), invoice = crypto.randomUUID();
  const event = (minute: number, status: "active" | "cancelled" = "active"): NormalizedBillingEvent => ({
    provider, eventId: crypto.randomUUID(), eventType: "subscription.updated", eventAt: at(minute), rawPayload: crypto.randomUUID(),
    subscription: { providerSubscriptionId: sub, status, currentPeriodStart: "2026-10-01T00:00:00.000Z", currentPeriodEnd: "2099-11-01T00:00:00.000Z" },
  });
  const status = () => (db.prepare("SELECT status FROM billing_subscriptions WHERE provider = ? AND provider_subscription_id = ?").get(provider, sub) as { status: string }).status;
  return { sub, invoice, event, status };
}

for (const provider of ["stripe", "paddle"] as const) {
  test(`${provider}: authoritative snapshots may shorten a period and cancel without allowing late active restoration`, async () => {
    const f = fixture(provider);
    processBillingWebhookEvent(db, f.event(1));
    const readPeriod = () => (db.prepare("SELECT current_period_end AS end FROM billing_subscriptions WHERE provider = ? AND provider_subscription_id = ?")
      .get(provider, f.sub) as { end: string }).end;
    const ordinaryOldCycle = f.event(2);
    ordinaryOldCycle.subscription!.currentPeriodEnd = "2099-10-01T00:00:00.000Z";
    processBillingWebhookEvent(db, ordinaryOldCycle);
    assert.equal(readPeriod(), "2099-11-01T00:00:00.000Z", "ordinary old-cycle payloads cannot shorten a current period");
    const shorterEnd = at(3), startsAt = "2026-10-01T00:00:00.000Z";
    const services = {
      stripe: async () => ({ id: f.sub, customer: `cus_${f.sub}`, status: "canceled", current_period_start: Date.parse(startsAt) / 1000,
        current_period_end: Date.parse(shorterEnd) / 1000, canceled_at: Date.parse(shorterEnd) / 1000, ended_at: Date.parse(shorterEnd) / 1000 }),
      paddle: async () => ({ id: f.sub, customer_id: `ctm_${f.sub}`, status: "canceled",
        current_billing_period: { starts_at: startsAt, ends_at: shorterEnd }, canceled_at: shorterEnd }),
    } as unknown as Parameters<typeof reconcileBillingSubscription>[1];
    await processReconciledBillingWebhook(db, f.event(3), services);
    assert.equal(f.status(), "cancelled", "the provider's current cancellation must replace the older local projection");
    assert.equal(readPeriod(), shorterEnd, "a verified current resource can legitimately shorten its period");
    processBillingWebhookEvent(db, f.event(2));
    assert.equal(f.status(), "cancelled", "a late active payload with a longer period cannot undo the current cancellation");
    assert.equal(readPeriod(), shorterEnd);
  });

  test(`${provider}: cancellation, full refund and current service period survive late notifications`, () => {
    const f = fixture(provider);
    processBillingWebhookEvent(db, f.event(1));
    processBillingWebhookEvent(db, f.event(3, "cancelled"));
    assert.equal(billingRefundCanCancelSubscription(db, { ...f.event(2), subscription: undefined, refund: { providerInvoiceId: f.invoice, amountRefundedMinor: 9900, fullyRefunded: true } }, f.sub), false,
      "a stale refund must not cancel a newer provider subscription as a webhook side effect");
    processBillingWebhookEvent(db, f.event(2));
    assert.equal(f.status(), "cancelled", "late active must not restore cancelled access");
    const paid = { ...f.event(4), invoice: { providerInvoiceId: f.invoice, providerSubscriptionId: f.sub, status: "paid" as const, amountPaidMinor: 9900 } };
    processBillingWebhookEvent(db, paid);
    processBillingWebhookEvent(db, { provider, eventId: crypto.randomUUID(), eventType: "refund", eventAt: at(6), rawPayload: "refund",
      refund: { providerInvoiceId: f.invoice, amountRefundedMinor: 9900, fullyRefunded: true } });
    processBillingWebhookEvent(db, { ...paid, eventId: crypto.randomUUID(), eventAt: at(5), rawPayload: "late paid" });
    assert.equal(f.status(), "cancelled");
    assert.equal((db.prepare("SELECT status FROM billing_invoices WHERE provider = ? AND provider_invoice_id = ?").get(provider, f.invoice) as { status: string }).status, "refunded");
    // A provider can issue a fresh event for an old billing period.
    const oldCycle = f.event(7);
    oldCycle.subscription!.currentPeriodEnd = "2099-10-01T00:00:00.000Z";
    processBillingWebhookEvent(db, oldCycle);
    assert.equal(f.status(), "cancelled", "an old cycle cannot revive access even with a newer envelope");
    assert.equal((db.prepare("SELECT current_period_end AS end FROM billing_subscriptions WHERE provider = ? AND provider_subscription_id = ?").get(provider, f.sub) as { end: string }).end, "2099-11-01T00:00:00.000Z");
  });
}

test("same-time conflicting events require and use an authoritative subscription snapshot", async () => {
  const f = fixture("stripe");
  processBillingWebhookEvent(db, f.event(1, "cancelled"));
  const conflicting = f.event(1);
  assert.throws(() => processBillingWebhookEvent(db, conflicting), BillingSnapshotRequiredError);
  const services = {
    stripe: async () => ({ id: f.sub, customer: "cus_local", status: "canceled" }),
    paddle: async () => { throw new Error("wrong provider"); },
  } as unknown as Parameters<typeof reconcileBillingSubscription>[1];
  processBillingWebhookEvent(db, await reconcileBillingSubscription(conflicting, services));
  assert.equal(f.status(), "cancelled");
  await assert.rejects(reconcileBillingSubscription(f.event(2), { stripe: async () => { throw new Error("provider unavailable"); } } as unknown as Parameters<typeof reconcileBillingSubscription>[1]), /provider unavailable/);
  assert.equal(f.status(), "cancelled", "provider failures do not commit an unverified active payload");
});

test("provider timestamps are normalized instead of using delivery time", () => {
  const stripe = normalizeStripeBillingEvent({ id: "local", type: "customer.subscription.updated", created: 1_700_000_000,
    data: { object: { id: "sub_local", status: "active" } } }, Buffer.alloc(0));
  assert.equal(stripe?.eventAt, new Date(1_700_000_000_000).toISOString());
  const paddle = normalizePaddleBillingEvent({ event_id: "local", event_type: "subscription.updated", occurred_at: at(1),
    data: { id: "sub_local", status: "active" } }, Buffer.alloc(0));
  assert.equal(paddle?.eventAt, at(1));
});

test("a snapshot fetched before another connection's same-time cancellation is fetched again", async () => {
  const f = fixture("stripe");
  let calls = 0;
  const services = { stripe: async () => {
    calls++;
    if (calls === 1) {
      // Simulate another connection committing while this HTTP read is in flight.
      processBillingWebhookEvent(db, f.event(1, "cancelled"));
      return { id: f.sub, customer: "cus_local", status: "active" };
    }
    return { id: f.sub, customer: "cus_local", status: "canceled" };
  } } as unknown as Parameters<typeof reconcileBillingSubscription>[1];
  await processReconciledBillingWebhook(db, f.event(1), services);
  assert.equal(calls, 2);
  assert.equal(f.status(), "cancelled");
});

const connectionString = process.env.POSTGRES_TEST_URL?.trim();
if (process.env.CI && !connectionString) throw new Error("POSTGRES_TEST_URL is required for the billing concurrency gate in CI.");
test("real PostgreSQL connections serialize first insertion, duplicate delivery and stale status updates", { skip: !connectionString, timeout: 120_000 }, async () => {
  initDb();
  const schema = `billing_order_${crypto.randomUUID().replaceAll("-", "")}`;
  const pool = new Pool({ connectionString }), client = await pool.connect();
  const quote = (name: string) => `"${name.replaceAll('"', '""')}"`;
  try {
    await client.query(`CREATE SCHEMA ${quote(schema)}`);
    for (const table of ["billing_webhook_events", "billing_customers", "billing_subscriptions", "billing_invoices"]) {
      const columns = db.prepare(`PRAGMA table_info(${quote(table)})`).all() as Array<{ name: string; type: string; pk: number; dflt_value: string | null }>;
      const fields = columns.map(c => `${quote(c.name)} ${c.type}${c.dflt_value === null ? "" : ` DEFAULT ${c.dflt_value}`}`);
      fields.push(`PRIMARY KEY (${columns.filter(c => c.pk).sort((a, b) => a.pk - b.pk).map(c => quote(c.name)).join(",")})`);
      const resource = { billing_webhook_events: "provider_event_id", billing_customers: "provider_customer_id", billing_subscriptions: "provider_subscription_id", billing_invoices: "provider_invoice_id" }[table];
      if (resource) fields.push(`UNIQUE(provider, ${resource})`);
      await client.query(`CREATE TABLE ${quote(schema)}.${quote(table)} (${fields.join(",")})`);
    }
    const migration = readFileSync(new URL("../../../../deploy/hetzner/billing-webhook-ordering.sql", import.meta.url), "utf8").replaceAll(':"runtime_schema"', quote(schema));
    await client.query(migration); await client.query(migration);
    const sub = crypto.randomUUID();
    const active: NormalizedBillingEvent = { provider: "stripe", eventId: crypto.randomUUID(), eventType: "subscription.updated", eventAt: at(1), rawPayload: "pg active", subscription: { providerSubscriptionId: sub, status: "active" } };
    const cancelled: NormalizedBillingEvent = { ...active, eventId: crypto.randomUUID(), eventAt: at(2), rawPayload: "pg cancelled", subscription: { providerSubscriptionId: sub, status: "cancelled" } };
    const code = `(async()=>{const {db}=await import('./src/db.ts'); const {processBillingWebhookEvent}=await import('./src/repositories/billing-repository.ts'); try{processBillingWebhookEvent(db,JSON.parse(process.env.BILLING_TEST_EVENT));}finally{db.close();}})().catch(e=>{process.stderr.write(String(e));process.exitCode=1;});`;
    const run = (event: NormalizedBillingEvent) => new Promise<void>((resolve, reject) => {
      const child = spawn(process.execPath, ["--import", "tsx", "-e", code], { cwd: process.cwd(), env: { ...process.env,
        RUNTIME_DATABASE_PRIMARY: "postgres", POSTGRES_URL: connectionString, POSTGRES_SCHEMA: schema, BILLING_TEST_EVENT: JSON.stringify(event) } });
      let error = ""; child.stderr.on("data", data => { error += data; }); child.on("error", reject);
      child.on("close", status => status === 0 ? resolve() : reject(new Error(error)));
    });
    await Promise.all([run(active), run(cancelled), run(active)]);
    assert.equal((await client.query(`SELECT status FROM ${quote(schema)}.billing_subscriptions WHERE provider_subscription_id=$1`, [sub])).rows[0].status, "cancelled");
    assert.equal((await client.query(`SELECT count(*)::integer AS count FROM ${quote(schema)}.billing_webhook_events`)).rows[0].count, 2);
    const invoice = crypto.randomUUID();
    const paid: NormalizedBillingEvent = { ...active, eventId: crypto.randomUUID(), eventAt: at(3), rawPayload: "pg invoice seed",
      invoice: { providerInvoiceId: invoice, providerSubscriptionId: sub, status: "paid", amountPaidMinor: 9900 } };
    await run(paid);
    const refund: NormalizedBillingEvent = { provider: "stripe", eventId: crypto.randomUUID(), eventType: "charge.refunded", eventAt: at(5), rawPayload: "pg refund",
      refund: { providerInvoiceId: invoice, amountRefundedMinor: 9900, fullyRefunded: true } };
    await Promise.all([run(refund), run({ ...paid, eventId: crypto.randomUUID(), eventAt: at(4), rawPayload: "pg late invoice" })]);
    assert.equal((await client.query(`SELECT status FROM ${quote(schema)}.billing_subscriptions WHERE provider_subscription_id=$1`, [sub])).rows[0].status, "cancelled");
    assert.equal((await client.query(`SELECT status FROM ${quote(schema)}.billing_invoices WHERE provider_invoice_id=$1`, [invoice])).rows[0].status, "refunded");
  } finally {
    await client.query(`DROP SCHEMA IF EXISTS ${quote(schema)} CASCADE`);
    client.release(); await pool.end();
  }
});
