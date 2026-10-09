# P5 — One Score Pass upsell, CN payment split, free-copy clarity

## CTA hierarchy after a free OMR preview

Component: `apps/app/src/components/OneScorePassUpsell.tsx` (copy: `apps/app/src/lib/one-score-upsell-copy.ts`).

1. **Primary** — One Score Pass US$2.99 (`single-score`, Stripe, one-time). Starts
   `/api/payments/checkout/authenticated` directly (bearer token, Idempotency-Key), fires
   `begin_checkout` right before redirect.
2. **Secondary** — subscription plans → `/checkout?next=…` (Starter monthly default from P4).
3. **zh-CN / zh-TW only** — separate tertiary "已有激活码？去兑换 / 已有啟用碼？前往兌換" → `/activate?next=…`.
   Other locales do not show activation in this upsell (international card payment stays primary).
4. If `NEXT_PUBLIC_CHECKOUT_AVAILABLE !== "true"`, only an honestly labelled activation-code CTA is shown.

Surfaces: `TrialScorePreview` (banner), `ScoreCandidateReviewWorkspace` (free editing banner),
`ScoreLibraryManager` (no-credit state after preflight; draft is saved before checkout), and the
app `/checkout` page (`AppCheckoutClient`) gets the separate zh activation link under the card form.

## upgrade_click sources

| source | plan_type |
| --- | --- |
| `trial_score_preview_one_score` / `_subscription` / `_activation_code` | one_score / subscription / activation_code |
| `free_omr_review_one_score` / `_subscription` / `_activation_code` | same |
| `score_import_one_score` / `score_import_subscription` / `score_import_activation_code` | same (replaces bare `score_import`) |
| `checkout_activation_code` | activation_code |

Unchanged: `app_header`, `entitlement_gate`, `entitlement_gate_activation`, `score_import_draft_failed`, `score_detail_locked`.
GA4: filter `upgrade_click` by `plan_type`, or by source suffix. The old bare `trial_score_preview` / `score_import` values stop after deploy.

## Free-tier truth used in copy

- `FREE_TRIAL_OMR_JOBS=1`: one lifetime free (simple) recognition project per account.
- `QUOTA_FREE_JOBS_PER_MONTH=25`, `QUOTA_FREE_STORAGE_BYTES=50 MB`.
- After the trial, free users cannot spend monthly credits on new recognition
  (`resolveRecognitionAccess`): new scans need a One Score Pass or an active plan. Monthly credits
  remain for exports/tools.

Copy now says "1 lifetime free scan project · 25 credits / month for exports & tools" and
"new scans need a One Score Pass or plan". SEO URLs, titles, H1s and FAQ/schema answers are unchanged.
