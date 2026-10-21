# Lifetime purchase, tax, refund and annual upgrade

The lifetime plan costs **$99 USD total**. A full refund can be
requested through support within **14 days of payment**. Any full refund or
chargeback revokes the corresponding lifetime entitlement, including reversals
outside that request window. Partial refunds retain access. Refunding lifetime
does not restart an annual renewal that was already stopped.

## Checkout configuration

- Configure `STRIPE_PRICE_CONVERTER_PRO_LIFETIME` with an active, one-time,
  9900-cent USD Price with `tax_behavior=exclusive`.
- Production uses `STRIPE_LIFETIME_AUTOMATIC_TAX=false`: tax must be zero and the
  total must equal 9900 cents minus the reserved annual upgrade credit.
- Set `STRIPE_LIFETIME_AUTOMATIC_TAX=true` only after Stripe Tax is configured
  and customer-facing tax disclosures have been updated.
  It controls `automatic_tax.enabled` for this product. The default is false.
- Lifetime uses direct Stripe Payments with optional Stripe Tax. It does not
  inherit `STRIPE_MANAGED_PAYMENTS_ENABLED`; existing recurring plans retain
  that configuration. There is no longer a blanket lifetime rejection when
  the legacy Managed Payments switch is on. This is a product-level merchant
  configuration decision; verify the direct seller's Tax setup before release.
- Adaptive Pricing and public promotion-code entry are disabled for lifetime.
  The server may apply only its recorded annual upgrade discount.
- The fulfillment handler verifies a 9900-cent `amount_subtotal`, the original
  account/order/Price/session, the recorded discount, and
  `amount_total = amount_subtotal - amount_discount + amount_tax`. Shipping must
  be zero. Tax must be a nonnegative integer and must be zero when automatic tax is disabled. A larger tax-inclusive total is
  valid; changing the list price or supplying an unrecorded discount is not.
- `lifetime_payment_amounts` records list subtotal, credit, tax and paid total.
  The order's `amount_minor` keeps the actual paid total; purchase analytics use
  the discounted pre-tax revenue and report tax separately. Analytics still requires backend `ready` and active lifetime access,
  and deduplicates by PaymentIntent. Private checkout pages queue the event;
  a normal landing page sends it after analytics consent.

## Annual upgrade

For an individual, single-seat Stripe annual subscription, the backend checks
the stored account/customer mapping against fresh Stripe objects. It verifies
the current annual item, latest paid invoice and actual successful payments.
The credit is:

```text
min(9899, max(0, floor(amount_actually_paid * remaining_seconds / period_seconds)))
```

This implementation automatically handles the configured Starter/Converter Pro
annual USD Prices with one current annual invoice line. A refunded/disputed
invoice, multiple annual subscriptions, a schedule/pending update, mixed invoice
lines, missing payment evidence, or a mismatched customer requires support
review. It never substitutes catalogue price for a missing paid amount. It does
not convert non-USD amounts or automatically migrate Paddle subscriptions.

The authenticated quote endpoint `/api/payments/lifetime-quote` returns the
estimated upgrade price for the pricing card and app checkout. Checkout freezes
the calculation in `lifetime_upgrade_orders`; the UI explains that the final
credit is calculated when checkout starts.

Each credited order has a `duration=once`, USD `amount_off` coupon restricted to
the lifetime Product, with `max_redemptions=1` and `redeem_by`. A single-use
promotion code adds Stripe-enforced customer binding. The server applies it to
the original order/session; no public code entry is enabled. Coupon, promotion
and Checkout creation use stable order-specific idempotency keys. Checkout and
coupon expire within one hour, or at the current annual period end if sooner.
Checkout is deferred for review in the final 30 minutes of an annual period.

A unique active invoice reservation prevents two checkouts from consuming the
same annual period. An abandoned open checkout retains the reservation and the
annual renewal; users restore that order. A subsequent attempt may release the
reservation only after Stripe confirms the old session is expired. A paid
reservation is not reusable, including after a lifetime refund.

Only a signed paid Checkout webhook marks the upgrade paid. After that local
transaction commits, it updates the annual subscription with
`cancel_at_period_end=true`: no immediate cancellation, automatic refund or
new proration. The existing annual period remains available through its end.
`renewal_stopped_at` records success; `renewal_error=provider_retry_required`
records a provider failure. The webhook returns an error on failure so Stripe
retries; duplicate paid events also retry this action until success. Already
canceled/nonrenewing subscriptions are recorded without an extra mutation.
Monitor unresolved paid rows and replay the original paid webhook if retries
are exhausted. Do not manually mark an unresolved row successful.

## Migration and verification

Apply `deploy/hetzner/converter-pro-lifetime.sql` followed by
`deploy/hetzner/converter-pro-lifetime-upgrade.sql` with the intended
`runtime_schema` and `runtime_role`. The API validates both new tables at
PostgreSQL startup. Local SQLite initializes the equivalent schema. Neither
migration should be run against production as part of local test work.

The TEST Price preparation script refuses live credentials before every call.
It may convert an existing TEST Price from unspecified to exclusive tax behavior;
it refuses an inclusive or otherwise mismatched Price. The e2e runner uses a
fresh local SQLite DB, an asserted TEST key, Stripe CLI forwarding (or signed
replay of fetched real TEST objects if the CLI cannot connect), and Playwright
4242 hosted Checkout. It uses the Stripe `pm_card_visa` helper to pay the annual
fixture invoice. All test output and caches must be explicitly routed to E:.

```powershell
node scripts/stripe-lifetime-test-price.mjs --env-file=services/api/.env.local --output="E:/path/to/job/test-price.env"
$env:TEMP="E:/path/to/job/tmp"
$env:TMP=$env:TEMP
$env:PLAYWRIGHT_BROWSERS_PATH="E:/path/to/job/browsers"
node --import tsx scripts/stripe-lifetime-e2e.mjs --job-dir="E:/path/to/job"
```

The e2e script must not be run against a live key or a production database.
Its analytics collector intercepts external GA/Clarity requests. Test IDs and
emails in its result/report files are masked. Raw local database rows remain
private test artifacts, never repository files. Test subscriptions are set not
to renew after successful upgrades; no live objects are created or changed.

Stripe reference: [Checkout Session amounts](https://docs.stripe.com/api/checkout/sessions/object),
[coupons](https://docs.stripe.com/api/coupons/create),
[customer-restricted promotion codes](https://docs.stripe.com/api/promotion_codes/create),
[stop subscription renewal](https://docs.stripe.com/api/subscriptions/update).
