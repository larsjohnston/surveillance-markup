# Surveillance / Door Hardware Markup Tool — Work Queue

_Canonical manually-maintained queue. Last regenerated after PR #9 (SQ polish + Summary redesign + editable Tax label) merged to main (`2fe56cd`). Prior: PR #8 M2d cleanup (`cd59297`); PR #7 SQ-wizard M3 (`846fc08`); PR #5/#6 SQ-wizard M2 + SKU fixup (`8042407`/`913e4ee`); PR #4 SQ-wizard M1 chrome (`d6fc56c`)._

---

## THE REFRAME (terminology)

- **Security Quote** = on-screen "BOM" drawer/modal. Internal **priced** workspace. Placements → materials → SKU → price-book lookup → margin/tax/totals.
- **Door Hardware Quote** = the DHW wizard (import → price → award → markup → schedule).
- **Bill of Materials** = customer-facing proposal-export PDF page only. Qty · SKU · Description, no pricing.
- Code symbols stay `bom*` (UI says "Security Quote"; rename deferred).

---

## JUST SHIPPED (on main)

- **SQ polish + Summary redesign + editable Tax label** — `2fe56cd` (PR #9). 10-commit arc:
  - **Polish (99fe750):** hidden `#bom-config` (yellow margin band) + tier-filter band in Materials; global blue-by-default editable inputs via `:where()` (outline-on-focus); Materials Cost column `$` prefix via wrapper `.bom-cell-cost::before`; Labour auto-row Qty lock notice (mirrors Materials).
  - **recalcBom throw fix (545568d):** labour-Sell tally rewritten on `_sqRowLabour` — drops three undefined identifiers (`_sqLabourUnit`/`getLabourRule`/`bomLabourLineQty`) that ReferenceErrored on any non-empty + non-supply-only project. UNBLOCKED Summary count tiles + Tax-amount + Grand-Total writes (they sit after the throw point).
  - **Labour subtotal in-place repaint (d393720):** new `_sqRecalcLabourSectionSubtotal(sectionId)` + `_sqRecalcLabourFooter()` helpers called from `_sqUpdateLabourField`; section subtotal + "Labour Subtotal" footer now track per-row Cost/Sell/Hours edits without a full body rebuild. Targeted via new `.bom-labour-sec-*` + `.bom-labour-foot-*` cell classes + `data-labour-footer="1"` attr.
  - **Summary M4 surface:** 11-col xlsx table (HW Ext / Lab Ext / Combined / Margin / GM% per row + section/grand subtotals) is the SOLE Summary table — `_sqRenderSummaryXlsx*` family. The 3-col Device Manifest experiment in this arc was reverted (acec61d).
  - **Summary counts (52fb140):** `#bom-suite-types-container` per-unit-type tiles collapsed to one `Total Units` tile (Σ `suiteCountsByUnitType` values).
  - **Editable Tax label (d050536):** Tax row label is now `<input id="bom-tax-label">` defaulting to `GST` (no border default, focus picks up `:where()` outline). New `_bomTaxLabel()` helper; persists as additive `bom.config.taxLabel` in both save sites; CSV export swaps `'Tax'` literal for the live label. No PDF site carried the literal.
  - **Tier-filter cascade fix (bf6dcfe):** collapsed the two `#sq-tier-filter-host` rules (display:none vs display:flex+layout) to a single `display:none` site — was the cause of the band-still-visible regression after the initial selector swap.
- **SQ-wizard M2d cleanup** — `cd59297` (PR #8). Global `.tier1-tile` shared class (~38px, half of `.tier2-tile`) composed onto `.brand-tile` + `.smart-apt-tile` brand rows. Storage Calculator relocated from SQ Materials step to Camera Accessories drill-down (between Tier 2 row and Tier 3 CMVR Models grid). DOM ids unchanged; save shape unchanged.
- **SQ-wizard M3 (Labour step rework)** — `846fc08` (PR #7) + `713e30e` fixup. Dual-pill segmented Flat/Hourly toggle (project + per-section + per-line override); editable per-row Cost/Sell; Hours column in Hourly mode; override-dot indicator + reset; `_sqRowLabour` pure helper as single labour-math source.
- **SQ-wizard M2 + SKU fixup** — `8042407` (PR #5) + `913e4ee` (PR #6). Materials tier filter relocated to its own host; Counts grid moved to Summary; per-section pricing rule pills (Mark-Up vs Discount); SKU column on the Materials grid; warn rows (e.g. "No CMVR Present") render as amber single-cell.
- **SQ-wizard M1 chrome** — `d6fc56c` (PR #4). 3-step horizontal stepper (Materials / Labour / Summary) reusing `.dhw-*` classes; module-scoped `_sq*` state prefix; persistent X + Export CSV; free bidirectional nav.
- **Selectable infrastructure + sticky placement + CMVR multi-per-page** — `918a1d1` (PR #3).
- **Switch Topology Phase 1** — `ec61a69` (PR #2). **CMVR head-end + accessories reskin + accordion** — `918a843` (PR #1).
- **Earlier:** Camera SKU backfill (`dac382a`), Pricing M2 (`aa1b5619`), Pricing Data Foundation, migration-alert cleanup (`0faf58f`), CLAUDE.md scope regen (`d2c23ec`).

---

## 🔴 IMMEDIATE — do before client-facing work

- **Summary xlsx math discrepancies (PR #9 follow-up).** The PR #9 body flags math discrepancies in the 11-col Summary xlsx table to verify against clean main — likely candidates: grand `Combined Sell` vs `#bom-subtotal` parity under non-trivial labour rules, per-section subtotal blended GM% when supply-only flips, custom-row Sell when list-null. Recon pass needed before relying on Summary numbers for client output.
- **Test the v24→v25 head-end migration against a real v24 file.** PR #3 shipped the migration code UNVERIFIED (no v24 file on hand at test time). First time a real pre-v25 project with head-ends is opened, confirm head-ends migrate to the array with positions/sku/labels intact, no loss, no console error. Data-loss risk until checked.
- **Restore Load/Clear Pricing File-menu buttons.** `btn-pricing-load` / `btn-pricing-clear` absent from File-menu markup (handlers `openPricingFilePicker` / `confirmClearPricing` orphaned). Pricing works end-to-end but is UI-unreachable on fresh localStorage. Markup-only restore. Branch `fix-pricing-menu-restore`.

---

## 🔴 $0-COVER DEPENDENCY — partially resolved

- Cover GRAND TOTAL renders real totals for priced SKUs (Brivo AC + EE cameras + CMVRs + switches once loaded). Still $0 for Doorbird `DB-*`, parcel placeholder. Resolved when those price out or the cover-redesign hides $0.

---

## NEXT UP

### Switch / infrastructure — remaining Phase 2
- **Phase 2b — PoE budget validation.** Warn when placed cameras' PoE draw exceeds a switch's `poeW`. BLOCKED on cabling (no camera→switch association exists yet); do after 2c, or ship a rough per-page approximation (will be redone once 2c lands — not recommended).
- **Phase 2c — Cabling: camera → switch → CMVR.** Cable runs + conduit + BOM rows + routing UX. Couples to / merges with Manual Cable Routing. Big multi-pass arc. Interim today: cameras cable to the FIRST head-end per page.
- **Phase 2d — Riser wiring.** Placed switches surface on riser; multi-head-end-per-band display (riser currently shows one icon per band). Improved by 2c.

### Security Quote modal restructure (LARGELY SHIPPED — M5+ scoping TBD)
- ~~Multi-step staged layout~~ + ~~chrome reuse (`.dhw-*`)~~ + per-section pricing rule pills + labour Flat/Hourly + 11-col Summary xlsx — all landed across PR #4-#9. Remaining tail (M5+): customer-facing PDF roll-up from the new xlsx; PDF cover Grand Total wired to the new totals; supply-only badge layout polish; rule pill UX (right-edge inline editor); any cleanup of legacy `bom-margin-pct` / hidden margin spans once PDF + cover paths no longer read them.

### Pricing / data
- **Converter `-0` reconcile.** CC's `build_pricing_json.py` likely still carries the `-0` SKU drop that nukes 18 CMVRs + ~31 hardware rows (incl. switches). Fix suffix regex to `-(1|12|36|60)$` BEFORE the next book refresh, or a regen silently re-breaks CMVR/switch pricing.
- **SKU coverage gaps:** `cred-fob` credentials (false-miss), Doorbird `DB-*` + `LUX-PCL-PLACEHOLDER` (no source), 8 Brivo SKUs absent from reseller book.

### SKU coverage — known markers (not bugs)
- **DZ04** camera: `sku:null` by design (no standalone SKU in Brivo sheet). Reads $0.00 cleanly.

---

## QUEUED PASSES

### Classifier v2 — DHW keyword expansion
- Extend `DHW_CLASSIFIER_RULES` (astragal, coordinator, threshold, gasketing, sweep, track, viewer, pocket-door lock, latching bolt, mounting plate; fire exit hardware; `cyl`). Door-operator → §2.2. Ride-along: `\b` word boundaries on `SECURITY_HARDWARE_PATTERN`.

### UX / copy
- **User-facing copy audit** — integrator jargon → plain language before SaaS.

### Other backlog
- **Camera Details Panel Redesign** — sliders w/ two-way canvas sync.
- **PDF scale-marker auto-recognition** — select scale bar → calibration. OCR lib TBD.
- **Catalog / rules** — Rules Page editor; LuxerOne / Doorbird / Hanwha SKU imports.
- **Accessories Tier-2 stub fill** — auto-match junction box / SD card to placed camera model (Brivo descriptions list compatible models, e.g. BX005 → DM08/DD07/DD08/DD10/DD11). Accessory-quantity model (no canvas placement for SFP/modem/junction box).
- **Network Tier-3 — modem + SFP + encoder** (parked). Scoped out of Switch Phase 1; revisit as accessory-quantity catalog vs additional placeables.

---

## HOUSEKEEPING

- **Cross-family drag markDirty asymmetry** — switch/head-end drag fires markDirty on mouseup only; cameras/readers/smart-apt/suites still fire per-mousemove-tick. Future cleanup pass to align all families to mouseup-only.
- **Over-capacity HDD TODO** — when ≥1 CMVR placed AND required retention > Σ usable TB across the fleet, emit expansion-drive rows. TODO at the recordingRows suppression site.
- **Dead-code sweep** — `.type-btn-cmvr.active` (pre-reskin), `.lp-breadcrumb`, `computeAutoCableRows()` (if now unused after CMVR-array unique-pages change — verify), `toggleCmvrModelList` comment ref, `cancelHeadendPlacement`/`cancelSwitchPlacement` (unhooked from place* in sticky pass — still called by resetLeftPaneDrilldown; decide consolidation), orphaned PNG assets.
- **CMVR glyph `currentColor` inconsistency** — CMVR tile SVG has hardcoded navy rect + white NVR text; doesn't tint via `currentColor` like Network/Accessories glyphs. Cosmetic.
- **Switch + head-end canvas-draw silhouette parity** — verify placed glyphs read as the same family as their Tier-2 tile icons.
- **Breadcrumb-as-tier3-header** — `#lp-bc2` doubles as "Camera Models" header. Revisit when the camera pane adopts static `<Mode> <Tier-role>` headers.
- **OneDrive-as-repo-home** — likely cause of recurring `source-data/pricing-template.json` deletion + `.gitignore` UTF-16 re-encode. Move repo outside the synced folder when convenient.
- **`source-data/pricing-template.json` recurring deletion** — `git checkout` to restore if it happens again.
- **Confirm `source-data/` ignore status** — fresh clone needs the price book; Load Pricing button (once restored) is the only way in.
- **Hard-reload after every CC save** before browser testing (localhost caches the HTML).
- **Centralize `IOT_DEFAULT_FLAGS`** — dup'd in `onIotDeviceToggle` + `applyProjectState`.
- **DHW BOM override re-apply hook** — `dhwBomRows()` not re-decorated by `bomAutoOverrides` on reload (verify vs M2).
- **Defer `bom*` code-symbol rename.**
- **Install LibreOffice** on Windows — kills the docs-PDF regen caveat.
- **User guide** — wizard, W7/W8, Hardware Module, BOM two-tier, customer BOM page, pricing load/use, CMVR + Switch 3-tier + accordion + sticky placement + selectable infrastructure all undocumented.

---

## PROJECT-INSTRUCTION / DESIGN-RULE STATE

Authoritative `PROJECT_INSTRUCTIONS.md` carries: universal 3-tier taxonomy (Tier 1/2 icon `.tier2-tile`, Tier 3 text-only `.tier3-tile` shared 5-col grid, no per-module override); tier-certainty rule (<80% → ask); specifics in right panel + `code:` field per entry; active-tile treatment (light fill + colored outline; per-group `.active-*`; solid-fill `.active` reserved for AC); alignment/inset rule; single-open accordion (progressive disclosure, one Tier-2 open, header hides with grid, single-owner visibility writer, cold-start arms nothing). _Paste latest into project settings — supersedes intermediates._

NOT yet written into instructions but now established behavior (candidate additions): sticky placement model (arm once → repeat-place → Esc/tile-toggle stops; one model armed tool-wide; select-placed disarms; hit-test wins over armed-place; armed-drag preserves arm same-family). Placement arrays: infrastructure that can be multi-per-page uses an array `[{id,page,x,y,sku,label}]` with `'<prefix>-'+Date.now()+rand` ids and `_nextInfraLabel(PREFIX,...)` — NOT a page-keyed map.

---

## GIT WORKFLOW

- Direct push to main is **blocked by harness**. All merges via PR.
- `gh auth login` done — CC now opens PRs via `gh pr create` directly (last few PRs landed this way).

---

## RESOLVED (removed from deferred)
- ~~SQ-wizard M1 chrome (3-step stepper, `.dhw-*` reuse)~~ — `d6fc56c` (PR #4).
- ~~SQ-wizard M2 (tier-filter relocation, counts to Summary, per-section pricing rule pills, SKU column, warn rows)~~ — `8042407`/`913e4ee` (PR #5/#6).
- ~~SQ-wizard M3 (Labour Flat/Hourly + per-row Cost/Sell, override dot, `_sqRowLabour`)~~ — `846fc08` (PR #7).
- ~~SQ-wizard M2d cleanup (`.tier1-tile` shared class, Storage Calc relocation)~~ — `cd59297` (PR #8).
- ~~SQ polish + Summary M4 xlsx + Total Units tile + editable Tax label + recalcBom throw fix + Labour subtotal in-place repaint + tier-filter band hide~~ — `2fe56cd` (PR #9).
- ~~Migration-alert removal (AC + camera-reach migration `alert()`s replaced with `console.info`)~~ — `0faf58f`.
- ~~Phase 2a + M5b (selectable switches + head-ends)~~ — `918a1d1` (PR #3).
- ~~Sticky placement (tool-wide)~~ — `918a1d1` (PR #3).
- ~~CMVR multi-per-page (map→array, v25)~~ — `918a1d1` (PR #3).
- ~~Headends-on-raw-reimport reset leak~~ — fixed in PR #3.
- ~~Switch Topology Phase 1~~ — `ec61a69` (PR #2).
- ~~CMVR head-end + accessories reskin + accordion~~ — `918a843` (PR #1).
- ~~Camera SKU mapping~~ — `dac382a`. ~~Pricing M2~~ — `aa1b5619`.
- ~~Switch placement scoping~~ · ~~legacy map switch system~~ · ~~switches reset leak~~ (Phase 1).
- ~~BOM two-tier template~~ · ~~Centered BOM modal~~ · ~~Customer BOM export page~~.
