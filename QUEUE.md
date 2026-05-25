# Surveillance / Door Hardware Markup Tool — Work Queue

_Canonical manually-maintained queue. Last regenerated after Pricing M2 (SKU→price-book lookup) merged to main._

---

## THE REFRAME (terminology — affects everything below)

- **Security Quote** = the on-screen "BOM" drawer/modal. Internal **priced** workspace. Floor-plan placements → materials → SKU → price-book lookup → margin/tax/totals. Pricing machinery lives here.
- **Door Hardware Quote** = the DHW wizard (import → price → award → markup → schedule).
- **Bill of Materials** = the customer-facing proposal-export PDF page only. Qty · SKU · Description, no pricing. Two-line rows.
- Code symbols stay `bom*` (UI says "Security Quote"; symbol rename deferred).

---

## JUST SHIPPED (on main)

- **Pricing M2 — SKU→price-book lookup wired.** `aa1b5619`. SKU resolves via `bomRowSku` (with `_stripOhPrefix` for OH-flagged AC rows); `computeAutoRows` wrapper does a hoisted single price-book read then applies unit prices, override-wins. `_normalizeBomKey` shares overrides across a SKU's flagged/unflagged variants. Coverage validated (7 Group-A rows, 3 hits / 4 expected misses; OH-strip proven). Brief + `build_pricing_json.py` folded.
- **Pricing Data Foundation** (prior) — load/clear helpers, status banner, `pricing.json` schema v1, `getPricingBook`/`getUnitPrice`/`isPricingLoaded`.
- **CLAUDE.md regenerated** for expanded Smart Building scope (`d2c23ec`).

---

## 🔴 IMMEDIATE — do before anything else

- **Restore Load/Clear Pricing File-menu buttons.** `btn-pricing-load` / `btn-pricing-clear` are absent from the File-menu markup (handlers `openPricingFilePicker` / `confirmClearPricing` survive as orphans). The pricing feature just merged is **UI-unreachable on a fresh localStorage** — no way to load a price book without DevTools. Markup-only restore; handlers already exist. Branch `fix-pricing-menu-restore`. Root-cause why they were dropped (was it intentional?) but restore regardless.

---

## 🔴 $0-COVER DEPENDENCY — partially resolved

- Cover GRAND TOTAL now renders real totals for **priced** SKUs (Brivo AC). Still $0 for unpriced families (cameras `een-*`/`EE-*` vs book `EN-*`; Doorbird `DB-*`; parcel placeholder). A proposal leaning on camera/intercom/parcel pricing still undercounts. Fully resolved when those families get prices or a no-price marker (see SKU-mapping items below) OR the cover-redesign hides $0.

---

## NEXT UP

### SKU coverage gaps (surfaced by M5 coverage dump)
- **`cred-fob` credentials row** — falls through `bomRowSku` `auto-ac-credentials` exact-match into the `auto-ac-` prefix strip, yields a non-SKU string, always misses. Give it a real SKU or a no-price marker so it stops reading as a false miss.
- **Camera SKU mapping** — tool keys `een-*`/`EE-*` don't match book `EN-*`. Decide mapping table or no-price marker.
- **Doorbird intercom + parcel** — `DB-*` and `LUX-PCL-PLACEHOLDER` not in the Brivo book. Need LuxerOne / Doorbird price sources or no-price markers.
- **8 Brivo SKUs absent from reseller book** — `B-D21xx` intercom line, `B-9002`, `B-A1101`, `B-P1-N`. Brivo-intercom price addendum when source available.

### Price discrepancy to reconcile (one-time)
- Two builders produced different `B-BSMF-B` costs (254.07 vs 206.75). CC's `build_pricing_json.py` output (206.75 reseller / 397.6 list) matches the Brivo sheet and is canonical. Confirm no other SKUs were mis-columned by the losing builder. (My throwaway pricing.json discarded — CC's is the keeper.)

---

## QUEUED PASSES

### Classifier v2 — DHW keyword expansion
- Extend `DHW_CLASSIFIER_RULES`: rule 4 (→5.2) astragal, coordinator, threshold, gasketing, door bottom/sweep, track, viewer, pocket door lock, latching bolt, mounting plate; rule 3 fire exit hardware; rule 5 (→5.3) `cyl`. Drops unclassified ~28→~5.
- Door-operator components → §2.2 (couples to deferred door-operator modeling).
- **Ride-along:** add `\b` word boundaries to `SECURITY_HARDWARE_PATTERN` (fixes "REX" inside "CORE EXTRACTOR").

### UX / copy
- **Migration-alert removal** (parked from pricing chat) — drop the AC + camera-reach migration `alert()`s, keep the migrations, add silent `console.info` breadcrumbs. Decision pending: both + breadcrumbs / both, no breadcrumbs / AC only. **NOTE: not on pricing branch — own cleanup branch off main.**
- **User-facing copy audit** — migration alerts and other strings are jargon-written for the integrator; needs a plain-language pass before multi-tenant SaaS.

### Other backlog
- **Switch Topology** — two-tier camera→switch→CMVR cabling; multi-switch-per-page; switch right-panel. Likely merges with Manual Cable Routing.
- **Manual Cable Routing + Conduit** — user-drawn polylines replacing straight-line × multiplier; conduit per-segment → BOM row.
- **Camera Details Panel Redesign** — sliders w/ two-way canvas sync.
- **PDF scale-marker auto-recognition** — select scale bar → calibration. OCR lib TBD.
- **Catalog / rules** — Rules Page editor; LuxerOne / Doorbird / Hanwha SKU imports.

---

## HOUSEKEEPING

- **`.gitignore` UTF-16 LE re-encoding** — a Windows editor re-saved it as UTF-16 LE (shows as spaced-out `s o u r c e`). Discard with `git checkout .gitignore`; if it recurs, set the editor to UTF-8 + add `.gitignore text` to `.gitattributes`.
- **Confirm `source-data/` ignore status vs committed pricing.json** — if `source-data/` is gitignored, a fresh clone has no price book; the Load Pricing button (once restored) is the only way in.
- **Hard-reload after every CC save before browser testing** — localhost caches the HTML between saves; cost most of a session chasing phantom "didn't take" bugs.
- Track pass briefs in the closing commit (done for M2). Commit per milestone. Resync anchor on every CC block.
- **Centralize `IOT_DEFAULT_FLAGS`** — dup'd in `onIotDeviceToggle` + `applyProjectState`.
- **DHW BOM override re-apply hook** — `dhwBomRows()` output not re-decorated by `bomAutoOverrides` on reload. (May be resolved by M2 lookup — verify.)
- **Defer `bom*` code-symbol rename** — UI says "Security Quote", symbols stay `bom*`.
- **Dead-code sweep** — `.lp-breadcrumb`, `computeAutoCableRows()`, orphaned PNG assets.
- **`switches`/`headends` don't reset on raw PDF re-import** — stale positions; reset in loadPDF.
- **Install LibreOffice** on Windows — kills the docs-PDF regen caveat.
- **User guide** — wizard + W7/W8 + Hardware Module + BOM two-tier + centered modal + Security-Quote rename + customer BOM page + pricing load/use all undocumented.

---

## RESOLVED (removed from deferred)
- ~~Pricing M2 SKU→price lookup~~ — `aa1b5619`.
- ~~BOM two-tier template~~ · ~~Centered BOM modal~~ · ~~Customer BOM export page~~.