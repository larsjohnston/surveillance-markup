# SurveillanceMarkup SaaS Platform — Design Spec

- **Date:** 2026-06-11
- **Status:** Draft for owner review
- **Inputs:** Commercialization audit (`docs/commercialization/2026-06-11-audit-postgres-and-saas-roadmap.md`) + owner's answers to the 20 commercialization questions.

## 1. Product definition

A multi-tenant SaaS proposal platform for security integrators: floor-plan markup → auto-spec'd BOM → branded proposal, sold per-seat per-month with module-based plans. Central platform-maintained price books; each tenant layers its own discount structure. Proposals are shared with end customers via tracked web links. Anonymized cross-tenant data builds industry benchmarking (future revenue: e.g., Brivo using quick-quote for its customers).

## 2. Locked decisions (owner's answers)

| # | Decision |
|---|----------|
| 1 | Customers = security integrators (incl. Calgary Lock & Safe). Pool anonymized data for industry-standard recommendations. Brivo OEM opportunity noted. |
| 2 | Monthly per-seat + free trial. **Module-priced plans**: AC-only, Camera-only, full suite. |
| 3 | CAD + USD, Stripe. |
| 4 | Timeline: a few months; owner working full-time on it. |
| 5 | **Central price books** (platform admin updates); tenants apply their own discounts. |
| 6 | Roles: as recommended → Owner/Admin, Estimator, Salesperson (cost visibility gated). |
| 7 | **White-label**: tenant admin uploads branding (logo, colors) used in app + proposals. |
| 8 | Data residency: research said likely yes → **recommendation: host in Canada (§4)**. |
| 9 | Migrate 5 existing projects; store project JSON on the platform; downloadable proposals. |
| 10 | Tenants can export their JSON; platform retains data in the aggregate pool (ToS-covered). |
| 11 | Keep existing tool working; **move to React ASAP** (interpreted from "reach"). |
| 12 | Hosting: per recommendation (§4). |
| 13 | Auth: email+password, Google, Microsoft, Apple sign-in. No 2FA v1. (Owner wrote "apple pay" — interpreted as Sign in with Apple; Apple Pay also arrives free via Stripe Checkout. **Confirm.**) |
| 14 | Online-only v1. |
| 15 | One user per project at a time, v1. |
| 16 | PDF as recommended (server-side) **plus customer-facing proposal links with engagement analytics** (what the customer viewed, when, how long). |
| 17 | Scope: everything (all modules: cameras, AC, smart-apartment, door hardware, riser, storage calc). |
| 18 | Platform admin maintains catalogs/pricing; updates 1–2×/year (needs an Excel→DB import pipeline). |
| 19 | Canada + US (GST/HST + US sales tax handling — Stripe Tax). |
| 20 | Telemetry + error reporting: yes. |

## 3. Architecture

- **Front end:** Next.js (React, TypeScript) on Vercel. The canvas markup engine ports as a React-wrapped canvas component reusing the existing drawing/hit-test logic; pure business logic (BOM compute, `acControllerPlan`, subscription packing, catalogs) extracts to shared TS modules — these are already DOM-free and port cleanly.
- **Backend:** Supabase in **AWS ca-central-1**: Postgres (row-level security per tenant), Auth (email/password + Google + Azure/Microsoft + Apple), Storage (floor-plan PDFs/images, generated proposals). Server logic via Next.js API routes / Supabase Edge Functions.
- **Billing:** Stripe — per-seat subscriptions, module-based products/prices in CAD + USD, free trial, Stripe Tax for GST/HST + US sales tax, Customer Portal for self-serve seat/plan changes. Apple Pay/Google Pay free via Stripe Checkout.
- **PDF:** server-side rendering (headless Chromium on a serverless function rendering the same React proposal view → print CSS), so the proposal web link and the PDF share one template and tenant branding stays server-controlled.
- **Proposal links:** public token URL (`/p/<token>`) rendering a read-only proposal viewer; per-section view events (opened, section viewed, dwell time, downloads) written to an `engagement_events` table; tenant-facing analytics panel.
- **Telemetry:** Sentry (errors) + PostHog (product analytics, also powers proposal engagement if preferred).
- **Cost-price isolation:** browser receives only what the user's role allows. Sell-price derivation happens server-side; the `pricing_items.unit_cost` column never ships to Salesperson sessions. This retires the audit's #1 blocker.

## 4. Data residency (research-backed recommendation)

PIPEDA does **not** strictly require storing data in Canada — it requires accountability, comparable protection, and transparency for cross-border transfers. But: hosting in Canada eliminates the cross-border analysis entirely, sidesteps US CLOUD/Patriot-Act objections in sales conversations, satisfies Quebec Law 25 sensitivities, and an increasing share of Canadian RFPs demand residency outright. US tenants' data living in Canada poses no equivalent problem.

**Recommendation:** primary region **AWS ca-central-1 (Montreal)** for Postgres + Storage (Supabase supports it). Vercel edge/serverless compute may execute outside Canada — keep *persistence* in Canada and disclose processing in the privacy policy; that satisfies PIPEDA accountability. Revisit only if a tenant contract demands full in-Canada processing.

## 5. Data model (delta over the audit inventory)

New tenancy layer above the audited project schema:

- `tenants` (org, branding config JSONB, discount structure JSONB, plan/module entitlements, Stripe customer id)
- `users` + `memberships` (user↔tenant, role: owner_admin | estimator | salesperson)
- `price_books` / `pricing_items` (central; versioned; admin Excel-import pipeline; `unit_cost` server-only)
- `tenant_discounts` (per tenant: per-manufacturer/category discount % off list → their cost)
- `projects` (tenant-scoped; v1 stores the existing **project JSON as a JSONB document** + extracted index columns; floor-plan binaries in Storage) — *normalize into the audit's full table set in a later phase; JSONB-first dramatically shortens time-to-launch and reuses the existing serializer*
- `proposals` (generated snapshots: token, branding used, PDF object ref, status)
- `engagement_events` (proposal_token, event, section, ts, session)
- `aggregate_pool` (anonymized device/spec/pricing facts per ToS for benchmarking)

Existing v10→v34 migration chain becomes the one-time importer for the 5 legacy projects (and any tenant-uploaded legacy JSON).

## 6. Roles

| Capability | Owner/Admin | Estimator | Salesperson |
|---|---|---|---|
| Billing, seats, branding, discounts | ✓ | — | — |
| See cost + margin | ✓ | ✓ | — |
| Edit projects/BOM | ✓ | ✓ | ✓ (sell-only view) |
| Send proposals / view engagement | ✓ | ✓ | ✓ |

## 7. Phased roadmap (~few months, full-time)

1. **Foundation (wks 1–3):** Next.js + Supabase scaffold (ca-central-1), auth (all 4 providers), tenants/roles/RLS, project CRUD storing v34 JSON, Storage upload, import the 5 projects.
2. **Markup port (wks 3–8):** canvas engine into React (drawing/hit-test logic largely as-is), left-pane UI rebuilt in React components, pure-logic modules extracted + unit-tested. The legacy single-file tool stays in use until parity.
3. **Pricing service (wks 6–9):** price-book schema + Excel import, tenant discount structures, role-gated price API, BOM compute server-side parity tests against the legacy outputs.
4. **Proposals (wks 9–12):** unified proposal template (web + print), server PDF, tokenized customer links + engagement events + analytics panel, white-label branding settings.
5. **Commercial layer (wks 12–15):** Stripe products (modules, seats, trial, CAD/USD, Stripe Tax), entitlement gating of modules, Sentry + PostHog, ToS/privacy (incl. aggregate-pool clause), onboarding.
6. **Launch hardening:** load/seed testing, backup/restore, support runbook, beta with Calgary Lock & Safe as tenant #0.

## 8. Non-goals (v1)

Offline mode; concurrent multi-user editing; 2FA; regions beyond CA/US; full normalization of project JSON; native mobile; in-app price-book editing by tenants (discounts only).

## 9. Open items — RESOLVED (owner confirmed 2026-06-11)

1. ~~"apple pay" in Q13~~ → **Sign in with Apple** confirmed.
2. ~~"move to reach asap"~~ → **React** confirmed.
3. Aggregate-pool consent → **standard ToS term** confirmed.
4. Product name → shortlist delivered (PlanQuote, SiteQuote, QuoteCanvas, SpecDraft, SpecWise, PlanPilot); owner to pick. Trademark (CIPO/USPTO) + domain clearance required before committing. Does not block Phase 1.
