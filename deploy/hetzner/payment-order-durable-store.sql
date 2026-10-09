-- Run with the database owner, not the restricted application role:
-- psql -v ON_ERROR_STOP=1 -v runtime_schema=scoretransposer
--      -v runtime_role=scoretransposer_app -f payment-order-durable-store.sql
-- This additive recovery table is required by payment-order-durable-store.ts.
BEGIN;
CREATE TABLE IF NOT EXISTS public.score_payment_orders (
  id text PRIMARY KEY,
  public_token_hash text NOT NULL CHECK (length(public_token_hash) = 64),
  user_id text,
  provider text NOT NULL,
  status text NOT NULL,
  customer_email text,
  locale text,
  entitlement_days integer NOT NULL,
  billing_kind text NOT NULL,
  organization_id text,
  seat_quantity integer NOT NULL,
  idempotency_key_hash text,
  checkout_session_id text,
  transaction_id text,
  checkout_url text,
  amount_minor bigint,
  currency text,
  activation_code text,
  paid_at text,
  cancelled_at text,
  failure_reason text,
  created_at text NOT NULL,
  updated_at text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS score_payment_orders_checkout_session_idx
  ON public.score_payment_orders (checkout_session_id);
CREATE UNIQUE INDEX IF NOT EXISTS score_payment_orders_transaction_idx
  ON public.score_payment_orders (transaction_id);

-- Recover existing orders without copying their public access tokens in plaintext.
INSERT INTO public.score_payment_orders (
  id, public_token_hash, user_id, provider, status, customer_email, locale,
  entitlement_days, billing_kind, organization_id, seat_quantity, idempotency_key_hash,
  checkout_session_id, transaction_id, checkout_url, amount_minor, currency,
  activation_code, paid_at, cancelled_at, failure_reason, created_at, updated_at
)
SELECT po.id, encode(sha256(convert_to(po.public_token, 'UTF8')), 'hex'),
  po.user_id, po.provider, po.status, po.customer_email, po.locale,
  po.entitlement_days, po.billing_kind, po.organization_id, po.seat_quantity, po.idempotency_key_hash,
  po.checkout_session_id, po.transaction_id, po.checkout_url, po.amount_minor, po.currency,
  ac.code, po.paid_at, po.cancelled_at, po.failure_reason, po.created_at, po.updated_at
FROM :"runtime_schema".payment_orders po
LEFT JOIN :"runtime_schema".activation_codes ac ON ac.id = po.activation_code_id
ON CONFLICT (id) DO NOTHING;

REVOKE ALL ON public.score_payment_orders FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO :"runtime_role";
GRANT SELECT, INSERT, UPDATE, DELETE ON public.score_payment_orders TO :"runtime_role";
COMMIT;
