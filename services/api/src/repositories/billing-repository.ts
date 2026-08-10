import { createHash } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { PaymentProvider } from "@score/shared";
import { createId } from "../lib/auth.js";

export type BillingSubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "paused"
  | "unpaid"
  | "incomplete"
  | "cancelled";

export type NormalizedBillingEvent = {
  provider: PaymentProvider;
  eventId: string;
  eventType: string;
  rawPayload: Buffer | string;
  customer?: {
    providerCustomerId: string;
    userId?: string | null;
    organizationId?: string | null;
    email?: string | null;
  };
  subscription?: {
    providerSubscriptionId: string;
    providerCustomerId?: string | null;
    userId?: string | null;
    organizationId?: string | null;
    status: BillingSubscriptionStatus;
    planRef?: string | null;
    seatQuantity?: number | null;
    currentPeriodStart?: string | null;
    currentPeriodEnd?: string | null;
    cancelAtPeriodEnd?: boolean;
    canceledAt?: string | null;
    endedAt?: string | null;
    paymentFailedAt?: string | null;
  };
  invoice?: {
    providerInvoiceId: string;
    providerSubscriptionId?: string | null;
    status: "draft" | "open" | "paid" | "failed" | "void" | "refunded";
    amountDueMinor?: number | null;
    amountPaidMinor?: number | null;
    amountRefundedMinor?: number | null;
    currency?: string | null;
    hostedUrl?: string | null;
    dueAt?: string | null;
    paidAt?: string | null;
    failedAt?: string | null;
  };
  refund?: {
    providerInvoiceId: string;
    amountRefundedMinor: number;
    fullyRefunded?: boolean;
  };
};

class WebhookReplayMismatchError extends Error {}

function nowIso() {
  return new Date().toISOString();
}

function positiveSeatQuantity(value: number | null | undefined) {
  return Number.isSafeInteger(value) && Number(value) > 0 ? Math.min(Number(value), 100_000) : 1;
}

function upsertCustomer(database: DatabaseSync, event: NormalizedBillingEvent) {
  const input = event.customer;
  if (!input?.providerCustomerId) return null;
  const now = nowIso();
  const existing = database.prepare("SELECT id FROM billing_customers WHERE provider = ? AND provider_customer_id = ?")
    .get(event.provider, input.providerCustomerId) as { id: string } | undefined;
  const id = existing?.id ?? createId();
  const matchedUser = input.userId ? null : input.email
    ? database.prepare("SELECT id FROM users WHERE lower(email) = lower(?)").get(input.email.trim()) as { id: string } | undefined
    : undefined;
  database.prepare(`
    INSERT INTO billing_customers (
      id, provider, provider_customer_id, user_id, organization_id, email, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(provider, provider_customer_id) DO UPDATE SET
      user_id = COALESCE(excluded.user_id, billing_customers.user_id),
      organization_id = COALESCE(excluded.organization_id, billing_customers.organization_id),
      email = COALESCE(excluded.email, billing_customers.email),
      updated_at = excluded.updated_at
  `).run(
    id,
    event.provider,
    input.providerCustomerId,
    input.userId ?? matchedUser?.id ?? null,
    input.organizationId ?? null,
    input.email?.trim().toLocaleLowerCase() || null,
    now,
    now,
  );
  return id;
}

function upsertSubscription(database: DatabaseSync, event: NormalizedBillingEvent, customerId: string | null) {
  const input = event.subscription;
  if (!input) return null;
  const now = nowIso();
  const existing = database.prepare("SELECT id, seat_quantity AS seatQuantity, cancel_at_period_end AS cancelAtPeriodEnd FROM billing_subscriptions WHERE provider = ? AND provider_subscription_id = ?")
    .get(event.provider, input.providerSubscriptionId) as { id: string; seatQuantity: number; cancelAtPeriodEnd: number } | undefined;
  const id = existing?.id ?? createId();
  const customer = customerId ? database.prepare("SELECT user_id AS userId, organization_id AS organizationId FROM billing_customers WHERE id = ?")
    .get(customerId) as { userId: string | null; organizationId: string | null } | undefined : undefined;
  database.prepare(`
    INSERT INTO billing_subscriptions (
      id, provider, provider_subscription_id, customer_id, user_id, organization_id, status,
      plan_ref, seat_quantity, current_period_start, current_period_end, cancel_at_period_end,
      canceled_at, ended_at, last_payment_failed_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(provider, provider_subscription_id) DO UPDATE SET
      customer_id = COALESCE(excluded.customer_id, billing_subscriptions.customer_id),
      user_id = COALESCE(excluded.user_id, billing_subscriptions.user_id),
      organization_id = COALESCE(excluded.organization_id, billing_subscriptions.organization_id),
      status = excluded.status,
      plan_ref = COALESCE(excluded.plan_ref, billing_subscriptions.plan_ref),
      seat_quantity = excluded.seat_quantity,
      current_period_start = COALESCE(excluded.current_period_start, billing_subscriptions.current_period_start),
      current_period_end = COALESCE(excluded.current_period_end, billing_subscriptions.current_period_end),
      cancel_at_period_end = excluded.cancel_at_period_end,
      canceled_at = COALESCE(excluded.canceled_at, billing_subscriptions.canceled_at),
      ended_at = COALESCE(excluded.ended_at, billing_subscriptions.ended_at),
      last_payment_failed_at = COALESCE(excluded.last_payment_failed_at, billing_subscriptions.last_payment_failed_at),
      updated_at = excluded.updated_at
  `).run(
    id,
    event.provider,
    input.providerSubscriptionId,
    customerId,
    input.userId ?? event.customer?.userId ?? customer?.userId ?? null,
    input.organizationId ?? event.customer?.organizationId ?? customer?.organizationId ?? null,
    input.status,
    input.planRef ?? null,
    positiveSeatQuantity(input.seatQuantity ?? existing?.seatQuantity),
    input.currentPeriodStart ?? null,
    input.currentPeriodEnd ?? null,
    input.cancelAtPeriodEnd === undefined ? existing?.cancelAtPeriodEnd ?? 0 : input.cancelAtPeriodEnd ? 1 : 0,
    input.canceledAt ?? null,
    input.endedAt ?? null,
    input.paymentFailedAt ?? null,
    now,
    now,
  );
  return id;
}

function upsertInvoice(database: DatabaseSync, event: NormalizedBillingEvent, subscriptionId: string | null) {
  const input = event.invoice;
  if (!input) return;
  const now = nowIso();
  const resolvedSubscriptionId = subscriptionId ?? (input.providerSubscriptionId
    ? (database.prepare("SELECT id FROM billing_subscriptions WHERE provider = ? AND provider_subscription_id = ?")
      .get(event.provider, input.providerSubscriptionId) as { id: string } | undefined)?.id ?? null
    : null);
  const existing = database.prepare("SELECT id FROM billing_invoices WHERE provider = ? AND provider_invoice_id = ?")
    .get(event.provider, input.providerInvoiceId) as { id: string } | undefined;
  database.prepare(`
    INSERT INTO billing_invoices (
      id, provider, provider_invoice_id, subscription_id, status, amount_due_minor, amount_paid_minor,
      amount_refunded_minor, currency, hosted_url, due_at, paid_at, failed_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(provider, provider_invoice_id) DO UPDATE SET
      subscription_id = COALESCE(excluded.subscription_id, billing_invoices.subscription_id),
      status = excluded.status,
      amount_due_minor = COALESCE(excluded.amount_due_minor, billing_invoices.amount_due_minor),
      amount_paid_minor = COALESCE(excluded.amount_paid_minor, billing_invoices.amount_paid_minor),
      amount_refunded_minor = MAX(excluded.amount_refunded_minor, billing_invoices.amount_refunded_minor),
      currency = COALESCE(excluded.currency, billing_invoices.currency),
      hosted_url = COALESCE(excluded.hosted_url, billing_invoices.hosted_url),
      due_at = COALESCE(excluded.due_at, billing_invoices.due_at),
      paid_at = COALESCE(excluded.paid_at, billing_invoices.paid_at),
      failed_at = COALESCE(excluded.failed_at, billing_invoices.failed_at),
      updated_at = excluded.updated_at
  `).run(
    existing?.id ?? createId(), event.provider, input.providerInvoiceId, resolvedSubscriptionId,
    input.status, input.amountDueMinor ?? null, input.amountPaidMinor ?? null,
    Math.max(0, input.amountRefundedMinor ?? 0), input.currency?.toLocaleLowerCase() ?? null,
    input.hostedUrl ?? null, input.dueAt ?? null, input.paidAt ?? null, input.failedAt ?? null, now, now,
  );
}

function applyRefund(database: DatabaseSync, event: NormalizedBillingEvent) {
  if (!event.refund) return;
  const status = event.refund.fullyRefunded ? "refunded" : "paid";
  database.prepare(`
    UPDATE billing_invoices
    SET amount_refunded_minor = MAX(amount_refunded_minor, ?), status = ?, updated_at = ?
    WHERE provider = ? AND provider_invoice_id = ?
  `).run(Math.max(0, event.refund.amountRefundedMinor), status, nowIso(), event.provider, event.refund.providerInvoiceId);
  if (event.refund.fullyRefunded) {
    database.prepare(`
      UPDATE billing_subscriptions
      SET status = 'cancelled', ended_at = COALESCE(ended_at, ?), updated_at = ?
      WHERE id = (
        SELECT subscription_id FROM billing_invoices WHERE provider = ? AND provider_invoice_id = ?
      )
    `).run(nowIso(), nowIso(), event.provider, event.refund.providerInvoiceId);
  }
}

export function processBillingWebhookEvent(database: DatabaseSync, event: NormalizedBillingEvent) {
  const payloadSha256 = createHash("sha256").update(event.rawPayload).digest("hex");
  const now = nowIso();
  database.exec("BEGIN IMMEDIATE");
  try {
    const existing = database.prepare(`
      SELECT id, status, payload_sha256 AS payloadSha256
      FROM billing_webhook_events WHERE provider = ? AND provider_event_id = ?
    `).get(event.provider, event.eventId) as { id: string; status: string; payloadSha256: string } | undefined;
    if (existing?.status === "processed") {
      if (existing.payloadSha256 !== payloadSha256) throw new WebhookReplayMismatchError("Webhook event ID was reused with a different payload.");
      database.exec("COMMIT");
      return { duplicate: true, processed: true };
    }

    const eventRowId = existing?.id ?? createId();
    database.prepare(`
      INSERT INTO billing_webhook_events (
        id, provider, provider_event_id, event_type, status, payload_sha256, attempts,
        last_error, received_at, processed_at, updated_at
      ) VALUES (?, ?, ?, ?, 'processing', ?, 1, NULL, ?, NULL, ?)
      ON CONFLICT(provider, provider_event_id) DO UPDATE SET
        event_type = excluded.event_type, status = 'processing', payload_sha256 = excluded.payload_sha256,
        attempts = billing_webhook_events.attempts + 1, last_error = NULL, updated_at = excluded.updated_at
    `).run(eventRowId, event.provider, event.eventId, event.eventType, payloadSha256, now, now);

    const customerId = upsertCustomer(database, event);
    const subscriptionId = upsertSubscription(database, event, customerId);
    upsertInvoice(database, event, subscriptionId);
    applyRefund(database, event);
    database.prepare(`
      UPDATE billing_webhook_events SET status = 'processed', processed_at = ?, updated_at = ? WHERE id = ?
    `).run(nowIso(), nowIso(), eventRowId);
    database.exec("COMMIT");
    return { duplicate: false, processed: true };
  } catch (error) {
    database.exec("ROLLBACK");
    if (error instanceof WebhookReplayMismatchError) throw error;
    const message = error instanceof Error ? error.message : "Unknown billing event failure.";
    const failedAt = nowIso();
    database.prepare(`
      INSERT INTO billing_webhook_events (
        id, provider, provider_event_id, event_type, status, payload_sha256, attempts,
        last_error, received_at, processed_at, updated_at
      ) VALUES (?, ?, ?, ?, 'failed', ?, 1, ?, ?, NULL, ?)
      ON CONFLICT(provider, provider_event_id) DO UPDATE SET
        status = 'failed', attempts = billing_webhook_events.attempts + 1,
        last_error = excluded.last_error, updated_at = excluded.updated_at
    `).run(createId(), event.provider, event.eventId, event.eventType, payloadSha256, message.slice(0, 1000), failedAt, failedAt);
    throw error;
  }
}

export function assignBillingSeat(database: DatabaseSync, input: {
  subscriptionId: string;
  organizationId: string;
  email: string;
  userId?: string | null;
}) {
  const subscription = database.prepare(`
    SELECT seat_quantity AS seatQuantity, organization_id AS organizationId
    FROM billing_subscriptions WHERE id = ? AND status IN ('trialing', 'active')
  `).get(input.subscriptionId) as { seatQuantity: number; organizationId: string | null } | undefined;
  if (!subscription || subscription.organizationId !== input.organizationId) throw new Error("Active organization subscription not found.");
  const normalizedEmail = input.email.trim().toLocaleLowerCase();
  const activeSeats = database.prepare(`
    SELECT count(*) AS count FROM billing_seat_assignments WHERE subscription_id = ? AND status = 'active'
  `).get(input.subscriptionId) as { count: number };
  const existing = database.prepare(`
    SELECT id, status FROM billing_seat_assignments WHERE subscription_id = ? AND assigned_email = ?
  `).get(input.subscriptionId, normalizedEmail) as { id: string; status: string } | undefined;
  if (!existing && Number(activeSeats.count) >= subscription.seatQuantity) throw new Error("No subscription seats are available.");
  const now = nowIso();
  database.prepare(`
    INSERT INTO billing_seat_assignments (
      id, subscription_id, organization_id, user_id, assigned_email, status, assigned_at, revoked_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'active', ?, NULL, ?)
    ON CONFLICT(subscription_id, assigned_email) DO UPDATE SET
      user_id = COALESCE(excluded.user_id, billing_seat_assignments.user_id),
      status = 'active', revoked_at = NULL, updated_at = excluded.updated_at
  `).run(existing?.id ?? createId(), input.subscriptionId, input.organizationId, input.userId ?? null, normalizedEmail, now, now);
}

export function revokeBillingSeat(database: DatabaseSync, input: { subscriptionId: string; organizationId: string; email: string }) {
  const now = nowIso();
  return database.prepare(`
    UPDATE billing_seat_assignments SET status = 'revoked', revoked_at = ?, updated_at = ?
    WHERE subscription_id = ? AND organization_id = ? AND assigned_email = ? AND status = 'active'
  `).run(now, now, input.subscriptionId, input.organizationId, input.email.trim().toLocaleLowerCase()).changes > 0;
}

export function findActiveSubscriptionEntitlement(database: DatabaseSync, userId: string) {
  return database.prepare(`
    SELECT subscriptions.id, subscriptions.status, subscriptions.current_period_start AS startsAt,
           subscriptions.current_period_end AS endsAt, subscriptions.provider, subscriptions.organization_id AS organizationId
    FROM billing_subscriptions subscriptions
    LEFT JOIN billing_seat_assignments seats
      ON seats.subscription_id = subscriptions.id AND seats.user_id = ? AND seats.status = 'active'
    WHERE subscriptions.status IN ('trialing', 'active')
      AND (subscriptions.current_period_end IS NULL OR datetime(subscriptions.current_period_end) > datetime('now'))
      AND (subscriptions.user_id = ? OR seats.id IS NOT NULL)
    ORDER BY COALESCE(datetime(subscriptions.current_period_end), datetime('9999-12-31')) DESC
    LIMIT 1
  `).get(userId, userId) as {
    id: string;
    status: BillingSubscriptionStatus;
    startsAt: string | null;
    endsAt: string | null;
    provider: PaymentProvider;
    organizationId: string | null;
  } | undefined;
}

export function listBillingForUser(database: DatabaseSync, userId: string) {
  const subscriptions = database.prepare(`
    SELECT id, provider, provider_subscription_id AS providerSubscriptionId, status, plan_ref AS planRef,
           seat_quantity AS seatQuantity, current_period_start AS currentPeriodStart,
           current_period_end AS currentPeriodEnd, cancel_at_period_end AS cancelAtPeriodEnd,
           organization_id AS organizationId, last_payment_failed_at AS lastPaymentFailedAt
    FROM billing_subscriptions WHERE user_id = ? ORDER BY datetime(created_at) DESC
  `).all(userId) as Array<{ id: string }>;
  const invoices = database.prepare(`
    SELECT invoices.id, invoices.provider, invoices.provider_invoice_id AS providerInvoiceId,
           invoices.status, invoices.amount_due_minor AS amountDueMinor, invoices.amount_paid_minor AS amountPaidMinor,
           invoices.amount_refunded_minor AS amountRefundedMinor, invoices.currency, invoices.hosted_url AS hostedUrl,
           invoices.due_at AS dueAt, invoices.paid_at AS paidAt, invoices.failed_at AS failedAt
    FROM billing_invoices invoices
    JOIN billing_subscriptions subscriptions ON subscriptions.id = invoices.subscription_id
    WHERE subscriptions.user_id = ? ORDER BY datetime(invoices.created_at) DESC LIMIT 100
  `).all(userId);
  const seatAssignments = subscriptions.length === 0 ? [] : database.prepare(`
    SELECT seats.id, seats.subscription_id AS subscriptionId, seats.organization_id AS organizationId,
           seats.user_id AS userId, seats.assigned_email AS assignedEmail, seats.status,
           seats.assigned_at AS assignedAt, seats.revoked_at AS revokedAt
    FROM billing_seat_assignments seats
    JOIN billing_subscriptions subscriptions ON subscriptions.id = seats.subscription_id
    WHERE subscriptions.user_id = ? ORDER BY datetime(seats.assigned_at) DESC
  `).all(userId);
  return { subscriptions, invoices, seatAssignments };
}
