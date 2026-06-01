# Pass: Security Quote ↔ Door Hardware Wizard parity

*Slots after the current polish branch (PR #11) ships, before **Pricing Vendor Expansion**.*

## Context

SQ and DHW share `.dhw-*` chrome (stepper, modal box, nav) but visually still read as different tools — different palettes, different control affordances, different default Summary columns, different controls available on Summary. Users round-trip between the two during a quote build; the visual disconnect costs trust + reads as bugs.

Goal: every shared surface (header strip, stepper, step containers, controls strip, tables, totals, buttons) reads identically across both wizards. Functions that exist on DHW Summary and don't on SQ get ported.

## What this pass adds

1. **Audit + reconcile every shared `.dhw-*` chrome surface** across both wizards (header, stepper, modal box, content host, nav row, supply-only toggle, persistent X + Export CSV).
2. **Palette + typography parity** — every text colour, border colour, header background, accent on chips/badges/buttons identical between SQ + DHW. Reuse existing CSS vars; no new tokens.
3. **Controls parity** — the section-rule pills, default-rule strip, supply-only toggle, tax row, column-hide toggle, footer subtotal styling should all use the same components in both wizards.
4. **Column-hide toggle** — port DHW Summary's column-visibility toggle to SQ Summary. (DHW currently lets the user show/hide individual Summary columns; SQ Summary shows all 11 by default with no toggle.)
5. **Default column visibility + order** (both Summary tables):
   - **Visible by default**: Qty, SKU, Extended HW, Extended Labour, Total, GM%.
   - **Hidden by default**: List, Cost, Sell, Description, Margin $, any other detail columns that exist today.
   - **Column order** (left → right): Qty · SKU · Extended HW · Extended Labour · Total · GM%.
   - Column-hide toggle lets the user reveal hidden columns.

## What this pass does NOT add

- No M5 persistence work. Column-visibility state is in-memory this pass; M5 picks up the new save shape alongside everything else.
- No new feature beyond visual parity + column toggle. (No new pricing rules, no new export formats.)
- No DHW wizard logic changes — only its visual decisions get ported INTO SQ where SQ diverges.
- No mobile / responsive-layout work.

## Recon points (recon-gate the implementation)

1. **Header strip diff**: SQ uses `SECURITY QUOTE` left + green Export CSV right + X. DHW uses what? Confirm exact title styling, button placement, border-bottom, padding.
2. **Stepper styling**: both use `.dhw-stepper`. Confirm whether SQ adds any per-step overrides (active dot color, label weight) that diverge from DHW. Quote both rule sets.
3. **Step-content padding/margin**: confirm `.dhw-step-content` is used identically in both wizards.
4. **Nav row**: Back/Next button styling — confirm `.dhw-wizard-nav` covers both; quote any SQ-side overrides.
5. **Table chrome**: row striping, header bar color, subtotal row treatment, grand subtotal styling — quote DHW Summary's table CSS and SQ Materials/Labour/Summary table CSS. Identify every divergence.
6. **Pill styling**: SQ uses `.sq-rule-pill` (Markup/Discount) + section toggle (Flat/Hourly). DHW uses what for its analog (markup pills, supplier chips, etc.)? Confirm one canonical pill class covers both, or note where they intentionally differ.
7. **Tax row** (SQ only): editable Tax label + Tax %. DHW has no tax row — confirm whether DHW should gain one or whether tax is intentionally SQ-only. Recommend: tax stays SQ-only (DHW is hardware-only, no tax math).
8. **Column-hide toggle on DHW Summary**: locate the component (likely a toggle list / dropdown above the table). Quote the markup, the state shape, and the show/hide CSS mechanism.
9. **Existing SQ Summary 11-col table**: confirm current column order; map each to the new visible-by-default set.
10. **Save shape**: identify where DHW's column-visibility state is persisted (if at all). Confirm SQ's M5 persistence target for the new state.

## Open questions (recommendations included)

- **Column-hide UI placement**: dropdown next to the column header, gear icon in the Summary step header strip, or a top-of-table chip row? → **Recommend: gear icon in the Summary step's controls strip**, opening a small popover with a checkbox list of all columns. Matches DHW's pattern (assuming it does that — recon confirms).
- **Default column visibility scope**: does "default" mean (a) project-fresh defaults, or (b) reset-to-default action? → **Recommend both** — defaults on first-render of a new project, plus a "Reset columns" affordance in the column-toggle popover.
- **Column-hide state — persist or session-only?** → **Recommend session-only this pass, persist in M5.** Adding a save-shape field for column visibility now creates an M5 migration to absorb; deferring to M5 keeps current PR scope tight.
- **Column-hide on SQ Materials + Labour tables, or Summary only?** → **Recommend Summary only this pass.** Materials + Labour are working views where every column is information-dense by design. Summary is the reportable artifact where visual focus matters.
- **What "Total" means in the default visible set** — Combined Sell, or pre-tax Sub-Total? → **Recommend Combined Sell** (per-row total). Sub-Total + Tax + Grand Total still render in the totals block below, untouched.
- **What "Extended HW" + "Extended Labour" mean** — Combined Sell or Combined Cost? → **Recommend Sell** (these are user-facing customer columns). The Cost columns stay hidden by default but available via the toggle.

## Acceptance criteria

- SQ + DHW headers, steppers, step containers, nav rows, table chrome, pill styling, supply-only toggles all visually indistinguishable at the same step (Materials / Labour / Summary).
- SQ Summary's column-hide toggle present + functional; matches DHW's mechanism.
- Fresh project on first SQ → Summary render shows exactly: Qty · SKU · Extended HW · Extended Labour · Total · GM% — in that order, nothing else.
- Hiding/showing columns via the toggle works on both wizards independently.
- Existing pricing math + labour math + tax math unchanged.
- Save round-trip on a default-columns project loads with default columns (session-only behaviour OK this pass).
- `node --check` passes.

## Notes / open follow-ups

- M5 persistence absorbs the new column-visibility state (one new field per wizard in the save shape).
- If DHW Summary lacks a column-hide today (recon flag), this pass becomes "ADD column-hide to BOTH" rather than "PORT from DHW". Recon confirms which.
- Visual-parity audit may surface DHW-side rules that should change too (e.g. DHW uses an outdated colour token). Flag at recon — minor DHW fixes go in this pass; bigger DHW rework spawns its own follow-up.
