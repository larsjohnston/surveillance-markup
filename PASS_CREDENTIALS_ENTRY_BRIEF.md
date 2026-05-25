# Pass: Credentials entry (placeholder) — first slice of the materials manual-entry surface

## Context

The tool can only represent items you place on a floor plan; non-placed items (credentials,
services, subscriptions, overhead-door kits) have no user-facing entry. Credentials today are a
single auto-derived row (`auto-ac-credentials`, qty = reader count × `CREDENTIAL_MULTIPLIER`),
with no way to enter fob/card/mobile-pass counts.

This pass adds the FIRST user-facing manual-entry surface, scoped to credentials, with **placeholder
types and quantities only** (no catalogue/SKU/pricing yet). It is deliberately a thin slice of the
larger "materials model" pass (data-driven section assignment + catalogue + pricing) — so the data
structure here MUST anticipate that later work and not be throwaway.

**Dependency:** ships AFTER `bom-restructure-v2` lands on main, because entered credentials route to
**2.1 Access Control**, which that pass defines. Branch off main only after the restructure merges.

---

## What it adds

### 1. New AC level-2 tile: "Credentials" (fob icon)
- Add a `.tier2-tile` to the AC level-2 tile row (where `lpPickAcCategory(...)` tiles live).
- **Behaves differently from the existing category tiles:** the existing AC tiles arm floor-plan
  placement (`lpPickAcCategory`). Credentials does NOT place anything on the plan — clicking it
  drills into tier-3 sub-tiles (below). Wire a new handler (e.g. `lpOpenCredentials()`), NOT
  `lpPickAcCategory`.
- Icon: an inline 24×24 stroke SVG of a key/fob, matching the existing flat-icon set
  (`viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"`). Grep the current
  icon set and match style/weight.

### 2. Tier-3 placeholder tiles (drill-in)
- Clicking "Credentials" shows three sub-tiles: **Fobs**, **Cards**, **Mobile Passes**, plus a way
  back to the AC category row. (Match whatever nested-tile / back-affordance pattern already exists
  in the tool; if none exists, use a drill-in panel with a back tile. Verify current pattern on main.)
- These are PLACEHOLDER tiles — no SKU, no catalogue binding yet. Labels are literal.

### 3. Quantity-entry modal
- Clicking a tier-3 tile (Fobs / Cards / Mobile Passes) opens a `.modal-box` modal with:
  - a single `.modal-row input[type=number]` (prefilled with the current stored value, default 0),
  - `.modal-actions` with OK / Cancel,
  - title = the credential type (e.g. "FOBS").
- OK writes the quantity to state + `markDirty()` + recalculates the BOM. Cancel discards.

---

## Data model

- New field: `projectInfo.credentials = { fobs: 0, cards: 0, mobilePasses: 0 }`.
- **Forward-compat (important):** structure each entry so the future catalogue/pricing pass can
  extend it without a rewrite — i.e. design the shape so a type can later carry `{ qty, sku, unit,
  desc }`. Simplest path now: store as the flat `{fobs, cards, mobilePasses}` counts, and isolate
  the "credential type → BOM row" mapping in ONE helper so the catalogue pass swaps the placeholder
  descriptions for real SKUs in one place.
- Persist in the save shape → **bump save version + backfill** (missing `credentials` defaults to
  all-zero on load so older saves open clean).

---

## BOM integration

- For each credential type with qty > 0, emit a BOM auto-row → route to **2.1 Access Control**
  (post-restructure). Keys like `auto-ac-cred-fob` / `-card` / `-mobilepass`; `unit: 0`;
  placeholder descriptions ("Access Credential — Fob", "Access Credential — Card", "Access
  Credential — Mobile Pass") until the catalogue lands.
- **Decision D1 (recommended):** when ANY manual credential qty > 0, SUPPRESS the existing derived
  `auto-ac-credentials` reader-count row and emit the explicit per-type rows instead; if all manual
  quantities are 0, keep the derived estimate row as the fallback. (Mirrors the M1 placed-switch /
  derived-switch suppression pattern — consistent behavior.)
- Both the on-screen Security Quote drawer and the BOM PDF pick these up automatically via
  `computeBomTree()` — no separate PDF edit.

---

## Design / constraints

- Flat-icon tiles, consistent with the existing AC tile styling (`.tier2-tile`, `.brand-tile`
  hover/active treatment). No dropdowns where a tile fits.
- Modal matches the existing `.modal-box` pattern exactly (don't invent a new modal style).
- `markDirty()` on every quantity commit; the credentials field saves/loads with the project.
- Vanilla JS, `var` only, single file, no new deps.

---

## Open decisions (confirm at brief approval / milestone plan)

1. **D1 — derived-vs-manual credentials row.** Rec: manual entries (any qty>0) suppress the derived
   reader-count row; all-zero keeps the derived estimate.
2. **D2 — fob icon.** Rec: inline stroke SVG (key/fob) matching the icon set; CC proposes the path.
3. **D3 — drill-in UX.** Rec: clicking Credentials replaces the AC category tiles with the 3 tier-3
   tiles + a back tile. Match any existing nested pattern; verify on main.
4. **D4 — tiles vs one modal.** Per the request: three separate tiles, each its own qty modal
   (not one combined form). Honor that; it scales to more credential types when the catalogue lands.

---

## Explicitly out of scope (later — materials-model / pricing pass)
- Catalogue binding, SKUs, unit prices on credentials.
- Credential sub-types beyond fob/card/mobile-pass.
- Data-driven section assignment generally (this pass hardcodes credentials → 2.1).
- Any pricing math — `unit: 0` throughout.
