# Surveillance / Door Hardware Markup Tool — Work Queue

_Canonical manually-maintained queue. Last regenerated after the CMVR head-end + accessories-reskin + single-open-accordion arc merged to main (`918a843`, squashes branch commit `afe6b40`)._

---

## THE REFRAME (terminology)

- **Security Quote** = on-screen "BOM" drawer/modal. Internal **priced** workspace. Placements → materials → SKU → price-book lookup → margin/tax/totals.
- **Door Hardware Quote** = the DHW wizard (import → price → award → markup → schedule).
- **Bill of Materials** = customer-facing proposal-export PDF page only. Qty · SKU · Description, no pricing.
- Code symbols stay `bom*` (UI says "Security Quote"; rename deferred).

---

## 🟡 IMMEDIATE GIT — sync local main

- **Merged to main via PR #1** (`918a843`). Pull it down locally before any new work:
  ```
  git checkout main && git pull
  ```
  Branch `cmvr-headend-models` deleted on origin. Switch-Phase-1 branches off this updated main (sees v22).

---

## JUST SHIPPED (on main via PR #1, merge `918a843`)

- **CMVR head-end models** — two-tier picker, per-sku BOM roll-up, `headends[*].sku`, save v21→v22, generic auto-nvr/auto-hdd fallback for legacy `sku:null`.
- **Accessories reskin to the 3-tier system** — Camera Accessories Tier-2 (CMVR · Network · Accessories) as `.tier2-tile` icon tiles matching Camera Styles; Tier-3 CMVR models as text-only `.tier3-tile` code tiles in the shared 5-col grid (no per-module column override). Generic-placement DROPPED (head-end requires a model; legacy `sku:null` read-paths kept). Network/Accessories are "coming soon" stubs.
- **Head-end right panel (M5a)** — `data-mode="headend"` shows name · capacity · PoE · AI · price on arm. Capacity/price moved OFF the tile.
- **Single-open accordion** — Tier-3 hidden until its Tier-2 clicked; only one Tier-2 open/armed across the camera pane; mutual exclusivity camera-style XOR CMVR; re-click collapses. Visibility centralized in sole writer `_syncDrilldownVisibility` (cameras + CMVR grids + the `#lp-bc2` "Camera Models" breadcrumb-header in lockstep). Cold-start arms nothing (no invisible default).
- **Tier-2 active styling** — new `.active-accessory` variant (blue outline + light-blue fill), parallel to per-style variants; AC's solid-blue `.active` left untouched. Accessories rows inset 13px to align with camera styles.

## JUST SHIPPED (earlier, on main)

- Camera SKU backfill (`dac382a`), Pricing M2 SKU→price lookup (`aa1b5619`), Pricing Data Foundation, CLAUDE.md scope regen (`d2c23ec`).

---

## 🔴 IMMEDIATE (feature) — do before client-facing work

- **Restore Load/Clear Pricing File-menu buttons.** `btn-pricing-load` / `btn-pricing-clear` absent from File-menu markup (handlers `openPricingFilePicker` / `confirmClearPricing` orphaned). Pricing works end-to-end but is UI-unreachable on fresh localStorage. Markup-only restore. Branch `fix-pricing-menu-restore`. **This is the next-session top item.**

---

## 🔴 $0-COVER DEPENDENCY — partially resolved

- Cover GRAND TOTAL renders real totals for priced SKUs (Brivo AC + EE cameras + CMVRs once loaded). Still $0 for Doorbird `DB-*`, parcel placeholder. Resolved when those price out or the cover-redesign hides $0.

---

## NEXT UP

### Direct follow-ups to the CMVR arc
- **M5b — click-to-select a placed head-end.** Canvas-click a placed head-end → opens the headend right panel for its sku + Delete. Net-new selection plumbing (~5 sites: state var, selectHeadend, canvas-click branch, delete-key hook, closeRightPanel clear). Deferred out of the reskin pass; own browser gate.
- **Switch Topology — Phase 1 (placement + price).** Branch off main AFTER the merge (sees v22, bumps v22→v23). Placeable network switches (`SWITCH_CATALOG`, 6 SW SKUs) mirroring the CMVR/acDevices lifecycle: Tier-2 NETWORK tile → Tier-3 switch codes → place → `switches[]` array → BOM roll-up at book price. Build Tier-3 as text-tiles from the start (no reskin). NON-GOALS: cabling, riser wiring, PoE-budget — all Phase 2.
- **Switch Topology — Phase 2 (cabling).** Camera→switch→CMVR cabling, riser wiring of placed switches, PoE-budget validation. Merges with Manual Cable Routing. The deferred-half the Phase-1 non-goals point to.

### Pricing / data
- **Converter `-0` reconcile.** The loaded `pricingBook.json` (1083-item everything-dump) has all CMVRs, but CC's canonical `build_pricing_json.py` likely still carries the `-0` SKU drop that nukes all 18 CMVRs + ~31 hardware rows. Fix the suffix regex to `-(1|12|36|60)$` (let the description filter catch Setup/Complete) BEFORE the next book refresh, or a regen silently re-breaks CMVR pricing.
- **SKU coverage gaps:** `cred-fob` credentials (false-miss), Doorbird `DB-*` + `LUX-PCL-PLACEHOLDER` (no source), 8 Brivo SKUs absent from reseller book.

### SKU coverage — known markers (not bugs)
- **DZ04** camera: `sku:null` by design (no standalone SKU in Brivo sheet). Reads $0.00 cleanly.

---

## QUEUED PASSES

### Classifier v2 — DHW keyword expansion
- Extend `DHW_CLASSIFIER_RULES` (astragal, coordinator, threshold, gasketing, sweep, track, viewer, pocket-door lock, latching bolt, mounting plate; fire exit hardware; `cyl`). Door-operator → §2.2. Ride-along: `\b` word boundaries on `SECURITY_HARDWARE_PATTERN`.

### UX / copy
- **Migration-alert removal** — drop AC + camera-reach migration `alert()`s, keep migrations, add `console.info` breadcrumbs. Own cleanup branch off main.
- **User-facing copy audit** — integrator jargon → plain language before SaaS.

### Other backlog
- **Camera Details Panel Redesign** — sliders w/ two-way canvas sync.
- **PDF scale-marker auto-recognition** — select scale bar → calibration. OCR lib TBD.
- **Catalog / rules** — Rules Page editor; LuxerOne / Doorbird / Hanwha SKU imports.
- **Accessories auto-match** — the ACCESSORIES Tier-2 stub: auto-match junction box / SD card to placed camera model (Brivo descriptions already list compatible models, e.g. BX005 → DM08/DD07/DD08/DD10/DD11 — derivable).

---

## HOUSEKEEPING

- **Over-capacity HDD TODO** — when ≥1 CMVR placed AND required retention > Σ usable TB across the fleet, emit expansion-drive rows. TODO left at the recordingRows suppression site; drive-math deliberately not faked.
- **Dead-code sweep** — `.type-btn-cmvr.active` (line ~1432, binds a pre-reskin class), `.lp-breadcrumb`, `computeAutoCableRows()`, `toggleCmvrModelList` comment ref, orphaned PNG assets.
- **CMVR glyph `currentColor` inconsistency** — CMVR tile SVG has hardcoded navy rect + white NVR text (doesn't tint via `currentColor` like Network/Accessories glyphs). Cosmetic; fold into an icon pass if the active-state family looks off.
- **Breadcrumb-as-tier3-header** — `#lp-bc2` doubles as the "Camera Models" header. When the camera pane adopts the static `<Mode> <Tier-role>` headers the design rule calls for, revisit this coupling.
- **`switches`/`headends` don't reset on raw PDF re-import** — reset in loadPDF (Phase-1 switch pass must add `switches=[]` here).
- **`source-data/pricing-template.json` recurring deletion** — Windows editor/sync churn re-deletes it (happened twice). `git checkout` to restore; find the deleter if it recurs. Same family as the `.gitignore` UTF-16 re-encode.
- **Confirm `source-data/` ignore status** — fresh clone needs the price book; Load Pricing button (once restored) is the only way in.
- **Hard-reload after every CC save** before browser testing (localhost caches the HTML).
- **Centralize `IOT_DEFAULT_FLAGS`** — dup'd in `onIotDeviceToggle` + `applyProjectState`.
- **DHW BOM override re-apply hook** — `dhwBomRows()` not re-decorated by `bomAutoOverrides` on reload (verify vs M2).
- **Defer `bom*` code-symbol rename.**
- **Install LibreOffice** on Windows — kills the docs-PDF regen caveat.
- **User guide** — wizard, W7/W8, Hardware Module, BOM two-tier, customer BOM page, pricing load/use, CMVR/accessories 3-tier + accordion all undocumented.

---

## PROJECT-INSTRUCTION / DESIGN-RULE UPDATES (this session — apply to project settings)

- Universal 3-tier left-pane taxonomy (Tier 1 icon / Tier 2 icon `.tier2-tile` / Tier 3 text-only `.tier3-tile` in shared 5-col grid, no per-module column override).
- Tier-certainty rule: <80% sure of the tier mapping → STOP and ask.
- Specifics live in the right panel, not on tiles. `code:` field per catalog entry (no regex-derived labels).
- Single-open accordion interaction rule (one Tier-2 open/armed at a time; progressive Tier-3 disclosure; nav-only, no markDirty).
- _Paste the latest `PROJECT_INSTRUCTIONS.md` from this session into project settings — it supersedes all intermediate versions._

---

## RESOLVED (removed from deferred)
- ~~CMVR head-end models + accessories reskin + head-end panel + accordion~~ — merged to main `918a843` (PR #1).
- ~~Camera SKU mapping (een-* → EN-*)~~ — `dac382a`.
- ~~Pricing M2 SKU→price lookup~~ — `aa1b5619`.
- ~~BOM two-tier template~~ · ~~Centered BOM modal~~ · ~~Customer BOM export page~~.
