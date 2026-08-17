import { createHash, timingSafeEqual } from "node:crypto";
import { Pool, type QueryResultRow } from "pg";
import { config } from "../config.js";
import type { PaymentOrderRow } from "../repositories/payment-repository.js";

let pool: Pool | null = null;
let storeReadyPromise: Promise<void> | null = null;

function getPool() {
  if (!config.postgresUrl) return null;
  pool ??= new Pool({
    connectionString: config.postgresUrl,
    max: 2,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
  });
  return pool;
}

async function ensureStoreReady() {
  const activePool = getPool();
  if (!activePool) return false;
  // Schema changes belong to deployment migrations. The runtime role intentionally
  // has table DML access without permission to create or replace database objects.
  storeReadyPromise ??= activePool
    .query(`SELECT 1 FROM public.score_payment_orders LIMIT 1`)
    .then(() => undefined);
  await storeReadyPromise;
  return true;
}

export function hashPaymentOrderToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function tokenHashesMatch(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function nullableString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function mapRow(row: QueryResultRow, publicToken: string): PaymentOrderRow {
  return {
    id: String(row.id),
    public_token: publicToken,
    user_id: nullableString(row.user_id),
    provider: row.provider,
    status: row.status,
    customer_email: nullableString(row.customer_email),
    locale: nullableString(row.locale),
    entitlement_days: Number(row.entitlement_days),
    billing_kind: row.billing_kind,
    organization_id: nullableString(row.organization_id),
    seat_quantity: Number(row.seat_quantity),
    idempotency_key_hash: nullableString(row.idempotency_key_hash),
    checkout_session_id: nullableString(row.checkout_session_id),
    transaction_id: nullableString(row.transaction_id),
    checkout_url: nullableString(row.checkout_url),
    amount_minor: nullableNumber(row.amount_minor),
    currency: nullableString(row.currency),
    activation_code_id: null,
    paid_at: nullableString(row.paid_at),
    cancelled_at: nullableString(row.cancelled_at),
    failure_reason: nullableString(row.failure_reason),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    activation_code: nullableString(row.activation_code),
  } as PaymentOrderRow;
}

export function durablePaymentOrdersConfigured() {
  return Boolean(config.postgresUrl);
}

export async function saveDurablePaymentOrder(order: PaymentOrderRow) {
  if (!(await ensureStoreReady())) return;
  await pool!.query(
    `
      INSERT INTO public.score_payment_orders (
        id, public_token_hash, user_id, provider, status, customer_email, locale,
        entitlement_days, billing_kind, organization_id, seat_quantity,
        checkout_session_id, transaction_id, checkout_url, amount_minor, currency,
        activation_code, paid_at, cancelled_at, failure_reason, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
      )
      ON CONFLICT (id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        status = EXCLUDED.status,
        customer_email = EXCLUDED.customer_email,
        locale = EXCLUDED.locale,
        entitlement_days = EXCLUDED.entitlement_days,
        billing_kind = EXCLUDED.billing_kind,
        organization_id = EXCLUDED.organization_id,
        seat_quantity = EXCLUDED.seat_quantity,
        checkout_session_id = EXCLUDED.checkout_session_id,
        transaction_id = EXCLUDED.transaction_id,
        checkout_url = EXCLUDED.checkout_url,
        amount_minor = EXCLUDED.amount_minor,
        currency = EXCLUDED.currency,
        activation_code = EXCLUDED.activation_code,
        paid_at = EXCLUDED.paid_at,
        cancelled_at = EXCLUDED.cancelled_at,
        failure_reason = EXCLUDED.failure_reason,
        updated_at = EXCLUDED.updated_at
    `,
    [
      order.id,
      hashPaymentOrderToken(order.public_token),
      order.user_id,
      order.provider,
      order.status,
      order.customer_email,
      order.locale,
      order.entitlement_days,
      order.billing_kind,
      order.organization_id,
      order.seat_quantity,
      order.checkout_session_id,
      order.transaction_id,
      order.checkout_url,
      order.amount_minor,
      order.currency,
      order.activation_code,
      order.paid_at,
      order.cancelled_at,
      order.failure_reason,
      order.created_at,
      order.updated_at,
    ],
  );
}

export async function findDurablePaymentOrderForPublic(id: string, publicToken: string) {
  if (!(await ensureStoreReady())) return undefined;
  const result = await pool!.query(`SELECT * FROM public.score_payment_orders WHERE id = $1`, [id]);
  const row = result.rows[0];
  if (!row || !tokenHashesMatch(String(row.public_token_hash), hashPaymentOrderToken(publicToken))) return undefined;
  return mapRow(row, publicToken);
}

export async function findDurablePaymentOrderByCheckoutSessionId(sessionId: string) {
  if (!(await ensureStoreReady())) return undefined;
  const result = await pool!.query(`SELECT * FROM public.score_payment_orders WHERE checkout_session_id = $1`, [sessionId]);
  const row = result.rows[0];
  return row ? mapRow(row, "") : undefined;
}

export async function findDurablePaymentOrderById(id: string) {
  if (!(await ensureStoreReady())) return undefined;
  const result = await pool!.query(`SELECT * FROM public.score_payment_orders WHERE id = $1`, [id]);
  const row = result.rows[0];
  return row ? mapRow(row, "") : undefined;
}

export async function completeDurablePaymentOrder(input: {
  orderId: string;
  amountMinor?: number | null;
  currency?: string | null;
}) {
  if (!(await ensureStoreReady())) return undefined;
  const timestamp = new Date().toISOString();
  await pool!.query(
    `
      UPDATE public.score_payment_orders
      SET status = 'paid', amount_minor = COALESCE($2, amount_minor),
          currency = COALESCE($3, currency), paid_at = COALESCE(paid_at, $4),
          failure_reason = NULL, updated_at = $4
      WHERE id = $1
    `,
    [input.orderId, input.amountMinor ?? null, input.currency ?? null, timestamp],
  );
  return findDurablePaymentOrderById(input.orderId);
}

export async function cancelDurablePaymentOrder(orderId: string) {
  if (!(await ensureStoreReady())) return;
  const timestamp = new Date().toISOString();
  await pool!.query(
    `UPDATE public.score_payment_orders
     SET status = 'cancelled', cancelled_at = $2, updated_at = $2
     WHERE id = $1 AND status = 'pending'`,
    [orderId, timestamp],
  );
}
