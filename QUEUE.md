# Surveillance / Door Hardware Markup Tool — Work Queue

_Canonical manually-maintained queue. Last regenerated after Switch Topology Phase 1 merged to main (`ec61a69`, PR #2). Previous merge: CMVR/accessories/accordion arc (`918a843`, PR #1)._

---

## THE REFRAME (terminology)

- **Security Quote** = on-screen "BOM" drawer/modal. Internal **priced** workspace. Placements → materials → SKU → price-book lookup → margin/tax/totals.
- **Door Hardware Quote** = the DHW wizard (import → price → award → markup → schedule).
- **Bill of Materials** = customer-facing proposal-export PDF page only. Qty · SKU · Description, no pricing.
- Code symbols stay `bom*` (UI says "Security Quote"; rename deferred).

---

## JUST SHIPPED (on main)

- **Switch Topology Phase 1** — `ec61a69` (PR #2). 6 EN-SW* switches as `SWITCH_CATALOG`, Network Tier-2 → Tier-3 text tiles, `switches[]` placement array (replaces legacy P8 map system; legacy placements drop silently with `console.warn`), canvas glyph reuses Tier-2 silhouette, BOM Network section rolls up by SKU at book prices, generic auto-switch fallback when zero placed. Save v22→v23. `switches=[]` reset added to `loadImage` + `loadPDF` (QUEUE-flagged gotcha fix). Page-delete cascade extended.
- **CMVR head-end + accessories 3-tier reskin + accordion** — `918a843` (PR #1).
- **Earlier:** Camera SKU backfill (`dac382a`), Pricing M2 SKU→price lookup (`aa1b5619`), Pricing Data Foundation, CLAUDE.md scope regen (`d2c23ec`).

---

## 🔴 IMMEDIATE (feature) — do before client-facing work

- **Restore Load/Clear Pricing File-menu buttons.** `btn-pricing-load` / `btn-pricing-clear` absent from File-menu markup (handlers `openPricingFilePicker` / `confirmClearPricing` orphaned). Pricing works end-to-end but is UI-unreachable on fresh localStorage. Markup-only restore. Branch `fix-pricing-menu-restore`.
- **`gh auth login`** — run once locally so future PRs open from CC via `gh pr create` instead of the browser flow. One-time setup.

---

## 🔴 $0-COVER DEPENDENCY — partially resolved

- Cover GRAND TOTAL renders real totals for priced SKUs (Brivo AC + EE cameras + CMVRs + switches once loaded). Still $0 for Doorbird `DB-*`, parcel placeholder. Resolved when those price out or the cover-redesign hides $0.

---

## NEXT UP

### Switch Topology Phase 2
- **Unified-select pass** for placed switches: hit-test (`switchAt`), click-to-select, drag-to-move, delete-key removal. The `acDevices` lifecycle is the mirror target. Likely combines with click-to-select for placed head-ends (the M5b deferred from the CMVR pass) into one "selectable infrastructure" pass.
- **Cabling:** camera → switch → CMVR cable runs. Couples to Manual Cable Routing.
- **Riser:** placed switches surface on the riser diagram (currently camera-count-derived only).
- **PoE budget** validation: warn when placed cameras' PoE draw on a switch exceeds its `poeW`.

### Security Quote modal restructure (parking-lot — needs scoping)
- User wants the Security Quote modal "more like the hardware wizard." Open dimensions to pick (one or more): multi-step staged layout / same chrome+frame+footer / section-collapse / override-edit flow / export CTA placement. **Pending: which dimensions?** Don't start on the same file as any other in-flight pass — overlaps `networkRows` and BOM-adjacent code.

### Sticky-arm placement mode (project-wide UX decision)
- Today placement is one-shot per arm (camera, reader, head-end, switch). User flagged this as friction for switches. Decision: should arming persist across placements until explicit cancel (Esc / clicking same tile to disarm)? Project-wide, not switch-specific — affects every placeable. **Pending decision.**

### Direct follow-ups still deferred
- **M5b — click-to-select a placed head-end.** ~5 sites: state var, `selectHeadend`, canvas branch, delete hook, `closeRightPanel` clear. Merge with Switch Phase 2 unified-select pass.

### Pricing / data
- **Converter `-0` reconcile.** CC's `build_pricing_json.py` likely still carries the `-0` SKU drop that nukes 18 CMVRs + ~31 hardware rows. Fix suffix regex to `-(1|12|36|60)$` BEFORE the next book refresh, or a regen silently re-breaks CMVR/switch pricing.
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
- **Accessories Tier-2 stub fill** — auto-match junction box / SD card to placed camera model (Brivo descriptions list compatible models, e.g. BX005 → DM08/DD07/DD08/DD10/DD11). Mirror pattern from Switch Phase 1 but accessory-quantity model (no canvas placement for SFP/modem/junction box).
- **Network Tier-3 — modem + SFP + encoder** (parked from this session). User scoped out of Phase 1; revisit as accessory-quantity catalog vs additional placeables.

---

## HOUSEKEEPING

- **Headends-on-raw-reimport reset leak** — same bug family as the switches gotcha just fixed; not in Switch Phase 1 scope. Add `headends = {}` to `loadImage` + `loadPDF` resets. Trivial; own micro-pass.
- **Over-capacity HDD TODO** — when ≥1 CMVR placed AND required retention > Σ usable TB across the fleet, emit expansion-drive rows. TODO left at the recordingRows suppression site.
- **Dead-code sweep** — `.type-btn-cmvr.active` (pre-reskin class), `.lp-breadcrumb`, `computeAutoCableRows()`, `toggleCmvrModelList` comment ref, orphaned PNG assets, and post-Switch-Phase-1: any remaining `tb-switch` markup / `switchMode` doc comments referencing the old map.
- **CMVR glyph `currentColor` inconsistency** — CMVR tile SVG has hardcoded navy rect + white NVR text; doesn't tint via `currentColor` like Network/Accessories glyphs. Cosmetic.
- **Switch canvas-draw silhouette parity** — Phase 1 reused the Tier-2 tile SVG path; verify at next visual review that placed switches read as the same silhouette family as the Tier-2 tile icon.
- **Breadcrumb-as-tier3-header** — `#lp-bc2` doubles as the "Camera Models" header. Revisit when the camera pane adopts static `<Mode> <Tier-role>` headers per the design rule.
- **OneDrive-as-repo-home** — likely cause of recurring `source-data/pricing-template.json` deletion + `.gitignore` UTF-16 re-encode. Move repo outside the synced folder when convenient.
- **`source-data/pricing-template.json` recurring deletion** — `git checkout` to restore if it happens again.
- **Confirm `source-data/` ignore status** — fresh clone needs the price book; Load Pricing button (once restored) is the only way in.
- **Hard-reload after every CC save** before browser testing (localhost caches the HTML).
- **Centralize `IOT_DEFAULT_FLAGS`** — dup'd in `onIotDeviceToggle` + `applyProjectState`.
- **DHW BOM override re-apply hook** — `dhwBomRows()` not re-decorated by `bomAutoOverrides` on reload (verify vs M2).
- **Defer `bom*` code-symbol rename.**
- **Install LibreOffice** on Windows — kills the docs-PDF regen caveat.
- **User guide** — wizard, W7/W8, Hardware Module, BOM two-tier, customer BOM page, pricing load/use, CMVR + Switch Phase 1 3-tier + accordion all undocumented.

---

## PROJECT-INSTRUCTION / DESIGN-RULE STATE

Current authoritative `PROJECT_INSTRUCTIONS.md` carries:
- Universal 3-tier left-pane taxonomy (Tier 1 icon / Tier 2 icon `.tier2-tile` / Tier 3 text-only `.tier3-tile` in shared 5-col grid, no per-module override).
- Tier-certainty rule (<80% sure → STOP and ask).
- Specifics in right panel, not on tiles. `code:` field per catalog entry.
- Active-tile treatment (light fill + colored outline + colored glyph/label; per-group `.active-*` variant; solid-fill `.active` reserved for AC).
- Alignment/inset rule (all tier rows share container inset).
- Single-open accordion (progressive Tier-3 disclosure, one Tier-2 open across pane, header hides with grid, single-owner visibility writer, cold-start arms nothing).
- _Paste latest `PROJECT_INSTRUCTIONS.md` into project settings — supersedes intermediates._

---

## GIT WORKFLOW

- Direct push to main is **blocked by harness**. All merges via PR.
- Until `gh auth login` is run locally: PR via browser at `https://github.com/larsjohnston/surveillance-markup/pull/new/<branch>`.
- After `gh auth login`: CC opens PRs via `gh pr create`.

---

## RESOLVED (removed from deferred)
- ~~Switch Topology Phase 1~~ — merged to main `ec61a69` (PR #2).
- ~~CMVR head-end + accessories reskin + head-end panel + accordion~~ — merged to main `918a843` (PR #1).
- ~~Camera SKU mapping (een-* → EN-*)~~ — `dac382a`.
- ~~Pricing M2 SKU→price lookup~~ — `aa1b5619`.
- ~~Switch placement scoping decision~~ — decided + shipped as Phase 1 (placement) over Scope-A (BOM-pricing only).
- ~~`switches`-on-raw-reimport reset leak~~ — fixed in Switch Phase 1.
- ~~Legacy map-based switches system~~ — demolished in Switch Phase 1 (M3.5).
- ~~BOM two-tier template~~ · ~~Centered BOM modal~~ · ~~Customer BOM export page~~.
