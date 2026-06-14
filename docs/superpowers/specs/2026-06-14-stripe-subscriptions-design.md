# Sid i/o — Stripe Payments & Subscriptions — Design Spec

- **Date:** 2026-06-14
- **Status:** Approved for planning (all open items resolved 2026-06-14)
- **Repo (implementation):** `larsjohnston/spec-writer` — Next.js 16 (App Router, src/proxy.ts), React 19, TS, Tailwind v4, shadcn/ui (Base UI), Supabase ca-central-1 (ref `oxatqehxeogxtsugofxq`). Product "Sid i/o", `sidio.ca`, Vercel `spec-writer-ten.vercel.app`.
- **Inputs:** SaaS platform design spec (`docs/superpowers/specs/2026-06-11-saas-platform-design.md`) + commercialization audit + owner's eight billing decisions (2026-06-13/14).
- **Pending task this closes:** "P3-4: Module entitlements + Stripe scaffold."
- **Note on environment:** this spec lives in the surveillance-markup planning-docs repo; the code it describes is implemented in the separate `spec-writer` repo. No code is written by this spec.

## 1. Goal

Add per-seat monthly/annual subscriptions to Sid i/o: a 14-day no-card trial, three module-priced plans (AC-only / Camera-only / All "Multifamily"), Stripe-hosted Checkout + Customer Portal, webhook-mirrored entitlement state in Postgres, and module/feature gating enforced at the proxy, server, and UI layers. Billing currency is **USD** (distinct from customer QUOTES, which stay CAD — do not conflate).

## 2. Locked decisions (owner)

| # | Topic | Decision |
|---|-------|----------|
| 1 | Integration surface | **Stripe Checkout + Customer Portal.** Webhooks are the source of truth. Build only "Subscribe" / "Manage billing" buttons. |
| 2 | Entitlement model | **3 mutually-exclusive plan tiers** (`ac` / `camera` / `all`), one per-seat Price each. Modules **derived** from plan. DB row mirrors Stripe, written **only** by webhooks (service-role). Gate at **proxy + server route/RPC + UI**. |
| 3 | Webhooks | Single signed endpoint, event-type switch, idempotency table keyed on `event.id`. Events: `checkout.session.completed`, `customer.subscription.created/updated/deleted`, `invoice.paid`, `invoice.payment_failed`. **Test mode first.** |
| 4 | Trial | **14-day no-card trial, app-managed.** No Stripe object exists until conversion: `subscriptions.status='trialing'` + `trial_end` set locally at tenant creation. Checkout creates the Stripe customer + subscription only when a card is added. |
| 5 | Annual discount | **Separate annual Prices at −15%** (one per plan tier, `interval=year`). Monthly/Annual toggle in the subscribe UI. |
| 6 | Seats | **Auto-sync** subscription `quantity = tenant member count`. Pre-conversion: local only. Post-conversion: server sets absolute quantity on member add/remove (proration). Invite UI shows a "this adds ~$X/mo" confirmation. |
| 7 | Lapse/cancel gating | **Full lockout** whenever status ∉ {trialing, active}: only `/billing` is reachable; projects, proposals, and customer `/p/<token>` links are unavailable until resolved. |
| 8 | Dev/prod split | **Separate dev + prod** Supabase projects + Stripe test/live keys; per-env webhook endpoints; migrations promoted dev→prod via `node scripts/db-push.mjs`. |

## 3. Data model (delta over Phase-1 tenancy schema)

Two new tables. Both require explicit GRANTs (Supabase grants nothing by default — this has bitten the project before).

### `public.subscriptions` (1:1 with tenant; the entitlement source of truth)

| Column | Type | Notes |
|--------|------|-------|
| `tenant_id` | uuid PK | `references tenants(id) on delete cascade` |
| `stripe_customer_id` | text null | null during trial |
| `stripe_subscription_id` | text null | null during trial |
| `plan` | text null | `check in ('ac','camera','all')`; null during trial |
| `billing_interval` | text null | `check in ('month','year')`; null during trial |
| `seats` | int not null default 1 | mirrors Stripe item quantity post-conversion |
| `status` | text not null default 'trialing' | `trialing\|active\|past_due\|canceled\|incomplete\|unpaid` |
| `trial_end` | timestamptz null | app-managed trial expiry |
| `current_period_end` | timestamptz null | from Stripe |
| `cancel_at_period_end` | boolean not null default false | from Stripe |
| `updated_at` | timestamptz not null default now() | touch trigger |

- **RLS:** `SELECT` for tenant members (`tenant_id in (select public.user_tenant_ids())`); **no** authenticated insert/update/delete policies — all writes go through the service-role admin client, which bypasses RLS.
- **Grants:** `grant select on public.subscriptions to authenticated; grant all on public.subscriptions to service_role;`
- A row is created at tenant creation (extend the `create_tenant` rpc, or a trigger on `tenants insert`) with `status='trialing'`, `trial_end = now() + interval '14 days'`, `seats = 1`.

### `public.stripe_events` (idempotency ledger; service-role only)

| Column | Type | Notes |
|--------|------|-------|
| `id` | text PK | Stripe `event.id` |
| `type` | text not null | event type |
| `received_at` | timestamptz not null default now() | |
| `payload` | jsonb null | optional, for replay/debug |

- **RLS:** enabled, **no policies** for authenticated → invisible to clients.
- **Grants:** `grant all on public.stripe_events to service_role;` (none to authenticated).

Migration file: `supabase/migrations/0003_billing.sql` (number per the spec-writer repo's current chain). Apply with `node scripts/db-push.mjs` (reads `SUPABASE_ACCESS_TOKEN` + `SUPABASE_DB_PASSWORD` from `.env.local`; never on a command line).

## 4. Plan → module entitlement map

A code constant (e.g. `src/lib/billing/entitlements.ts`), the single source of truth for what each plan unlocks:

```
MODULES_BY_PLAN = {
  camera: ['cameras'],
  ac:     ['access_control'],                             // AC-only = access control, nothing else
  all:    ['cameras', 'access_control', 'door_hardware',
           'smart_apartment', 'intercom', 'parcel', 'mailbox', 'iot', 'elevator'],
}
```

- **During trial:** grant **all** modules (best evaluation experience) — confirmed.
- **Effective status (lazy trial expiry, no cron needed):**
  `effective = (status === 'trialing' && trial_end < now()) ? 'expired' : status`.
  Entitled iff `effective ∈ {trialing, active}`. Otherwise → full lockout.
- **Entitled modules:** trialing → all; active → `MODULES_BY_PLAN[plan]`; anything else → none.

## 5. Enforcement (three layers)

1. **Proxy — `src/proxy.ts` (coarse gate / lockout wall).** After auth resolves the tenant, load `subscriptions` (status + trial_end). If not entitled, redirect every app route except `/billing` (and `/api/stripe/webhook`, `/auth/*`) to `/billing`. This is the full-lockout wall; it also covers the public `/p/<token>` proposal routes (per decision 7).
2. **Server (authoritative).** A `getEntitlement()` / `requireModule(module)` helper used in every data route, server action, and RPC that touches a gated module. Returns 403 / throws if the module isn't in the entitled set. This is the real gate — the proxy is convenience, not security. Cost-price isolation is already server-side and unchanged.
3. **UI.** Server passes the entitled-module set + status to the client; ungated modules are hidden/disabled with an upgrade prompt. UI gating is cosmetic only.

## 6. Subscribe / convert flow (no-card trial → paid)

1. New tenant → `subscriptions` row `trialing`, `trial_end = +14d`, full module access, no Stripe ids.
2. `/billing` page (Owner-Admin only) shows trial countdown + plan picker (3 tiers × Monthly/Annual toggle) + "Subscribe".
3. "Subscribe" → server action: ensure a Stripe **Customer** (admin client; store `stripe_customer_id`), then create a **Checkout Session** `mode=subscription`, line item = the chosen `(plan, interval)` Price, `quantity = current member count`, `client_reference_id = tenant_id` (also `metadata.tenant_id`), `automatic_tax` on, `success_url`/`cancel_url` back to `/billing`. Return `session.url`; redirect. (Server-created session → no publishable key needed client-side; `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` only if Elements is added later.)
4. Customer pays in Stripe-hosted Checkout. No Stripe trial is set (the 14 days were consumed app-side).
5. Webhooks (`checkout.session.completed` + `customer.subscription.created`) write `stripe_subscription_id`, `plan`, `billing_interval`, `status`, `current_period_end`, `seats` (quantity) onto the tenant's `subscriptions` row, matched by `client_reference_id`/`metadata.tenant_id`.

## 7. Manage / change flow (Customer Portal)

- "Manage billing" → server creates a **Billing Portal session** (admin client, `return_url=/billing`) → redirect.
- Portal (configured in the Stripe Dashboard) allows: switch among the 3 plan tiers, switch interval, update card, view invoices, cancel.
- All portal changes return via `customer.subscription.updated` (and `.deleted`) webhooks, which rewrite the `subscriptions` row. The app never trusts the redirect — only the webhook.

## 8. Seat auto-sync

- **Pre-conversion (trialing, no Stripe sub):** member add/remove updates `subscriptions.seats` locally only.
- **Post-conversion:** on member add/remove the server sets the subscription item to an **absolute** quantity = authoritative member count (not increment — avoids drift), proration default. `customer.subscription.updated` webhook reconciles `seats` back. Only Owner-Admin can invite; the invite UI shows the projected monthly delta before confirming.

## 9. Webhook handler

- Route: `src/app/api/stripe/webhook/route.ts` — raw body, verify signature with `STRIPE_WEBHOOK_SECRET`. On bad signature → 400.
- **Idempotency:** `insert into stripe_events(id,type,...)`; on unique-violation → 200 and skip (already processed).
- **Handlers** (all writes via `src/lib/supabase/admin.ts` service-role client; respond 200 after handling):
  - `checkout.session.completed` → link `stripe_customer_id`/`stripe_subscription_id` to the tenant via `client_reference_id`/`metadata.tenant_id`.
  - `customer.subscription.created` / `.updated` → upsert `plan` (reverse price→plan map), `billing_interval`, `status`, `seats` (item quantity), `current_period_end`, `cancel_at_period_end`.
  - `customer.subscription.deleted` → `status='canceled'`.
  - `invoice.paid` → `status='active'`, refresh `current_period_end`.
  - `invoice.payment_failed` → `status='past_due'`.
- **Local dev:** `stripe listen --forward-to localhost:3000/api/stripe/webhook` (Stripe CLI) → prints the dev `whsec_…`.

## 10. Stripe products & prices (created in Dashboard, test mode first)

- 3 Products: "Sid i/o — Access Control", "Sid i/o — Cameras", "Sid i/o — Multifamily (All)".
- 6 Prices (USD, recurring, per-seat): each product × {monthly, annual}; annual = 12×monthly × 0.85.
- Price IDs wired via env (config, not secret): `STRIPE_PRICE_AC_MONTH`, `STRIPE_PRICE_AC_YEAR`, `STRIPE_PRICE_CAMERA_MONTH`, `STRIPE_PRICE_CAMERA_YEAR`, `STRIPE_PRICE_ALL_MONTH`, `STRIPE_PRICE_ALL_YEAR`. A `(plan,interval)→priceId` map + its reverse live in `src/lib/billing/`.
- **Stripe Tax** enabled from day one (GST/HST + US sales tax) via `automatic_tax` on Checkout + subscriptions; collect customer address in Checkout — confirmed.
- Customer Portal configured: allow plan/interval switch among the 3 tiers, card update, invoice history, cancel.

## 11. Secrets & env (server-only, `.env.local`, never committed / never on a command line)

- `STRIPE_SECRET_KEY` — `sk_test_…` now, `sk_live_…` at launch.
- `STRIPE_WEBHOOK_SECRET` — `whsec_…` (per environment).
- `STRIPE_PRICE_*` — the 6 price IDs (config, not secret).
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — optional (only if Elements is added later).
- Owner pastes all keys himself; the agent never types keys into any field and never embeds a secret on a command line. Publishable key may be `NEXT_PUBLIC_`; secret + webhook secret are server-only.

## 12. Dev/prod

- **Dev:** existing Supabase `oxatqehxeogxtsugofxq` + Stripe **test** keys + Stripe CLI forwarding.
- **Prod (at launch):** new Supabase project + Stripe **live** keys + a Vercel-hosted webhook endpoint registered in the Stripe Dashboard (live mode). Migrations promoted dev→prod via `db-push.mjs`. Price IDs differ per Stripe mode → env per environment.

## 13. Roles (unchanged from platform spec §6)

Billing, seats, plan, and Stripe Portal access = **Owner-Admin only**. Estimator / Salesperson see neither billing nor the subscribe/manage surface. Salesperson cost-hiding is the existing server-side isolation and is untouched.

## 14. Non-goals (v1)

À la carte module composition; Stripe Entitlements feature; Elements/embedded card UI; proration-grace on `past_due` (full lockout per decision 7); usage/metered billing; multiple subscriptions per tenant; in-app invoice rendering (Portal handles it); dunning-email customization beyond Stripe defaults.

## 15. Resolved items (owner, 2026-06-14)

1. **AC-only module membership** → `ac` plan unlocks **access control only** (no door-hardware/intercom/smart-apt/elevator/parcel/mailbox). `MODULES_BY_PLAN.ac = ['access_control']`.
2. **Trial access scope** → trial grants **all** modules.
3. **Stripe Tax** → enable `automatic_tax` from **day one** (address collected in Checkout).
4. **Customer-link lockout** → **as recommended**: full lockout per decision 7 darkens live `/p/<token>` links during any lapse (incl. transient `past_due`); a short `past_due` grace is recorded as a future tunable, not built in v1.

## 16. Implementation outline (for the follow-up plan, in the spec-writer repo)

1. Migration `0003_billing.sql` (subscriptions + stripe_events + grants + RLS + trial-seed on tenant create) → `db-push` → verify RLS/grants.
2. `src/lib/billing/` — plan/price maps, `MODULES_BY_PLAN`, `getEntitlement()`, `requireModule()`. Unit-tested (Vitest) including trial-expiry lazy logic.
3. Proxy gate in `src/proxy.ts` (lockout wall).
4. Stripe server client + `/api/stripe/webhook` route (signature + idempotency + handlers).
5. `/billing` page (Owner-Admin): trial countdown, plan picker + Monthly/Annual toggle, Subscribe (Checkout session), Manage billing (Portal session).
6. Seat auto-sync hook on membership add/remove + invite cost confirmation.
7. UI module gating (hide/disable + upgrade prompts).
8. Dashboard setup docs (products/prices/portal/tax) + `.env.local.example` additions.
9. End-to-end test in Stripe test mode: trial → expire → lockout → subscribe (Checkout) → active → portal change → cancel → lockout.
