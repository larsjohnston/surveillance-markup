# Stripe Payments & Subscriptions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Per-seat subscriptions for Sid i/o — 14-day no-card app-managed trial, three module-priced plans (AC-only / Camera-only / All "Multifamily"), Stripe-hosted Checkout + Customer Portal, webhook-mirrored entitlement state, and module gating at proxy + server + UI. Billing currency **USD** (customer quotes stay CAD — do not conflate).

**Spec:** `docs/superpowers/specs/2026-06-14-stripe-subscriptions-design.md` (Approved for planning, all open items resolved).

**Architecture:** Stripe Checkout/Portal redirect flows (no Elements). Webhooks are the only writer of the `subscriptions` mirror table (service-role admin client). Entitlement = plan→module map, evaluated server-side; proxy enforces a coarse lockout wall, server routes/RPCs enforce per-module, UI hides/disables. Trial is local-only until conversion.

**Tech stack / repo:** `larsjohnston/spec-writer` — Next.js 16 (App Router, middleware at `src/proxy.ts`), React 19, TS, Tailwind v4, shadcn/ui (Base UI), Supabase ca-central-1 (ref `oxatqehxeogxtsugofxq`), Stripe Node SDK, Vitest. Migrations via `node scripts/db-push.mjs` (reads `SUPABASE_ACCESS_TOKEN` + `SUPABASE_DB_PASSWORD` from gitignored `.env.local` — never on a command line). Admin client `src/lib/supabase/admin.ts`.

**Resolved decisions baked in:** AC plan = `access_control` only; trial grants all modules; Stripe Tax on from day one; full lockout on lapse incl. customer `/p/<token>` links (no `past_due` grace in v1).

---

## Task 0: Owner prerequisites (no code — Lars does these once, test mode first)

The engineer cannot create these. Confirm each before Task 4.

- [ ] **Stripe account** in **test mode**. Record `sk_test_…` (secret key) — owner pastes into `.env.local`, never into chat.
- [ ] **3 Products** (test mode): "Sid i/o — Access Control", "Sid i/o — Cameras", "Sid i/o — Multifamily (All)".
- [ ] **6 Prices** (USD, recurring, **per-seat / per-unit**): each product × {monthly, annual}; annual unit amount = monthly × 12 × 0.85. Record all 6 price IDs (`price_…`).
- [ ] **Customer Portal** (Dashboard → Settings → Billing → Customer portal): enable card update, invoice history, cancel; enable plan switching and add the 3 products' prices to the allowed-products list; turn on proration.
- [ ] **Stripe Tax** (Dashboard → Settings → Tax): enable; set origin address; confirm registrations for collecting (GST/HST + applicable US states). `automatic_tax` will be set in code.
- [ ] **Stripe CLI** installed locally for webhook forwarding during dev (`stripe login`).

> Prod (live keys + new Supabase project + Vercel-registered live webhook) is deferred to launch hardening (Task 9 documents it). Everything below is test mode.

---

## Task 1: Migration `0003_billing.sql` — subscriptions + stripe_events

**Files:** Create `supabase/migrations/0003_billing.sql` (confirm number against the repo's current chain; bump if 0003 is taken).

- [ ] **Step 1: Write the migration.** Must include, in order: table DDL, RLS enable, policies, GRANTs (Supabase grants nothing by default), updated_at touch trigger, and a trial-seed mechanism on tenant creation.

```sql
-- subscriptions: 1:1 with tenant, webhook-written entitlement mirror
create table public.subscriptions (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text check (plan in ('ac','camera','all')),
  billing_interval text check (billing_interval in ('month','year')),
  seats int not null default 1,
  status text not null default 'trialing'
    check (status in ('trialing','active','past_due','canceled','incomplete','unpaid')),
  trial_end timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
-- members may READ their tenant's subscription; NO write policies (service_role bypasses RLS)
create policy subscriptions_select on public.subscriptions
  for select to authenticated
  using (tenant_id in (select public.user_tenant_ids()));   -- reuse the Phase-1 helper
grant select on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;

-- stripe_events: idempotency ledger, service-role only
create table public.stripe_events (
  id text primary key,            -- Stripe event.id
  type text not null,
  received_at timestamptz not null default now(),
  payload jsonb
);
alter table public.stripe_events enable row level security;  -- no policies => invisible to authenticated
grant all on public.stripe_events to service_role;

-- touch updated_at
create or replace function public.touch_subscriptions_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger trg_subscriptions_touch before update on public.subscriptions
  for each row execute function public.touch_subscriptions_updated_at();

-- seed a trialing row whenever a tenant is created
create or replace function public.seed_subscription_for_tenant()
returns trigger language plpgsql security definer as $$
begin
  insert into public.subscriptions (tenant_id, status, trial_end, seats)
  values (new.id, 'trialing', now() + interval '14 days', 1)
  on conflict (tenant_id) do nothing;
  return new;
end $$;
create trigger trg_tenant_seed_subscription after insert on public.tenants
  for each row execute function public.seed_subscription_for_tenant();
```

> Confirm `public.user_tenant_ids()` is the actual Phase-1 RLS helper name; if the project uses an inline `memberships` subquery instead, mirror that exact pattern. Read `0001_tenancy.sql` first.

- [ ] **Step 2: Backfill existing tenants** (any tenants created before this migration have no row). Add to the migration:

```sql
insert into public.subscriptions (tenant_id, status, trial_end, seats)
select t.id, 'trialing', now() + interval '14 days',
       greatest(1, (select count(*) from public.memberships m where m.tenant_id = t.id))
from public.tenants t
on conflict (tenant_id) do nothing;
```

- [ ] **Step 3: Apply** — `node scripts/db-push.mjs` (loads creds from `.env.local`).
- [ ] **Step 4: Verify** in Supabase SQL editor: both tables exist; `subscriptions` has one row per tenant with `status='trialing'`; `grant`s present (`\dp public.subscriptions`); `stripe_events` returns nothing to an anon/authenticated query.
- [ ] **Step 5: Commit** — `feat(billing): subscriptions + stripe_events tables, RLS, grants, trial seed`.

---

## Task 2: Billing core lib — plan/price maps + entitlement (TDD)

**Files:** Create `src/lib/billing/plans.ts`, `src/lib/billing/entitlements.ts`, `src/lib/billing/entitlements.test.ts`.

- [ ] **Step 1: `plans.ts` — price maps.**

```ts
export type Plan = 'ac' | 'camera' | 'all';
export type Interval = 'month' | 'year';
export type Module =
  | 'cameras' | 'access_control' | 'door_hardware' | 'smart_apartment'
  | 'intercom' | 'parcel' | 'mailbox' | 'iot' | 'elevator';

export const MODULES_BY_PLAN: Record<Plan, Module[]> = {
  camera: ['cameras'],
  ac:     ['access_control'],                       // AC-only = access control only
  all:    ['cameras','access_control','door_hardware','smart_apartment',
           'intercom','parcel','mailbox','iot','elevator'],
};

// (plan,interval) -> Stripe price id, from env (test ids now, live ids at launch)
export const PRICE_IDS: Record<Plan, Record<Interval, string>> = {
  ac:     { month: env('STRIPE_PRICE_AC_MONTH'),     year: env('STRIPE_PRICE_AC_YEAR') },
  camera: { month: env('STRIPE_PRICE_CAMERA_MONTH'), year: env('STRIPE_PRICE_CAMERA_YEAR') },
  all:    { month: env('STRIPE_PRICE_ALL_MONTH'),    year: env('STRIPE_PRICE_ALL_YEAR') },
};
function env(k: string){ const v = process.env[k]; if(!v) throw new Error(`Missing ${k}`); return v; }

// reverse map: price id -> {plan, interval}, for webhook ingestion
export function planForPrice(priceId: string): { plan: Plan; interval: Interval } | null {
  for (const plan of Object.keys(PRICE_IDS) as Plan[])
    for (const interval of ['month','year'] as Interval[])
      if (PRICE_IDS[plan][interval] === priceId) return { plan, interval };
  return null;
}
```

- [ ] **Step 2: `entitlements.test.ts` (failing first).** Cover: trialing (not expired) → all modules; trialing with `trial_end` in the past → none (locked); active+plan='ac' → `['access_control']`; active+plan='all' → all; `past_due`/`canceled`/`unpaid`/`incomplete` → none + `locked=true`; `isModuleEntitled` true/false cases.
- [ ] **Step 3: `entitlements.ts`.**

```ts
import { MODULES_BY_PLAN, type Module, type Plan } from './plans';

export interface SubRow {
  status: 'trialing'|'active'|'past_due'|'canceled'|'incomplete'|'unpaid';
  plan: Plan | null;
  trial_end: string | null;
}
export interface Entitlement { locked: boolean; modules: Module[]; effectiveStatus: string; }

export function computeEntitlement(sub: SubRow | null, now = new Date()): Entitlement {
  if (!sub) return { locked: true, modules: [], effectiveStatus: 'none' };
  const expired = sub.status === 'trialing' && sub.trial_end != null && new Date(sub.trial_end) < now;
  const eff = expired ? 'expired' : sub.status;
  if (eff === 'trialing') return { locked: false, modules: allModules(), effectiveStatus: eff };
  if (eff === 'active')   return { locked: false, modules: sub.plan ? MODULES_BY_PLAN[sub.plan] : [], effectiveStatus: eff };
  return { locked: true, modules: [], effectiveStatus: eff };
}
export function isModuleEntitled(e: Entitlement, m: Module){ return !e.locked && e.modules.includes(m); }
function allModules(): Module[] {
  return Array.from(new Set(Object.values(MODULES_BY_PLAN).flat()));
}
```

- [ ] **Step 4: Run** `npm run test` → green. **Commit** — `feat(billing): plan/price maps + entitlement engine (TDD)`.

---

## Task 3: Entitlement loaders — server + proxy

**Files:** `src/lib/billing/load.ts`; edit `src/proxy.ts`.

- [ ] **Step 1: `load.ts`** — `getSubscription(tenantId)` reads the `subscriptions` row (RLS-scoped server client is fine for reads; admin client also acceptable). `getEntitlement(tenantId)` = `computeEntitlement(await getSubscription(...))`. Add `requireModule(tenantId, module)` that throws a 403-style error if `!isModuleEntitled`.
- [ ] **Step 2: Proxy lockout wall in `src/proxy.ts`.** After the existing auth/session resolution and tenant lookup: load entitlement; if `locked`, and the request path is an app/proposal route (NOT `/billing`, `/api/stripe/webhook`, `/auth/*`, static assets), redirect to `/billing`. The public proposal route `/p/[token]` is included in the lockout per decision 7 (return its own "proposal unavailable" response or redirect to a static notice — confirm UX with a minimal page).

```ts
// inside src/proxy.ts, after tenant + session known:
const ent = await getEntitlement(tenantId);
const path = req.nextUrl.pathname;
const allow = path.startsWith('/billing') || path.startsWith('/api/stripe/webhook')
           || path.startsWith('/auth') || path.startsWith('/_next') || path === '/favicon.ico';
if (ent.locked && !allow) {
  if (path.startsWith('/p/')) return NextResponse.rewrite(new URL('/proposal-unavailable', req.url));
  return NextResponse.redirect(new URL('/billing', req.url));
}
```

> The proxy is convenience, not security. Real enforcement is Task 3 Step 3.

- [ ] **Step 3: Server-route guards.** In every existing server action / route handler / RPC that reads or mutates a gated module's data, call `requireModule(tenantId, <module>)`. Inventory these first (grep the module names / table names) and list them in the commit body so coverage is auditable. Cost-price isolation stays as-is.
- [ ] **Step 4: Commit** — `feat(billing): entitlement loaders + proxy lockout wall + server module guards`.

---

## Task 4: Stripe server client + webhook endpoint

**Files:** `src/lib/billing/stripe.ts`, `src/app/api/stripe/webhook/route.ts`. Add `stripe` dep.

- [ ] **Step 1:** `npm install stripe`. Add to `.env.local.example`: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, the 6 `STRIPE_PRICE_*`, optional `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. Owner fills real values in `.env.local`.
- [ ] **Step 2: `stripe.ts`** — `export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: <pinned> })`. Server-only module.
- [ ] **Step 3: Webhook route** — raw body, signature verify, idempotency, handler switch. Uses `src/lib/supabase/admin.ts` for all writes.

```ts
export const runtime = 'nodejs';            // need raw body
export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature')!;
  const raw = await req.text();
  let event: Stripe.Event;
  try { event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET!); }
  catch { return new Response('bad signature', { status: 400 }); }

  // idempotency: first-writer wins
  const ins = await admin.from('stripe_events')
    .insert({ id: event.id, type: event.type, payload: event as any });
  if (ins.error) return new Response('ok (dup)', { status: 200 }); // PK conflict => already handled

  switch (event.type) {
    case 'checkout.session.completed': { /* link customer+subscription via client_reference_id */ break; }
    case 'customer.subscription.created':
    case 'customer.subscription.updated': { /* upsert plan(reverse map), interval, status, seats(qty),
                                              current_period_end, cancel_at_period_end, trial_end */ break; }
    case 'customer.subscription.deleted': { /* status='canceled' */ break; }
    case 'invoice.paid':            { /* status='active', refresh current_period_end */ break; }
    case 'invoice.payment_failed':  { /* status='past_due' */ break; }
  }
  return new Response('ok', { status: 200 });
}
```

Tenant matching: `checkout.session.completed` carries `client_reference_id` / `metadata.tenant_id` (set at session creation, Task 5). Subscription events match by `stripe_customer_id` → tenant. Plan derived via `planForPrice(item.price.id)`. Seats = subscription item `quantity`.

- [ ] **Step 4: Local verify** — `stripe listen --forward-to localhost:3000/api/stripe/webhook` (prints dev `whsec_…` → put in `.env.local`). `stripe trigger checkout.session.completed` etc.; confirm rows update and a re-sent event id is a no-op (idempotent).
- [ ] **Step 5: Commit** — `feat(billing): stripe client + signed idempotent webhook endpoint`.

---

## Task 5: `/billing` page — subscribe (Checkout) + manage (Portal)

**Files:** `src/app/(app)/billing/page.tsx`, `src/app/(app)/billing/actions.ts`. Owner-Admin only.

- [ ] **Step 1: Role gate** — page + actions check the caller is Owner-Admin (reuse Phase-1 role helper); Estimator/Salesperson get a "contact your admin" view, no Stripe actions.
- [ ] **Step 2: `actions.ts`:**
  - `createCheckout(plan, interval)` — ensure Stripe Customer (admin client; store `stripe_customer_id` on the row if absent), then `stripe.checkout.sessions.create({ mode:'subscription', line_items:[{ price: PRICE_IDS[plan][interval], quantity: <member count> }], client_reference_id: tenantId, metadata:{ tenant_id: tenantId }, customer, automatic_tax:{ enabled:true }, customer_update:{ address:'auto' }, success_url, cancel_url })`. Return `session.url`; redirect.
  - `openPortal()` — `stripe.billingPortal.sessions.create({ customer, return_url:'/billing' })`; redirect.
- [ ] **Step 3: `page.tsx`** — render from the entitlement + subscription row:
  - Trialing → countdown to `trial_end`, plan picker (3 tiers) + Monthly/Annual toggle, "Subscribe" (calls `createCheckout`).
  - Active → current plan/interval/seats/next-renewal, "Manage billing" (Portal), interval/plan-switch routed through Portal.
  - Locked (expired/past_due/canceled/unpaid) → prominent lapse banner + Subscribe/Manage. This is the only reachable app page when locked.
  - shadcn/Base UI components; navy/blue/grey, no red.
- [ ] **Step 4: Verify** test-mode end-to-end: trial → Subscribe → Stripe Checkout (4242 card) → redirect back → webhook flips `status='active'`, `plan`, `seats` → modules unlock. Then Portal → cancel → webhook → lockout wall sends all routes to `/billing`.
- [ ] **Step 5: Commit** — `feat(billing): /billing subscribe (Checkout) + manage (Portal)`.

---

## Task 6: Seat auto-sync + invite cost confirmation

**Files:** edit the membership add/remove server actions; edit the invite UI.

- [ ] **Step 1: On member add/remove** — recompute authoritative member count. If the tenant has a `stripe_subscription_id` (post-conversion), set the subscription item to the **absolute** quantity (`stripe.subscriptions.update` / item update, proration default). If pre-conversion (trial), just write `subscriptions.seats` locally. The `customer.subscription.updated` webhook reconciles `seats` back — set quantity, let the webhook be the source of truth.
- [ ] **Step 2: Invite UI (Owner-Admin)** — before confirming an invite, show projected monthly delta ("adds ~$X/mo at your current plan"). Compute from the active price unit amount × 1 (display only; Stripe is authoritative).
- [ ] **Step 3: Verify** — add a member on an active sub → Stripe item quantity increments, `seats` reconciles via webhook; remove → decrements. Trial tenant → only local `seats` changes, no Stripe call.
- [ ] **Step 4: Commit** — `feat(billing): seat auto-sync to Stripe quantity + invite cost confirmation`.

---

## Task 7: UI module gating

**Files:** app shell / nav + each module entry point.

- [ ] **Step 1:** Server passes `entitlement.modules` + `effectiveStatus` to the client shell. Hide/disable nav entries and module entry points not in the set; show an "Upgrade to unlock" affordance linking to `/billing`. Cosmetic only — server guards (Task 3) remain the gate.
- [ ] **Step 2: Verify** — as `plan='ac'`, only Access Control is visible/usable; cameras etc. are hidden and their server routes 403 if hit directly. As `plan='all'`, everything visible. Trial → everything visible.
- [ ] **Step 3: Commit** — `feat(billing): UI module gating + upgrade prompts`.

---

## Task 8: `/proposal-unavailable` notice + lockout polish

**Files:** `src/app/proposal-unavailable/page.tsx`.

- [ ] **Step 1:** Minimal static page shown when a locked tenant's `/p/[token]` link is hit (no tenant/account details leaked; generic "this proposal is temporarily unavailable" + integrator contact if available). Wired from the proxy rewrite in Task 3.
- [ ] **Step 2: Commit** — `feat(billing): proposal-unavailable notice for locked customer links`.

---

## Task 9: Docs + prod cutover checklist (no prod build yet)

**Files:** `docs/billing-setup.md`, `.env.local.example` (final), README billing section.

- [ ] **Step 1:** Document the Dashboard setup (products/prices/portal/tax), the 6 price-id env names, the webhook endpoint registration, and the Stripe CLI dev loop.
- [ ] **Step 2: Prod cutover checklist** (deferred, not executed now): new Supabase prod project; live Stripe keys; live products/prices (new ids → prod env); register the Vercel webhook URL in Stripe live mode → new `whsec_…`; promote migrations via `db-push.mjs` against prod; smoke-test trial→subscribe in live mode with a real card.
- [ ] **Step 3: Commit** — `docs(billing): setup guide + prod cutover checklist`.

---

## Task 10: Full test-mode acceptance pass

- [ ] New tenant → trialing, all modules, 14-day countdown.
- [ ] Force `trial_end` into the past → next request locks → only `/billing` reachable; `/p/<token>` shows the unavailable notice.
- [ ] Subscribe (each of the 3 plans, both intervals) → Checkout → webhook → active → correct module set unlocked; Stripe Tax line present.
- [ ] Add/remove member on an active sub → quantity + `seats` reconcile.
- [ ] Portal: switch plan, switch interval, update card, cancel → each webhook rewrites the row correctly.
- [ ] `invoice.payment_failed` (trigger) → `past_due` → locked; `invoice.paid` → `active` → unlocked.
- [ ] Re-send any webhook event id → no-op (idempotent ledger).
- [ ] Estimator/Salesperson cannot reach billing actions; Owner-Admin can.
- [ ] `npm run test` green; RLS/grants verified (`subscriptions` member-readable, `stripe_events` invisible).
