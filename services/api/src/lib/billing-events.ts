import type { PaymentProvider } from "@score/shared";
import type { BillingSubscriptionStatus, NormalizedBillingEvent } from "../repositories/billing-repository.js";

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function identifier(value: unknown) {
  if (typeof value === "string") return value;
  return text(record(value).id);
}

function integer(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function unixIso(value: unknown) {
  const seconds = integer(value);
  return seconds === null ? null : new Date(seconds * 1000).toISOString();
}

function iso(value: unknown) {
  const candidate = text(value);
  if (!candidate) return null;
  const parsed = new Date(candidate);
  return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString();
}

function metadataOf(object: JsonRecord) {
  return record(object.metadata ?? object.custom_data);
}

function billingIdentity(object: JsonRecord) {
  const metadata = metadataOf(object);
  return {
    userId: text(metadata.userId),
    organizationId: text(metadata.organizationId),
    email: text(object.customer_email ?? object.email),
  };
}

function stripeSubscriptionId(invoice: JsonRecord) {
  const direct = identifier(invoice.subscription);
  if (direct) return direct;
  return identifier(record(record(invoice.parent).subscription_details).subscription);
}

function stripeSubscriptionStatus(value: unknown): BillingSubscriptionStatus {
  switch (value) {
    case "trialing":
    case "active":
    case "past_due":
    case "paused":
    case "unpaid":
    case "incomplete":
      return value;
    default:
      return "cancelled";
  }
}

function stripePlan(object: JsonRecord) {
  const firstItem = record((record(object.items).data as unknown[] | undefined)?.[0]);
  return identifier(firstItem.price) ?? identifier(record(firstItem.plan));
}

function stripeSeatQuantity(object: JsonRecord) {
  const metadata = metadataOf(object);
  const firstItem = record((record(object.items).data as unknown[] | undefined)?.[0]);
  return integer(metadata.seatQuantity) ?? integer(firstItem.quantity) ?? 1;
}

export function normalizeStripeBillingEvent(event: {
  id: string;
  type: string;
  data: { object: unknown };
}, rawPayload: Buffer): NormalizedBillingEvent | null {
  const object = record(event.data.object);
  const identity = billingIdentity(object);
  const base = { provider: "stripe" as const, eventId: event.id, eventType: event.type, rawPayload };

  if (event.type.startsWith("customer.subscription.")) {
    const providerSubscriptionId = identifier(object.id);
    const providerCustomerId = identifier(object.customer);
    if (!providerSubscriptionId) return null;
    return {
      ...base,
      customer: providerCustomerId ? { providerCustomerId, ...identity } : undefined,
      subscription: {
        providerSubscriptionId,
        providerCustomerId,
        ...identity,
        status: event.type === "customer.subscription.deleted" ? "cancelled" : stripeSubscriptionStatus(object.status),
        planRef: stripePlan(object),
        seatQuantity: stripeSeatQuantity(object),
        currentPeriodStart: unixIso(object.current_period_start),
        currentPeriodEnd: unixIso(object.current_period_end),
        cancelAtPeriodEnd: object.cancel_at_period_end === true,
        canceledAt: unixIso(object.canceled_at),
        endedAt: unixIso(object.ended_at),
      },
    };
  }

  if (event.type.startsWith("invoice.")) {
    const providerInvoiceId = identifier(object.id);
    if (!providerInvoiceId) return null;
    const providerSubscriptionId = stripeSubscriptionId(object);
    const failed = event.type === "invoice.payment_failed" || event.type === "invoice.payment_action_required";
    const paid = event.type === "invoice.paid" || object.status === "paid";
    const providerCustomerId = identifier(object.customer);
    return {
      ...base,
      customer: providerCustomerId ? { providerCustomerId, ...identity } : undefined,
      subscription: providerSubscriptionId && (paid || failed) ? {
        providerSubscriptionId,
        providerCustomerId,
        ...identity,
        status: paid ? "active" : failed ? "past_due" : "incomplete",
        currentPeriodStart: unixIso(object.period_start),
        currentPeriodEnd: unixIso(object.period_end),
        paymentFailedAt: failed ? new Date().toISOString() : null,
      } : undefined,
      invoice: {
        providerInvoiceId,
        providerSubscriptionId,
        status: paid ? "paid" : failed ? "failed" : object.status === "void" || object.status === "uncollectible" ? "void" : object.status === "draft" ? "draft" : "open",
        amountDueMinor: integer(object.amount_due),
        amountPaidMinor: integer(object.amount_paid),
        currency: text(object.currency),
        hostedUrl: text(object.hosted_invoice_url),
        dueAt: unixIso(object.due_date),
        paidAt: unixIso(record(object.status_transitions).paid_at),
        failedAt: failed ? new Date().toISOString() : null,
      },
    };
  }

  if (event.type === "charge.refunded" || event.type === "charge.refund.updated") {
    const providerInvoiceId = identifier(object.invoice);
    const refunded = integer(object.amount_refunded);
    if (!providerInvoiceId || refunded === null) return null;
    return {
      ...base,
      refund: {
        providerInvoiceId,
        amountRefundedMinor: refunded,
        fullyRefunded: integer(object.amount) === refunded,
      },
    };
  }

  return null;
}

function paddleSubscriptionStatus(value: unknown): BillingSubscriptionStatus {
  switch (value) {
    case "trialing":
    case "active":
    case "past_due":
    case "paused":
      return value;
    default:
      return "cancelled";
  }
}

function paddleTotals(object: JsonRecord) {
  return record(record(object.details).totals);
}

function paddlePlanAndSeats(object: JsonRecord) {
  const firstItem = record((object.items as unknown[] | undefined)?.[0]);
  return { planRef: identifier(firstItem.price), seatQuantity: integer(firstItem.quantity) ?? 1 };
}

export function normalizePaddleBillingEvent(payload: unknown, rawPayload: Buffer): NormalizedBillingEvent | null {
  const root = record(payload);
  const eventId = text(root.event_id);
  const eventType = text(root.event_type);
  if (!eventId || !eventType) return null;
  const object = record(root.data);
  const identity = billingIdentity(object);
  const base = { provider: "paddle" as const, eventId, eventType, rawPayload };

  if (eventType.startsWith("subscription.")) {
    const providerSubscriptionId = identifier(object.id);
    const providerCustomerId = identifier(object.customer_id);
    if (!providerSubscriptionId) return null;
    const period = record(object.current_billing_period);
    return {
      ...base,
      customer: providerCustomerId ? { providerCustomerId, ...identity } : undefined,
      subscription: {
        providerSubscriptionId,
        providerCustomerId,
        ...identity,
        status: eventType === "subscription.canceled" ? "cancelled" : paddleSubscriptionStatus(object.status),
        ...paddlePlanAndSeats(object),
        currentPeriodStart: iso(period.starts_at),
        currentPeriodEnd: iso(period.ends_at),
        canceledAt: iso(object.canceled_at),
      },
    };
  }

  if (eventType.startsWith("transaction.")) {
    const providerInvoiceId = identifier(object.id);
    if (!providerInvoiceId) return null;
    const providerSubscriptionId = identifier(object.subscription_id);
    const providerCustomerId = identifier(object.customer_id);
    const totals = paddleTotals(object);
    const paid = eventType === "transaction.completed" || eventType === "transaction.paid" || object.status === "completed";
    const failed = eventType === "transaction.payment_failed" || object.status === "past_due";
    return {
      ...base,
      customer: providerCustomerId ? { providerCustomerId, ...identity } : undefined,
      subscription: providerSubscriptionId ? {
        providerSubscriptionId,
        providerCustomerId,
        ...identity,
        status: paid ? "active" : failed ? "past_due" : "incomplete",
        paymentFailedAt: failed ? new Date().toISOString() : null,
      } : undefined,
      invoice: {
        providerInvoiceId,
        providerSubscriptionId,
        status: paid ? "paid" : failed ? "failed" : "open",
        amountDueMinor: integer(totals.grand_total ?? totals.total),
        amountPaidMinor: paid ? integer(totals.grand_total ?? totals.total) : null,
        currency: text(totals.currency_code),
        paidAt: paid ? iso(object.billed_at ?? root.occurred_at) : null,
        failedAt: failed ? iso(root.occurred_at) ?? new Date().toISOString() : null,
      },
    };
  }

  if (eventType.startsWith("adjustment.") && (object.status === "approved" || object.status === "rejected")) {
    const providerInvoiceId = identifier(object.transaction_id);
    const totals = record(object.totals);
    const refunded = integer(totals.grand_total ?? totals.total);
    if (!providerInvoiceId || refunded === null || object.status !== "approved") return null;
    return { ...base, refund: { providerInvoiceId, amountRefundedMinor: Math.abs(refunded), fullyRefunded: object.action === "refund" && object.type === "full" } };
  }
  return null;
}

export function providerFromValue(value: unknown): PaymentProvider | null {
  return value === "stripe" || value === "paddle" ? value : null;
}
