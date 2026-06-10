# AC Panel Respec — Design

- **Date:** 2026-06-10
- **Status:** Approved for planning
- **Scope:** Single combined spec (user chose not to decompose)
- **File touched:** `camera_markup_tool.html` (single-file app) + `pricingBook.json` (read-only reference)

## 1. Goal

Restructure the Access Control left-pane drill-down to mirror the camera-drill-down convention (Tier-1 categories → Tier-2 icon tiles → Tier-3 options), make controllers auto-spec'd (and tracked-for-placement) rather than free-picked, redesign credentials into icon tiles, fold overhead-door parts into a "Remotes" tile with a transmitter/receiver rule, and move elevator control into an in-panel toggle + modal with floor auto-count.

## 2. Current state (today)

- **AC panel** (`data-mode-section="access"`, ~line 2640): root is the **Brivo brand** tile (`#ac-brand-grid`); Tier-2 (`#lp-ac-tier2`) = Readers / Controllers; Tier-3 (`#lp-ac-tier3`) = subcategory/variant. Tiles are data-driven from `BRIVO_CATALOG` via `subcategoriesFor(category)` (~line 10356). Icons in `AC_ICONS` (~line 10375), looked up by `acIconFor(key)`.
- **Credentials** is a drill-in view (`acCredentialsView`, ~line 9507) over the same containers; SKUs from `BRIVO_CRED_CATALOG` (~line 4160) grouped by `tier2_family` (Cards / Fobs / Dual-Tech / Pre-Punch Service / Overhead Doors). Counts live on `projectInfo.credentials` (`fobs, cards, mobilePasses, ohTransmitters, ohReceiver`) + a per-SKU `brivoSkus` map. Emitted in `computeAutoRows` (~line 20487+).
- **Controllers** are placeable devices today (drill-down → place on canvas). An always-optional auto-spec (`acHardwareConfig.mode` off/on + `powerMode`, ~line 20556+) emits panel + expansion + power rows sized to reader/door count when `mode==='on'`.
- **Elevator** is config-driven via Project Info fields (`projectInfo.elevatorControl {cabs, floors}`), added in a prior pass; `computeAutoRows` emits `B-ACS6100-IO` × `cabs·⌈floors/8⌉` + 1 cab reader/cab into §2.1.
- **Overhead door** parts: Farpointe `FP-WRR22` (receiver) + `FP-WRT2B` (transmitter) in `BRIVO_CRED_CATALOG` with `section:'2.2'`.
- **Floors** modeled as `pages`; per-page `pageMultiplier(idx)` ("typical floor ×N").
- Pricing resolved by SKU from `pricingBook.json` via `getUnitPrice` / `getListPrice`.

## 3. Design

### 3.1 Panel structure
Tier-1 becomes three camera-style icon tiles: **Readers · Controllers · Credentials** (replaces the Brivo-brand-only root; Brivo remains the implicit single manufacturer). An **Elevator control toggle** row sits beneath the Tier-1 tiles.

### 3.2 Readers
No change. Placed on canvas as today; drive controller auto-spec.

### 3.3 Controllers
- **Auto-spec is always on** — remove the off/on toggle. `acHardwareConfig.mode` is forced `on`; `powerMode` is retained.
- The auto-spec is the **single BOM source of truth** for controllers and all boards (controllers + two-door expansion + elevator I/O + power/chassis).
- **Tier-2 = "to-place" tiles**: the auto-spec'd controllers (type + qty) rendered as placeable tiles. Clicking a tile arms that exact controller (type fixed by the spec) to drop on the canvas.
- **Placed controllers are visual instances** of the spec'd list (for floor plans / riser). They do **not** emit their own BOM rows — the auto-spec already accounts for them (no double-count). Today's `acGroups` controller-row emission for placed controllers is suppressed for auto-spec controller types.
- **Placement flag**: track `placedControllerCount` vs `requiredControllerCount`; when `placed < required`, show a warning chip *"N of M controllers still need placing."*
- **Read-only board list** beneath Tier-2: every board the spec emits (two-door expansion, elevator I/O, power/chassis enclosures), display-only, qty shown.
- **Power supply = icon tiles**: Internal PSB / LSP / Altronix (writes `acHardwareConfig.powerMode`), styled like the camera/AC tiles.

### 3.4 Credentials
Tier-2 icon tiles: **Cards · Fobs · Mobile · Remotes**. The Dual-Tech and Pre-Punch Service families are **deleted** from `BRIVO_CRED_CATALOG` and the UI.

- **Icons (custom SVGs in `AC_ICONS`, tool style — 24×24 viewBox, currentColor):**
  - Credentials (Tier-1) and Fobs (Tier-2) → **grey traditional prox fob** (teardrop/rounded body + hole).
  - Remotes → **car-remote clicker** (keyring loop + body + buttons).
  - Cards → card; Mobile → phone.
- **Cards / Fobs** → Tier-3 SKU options (37-bit / 56-bit / custom) with qty entry; rows route to §2.1 (unchanged mechanism via `brivoSkus`).
- **Mobile** → a mobile-pass count (badge on tile, click to edit).
  - Mobile passes are **subscription** SKUs (`B-MP-100/500/1000`, monthly/yearly). They render in **§6 Subscriptions**, not §2.1.
  - **Multifamily (gateways present):** show the 500-pass line = qty 500, desc "included", **$0** (the `B-ACS-BASE-M` subscription bundles 500). Counts above 500 add priced packs (smallest packs that cover the overage, mirroring the reader-tier logic). The pack SKU carries the term suffix `-1`/`-12` per `projectInfo.subscriptionTerm` (e.g. `B-MP-500-1`), consistent with the other subscription rows.
  - Non-multifamily: priced `B-MP-*` packs for the entered count.
  - Wallet passes (`B-WP-*`) are **out of scope** for this pass (noted, not built).
- **Remotes** (overhead doors) → Tier-3 = **Transmitter + Receiver**.
  - First click on Remotes prompts **"# overhead doors"** → sets receivers (`FP-WRR22`, **1 per door**).
  - **Transmitters** (`FP-WRT2B`) entered separately in Tier-3 (handed to users).
  - **Rule:** `transmitters > 0` forces `receivers ≥ 1`.
  - The **overhead-door count badges** the Remotes Tier-2 tile; clicking the tile reopens the count prompt to edit.
  - Rows route to §2.2 (unchanged).

### 3.5 Elevator control
- The Tier-1 toggle opens a **modal**: **# cars** + **# floors**.
- **Floors prefill = sum of `pageMultiplier` across pages** (true building floor count), editable.
- Emits `cabs × ⌈floors/8⌉` `B-ACS6100-IO` boards + **1 cab reader/cab** (`B-BSMF-B`) into §2.1; board count feeds the controller power/chassis sizing (existing `_elevBoards`/`_hwI` path).
- **Replaces** the Project Info → Elevator Control fields (those are removed; `elevatorControl` ownership moves to the AC toggle).

## 4. Data model changes

- `projectInfo.credentials` reshaped to the new families. Keep `brivoSkus` map for Cards/Fobs; keep overhead `ohTransmitters`/`ohReceiver` semantics (Remotes); add a mobile-pass count field; drop Dual-Tech/Pre-Punch.
- `projectInfo.acHardwareConfig`: `mode` forced `'on'` (toggle removed from UI); `powerMode` retained, set via tiles.
- `projectInfo.elevatorControl {cabs, floors}` owned by the AC toggle/modal. Keep the internal key `cabs`; the UI labels it "cars". (Decision: internal name unchanged to avoid a save-format migration.)
- New transient UI state: current AC Tier-1 category (Readers/Controllers/Credentials), credentials Tier-2 family, controller placement counts.

## 5. Migration (on load, `applyProjectState`)

- **Strip orphaned credential SKUs**: remove any Dual-Tech (`B-*-SCP*`) / Pre-Punch (`B-SC-Punch-*`) keys from `projectInfo.credentials.brivoSkus`; one-time `showOneShotToast` notice (mirrors the elevator-board strip).
- **Auto-spec on**: backfill `acHardwareConfig.mode='on'` for existing saves.
- **Elevator**: migrate any Project Info elevator values into the new owner; remove the Project Info fields/handlers.
- Existing placed controllers remain (now counted as placement instances against the spec'd requirement).

## 6. BOM / routing impact

- Controllers: BOM rows from auto-spec only; placed controllers are visual/tracked, not billed separately.
- Credentials Cards/Fobs → §2.1; Remotes → §2.2; Mobile passes → §6 Subscriptions.
- Elevator boards + cab readers → §2.1 (unchanged from prior pass).
- §-routing in `computeBomTree` unchanged except the new Mobile-subscription path and removal of deleted cred families.

## 7. Acceptance criteria

1. AC root shows Readers / Controllers / Credentials tiles + an Elevator toggle.
2. Controllers Tier-2 lists auto-spec'd controllers as to-place tiles; placing them updates a placed/required flag; BOM controller qty = auto-spec (no double-count from placement).
3. Boards list beneath controllers is read-only and shows all spec'd boards; power supply is icon tiles writing `powerMode`.
4. Credentials Tier-2 = Cards/Fobs/Mobile/Remotes with the specified icons; Dual-Tech/Pre-Punch gone; old saves migrate cleanly with a notice.
5. Remotes: first click prompts door count → receivers = doors; transmitters separate; transmitters>0 ⇒ ≥1 receiver; badge shows door count and is editable.
6. Mobile: multifamily shows 500 included @ $0; overage adds priced packs in §6.
7. Elevator toggle → modal with cars + floors (floors prefilled from Σ multipliers), emits the correct boards + cab readers; Project Info elevator fields removed.
8. `node --check` passes; existing PDF/BOM/CSV paths render without regression.

## 8. Non-goals (YAGNI)

- Wallet passes (`B-WP-*`).
- Per-placed-controller board derivation (boards derive from aggregate reader/door + elevator counts, as today).
- Manual controller type override (controllers are spec-determined).
