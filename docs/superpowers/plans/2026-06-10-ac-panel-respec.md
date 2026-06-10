# AC Panel Respec Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the Access Control left pane into Readers / Controllers / Credentials tier-1 tiles with an elevator toggle, make controllers auto-spec'd-and-tracked-for-placement, redesign credentials into Cards/Fobs/Mobile/Remotes icon tiles, and move elevator control into an in-panel modal with floor auto-count.

**Architecture:** Single-file browser app (`camera_markup_tool.html`). State on `projectInfo` + module-level arrays (`acDevices`, `cameras`, `pages`, …). BOM flows `computeAutoRows()` → `computeBomTree()` → renderers (on-screen `recalcBom`, PDF, CSV). Subscriptions via `computeSubscriptionRows()`. Pricing by SKU from `pricingBook.json`. Left-pane tiles are data-driven and rendered into `#lp-ac-tier2` / `#lp-ac-tier3`.

**Tech Stack:** Vanilla JS, jsPDF (bundled), no build step, no test runner.

**Verification primitives (used throughout):**
- **Syntax:** `python -c "import re,os; s=open(r'<repo>/camera_markup_tool.html',encoding='utf-8').read(); import re; open(os.environ['TEMP']+'/_chk.js','w',encoding='utf-8').write('\n;\n'.join(re.findall(r'<script(?![^>]*\\bsrc=)[^>]*>(.*?)</script>', s, re.S|re.I)))" && node --check "$TEMP/_chk.js"` → expect `exit 0`.
- **Logic harness:** a Node file that copies the pure function(s) under test (or replicates the rule) and asserts, run with `node`. Pattern: see `rules_test.js` used in prior passes (extract verbatim, assert, `process.exit(fail?1:0)`).
- **Visual (left pane):** open `camera_markup_tool.html` in a browser, switch to Access mode, eyeball the tiles/flow.
- **Visual (PDF/BOM):** the jsPDF+pymupdf render harness used previously for §2.1/§4.2 output.

> Line numbers are approximate (the file shifts as edits land) — locate each anchor by searching the quoted string.

---

## Phase 0 — Data model + migration (foundation)

### Task 0.1: Credentials/AC state shape + defaults

**Files:**
- Modify: `camera_markup_tool.html` — `projectInfo` initial literal (search `credentials: { fobs: 0, cards: 0`), and `applyProjectState` defaults (search `projectInfo.acHardwareConfig.powerMode = 'internal'`).

- [ ] **Step 1: Extend the credentials state shape.** In the `projectInfo` initial literal, change `credentials` to:

```js
credentials: { mobilePasses: 0, ohDoors: 0, ohTransmitters: 0, brivoSkus: {} },
```

(Cards/Fobs quantities live in `brivoSkus` keyed by SKU. `ohDoors` drives receiver qty; `ohTransmitters` is the user-entered transmitter count. `cards`/`fobs`/`ohReceiver` scalar fields are dropped — receiver qty is derived = `ohDoors`.)

- [ ] **Step 2: Add load-time defaults + migration in `applyProjectState`.** Immediately after the `acHardwareConfig.powerMode` default block, add:

```js
// AC respec: force auto-spec on (controllers are always auto-derived now).
projectInfo.acHardwareConfig.mode = 'on';
// Credentials shape + one-time migration off the deleted families.
if(!projectInfo.credentials || typeof projectInfo.credentials !== 'object') projectInfo.credentials = {};
var _cr = projectInfo.credentials;
if(typeof _cr.mobilePasses !== 'number' || _cr.mobilePasses < 0) _cr.mobilePasses = 0;
if(typeof _cr.ohDoors       !== 'number' || _cr.ohDoors < 0)       _cr.ohDoors = (typeof _cr.ohReceiver === 'number' ? _cr.ohReceiver : 0);
if(typeof _cr.ohTransmitters!== 'number' || _cr.ohTransmitters < 0)_cr.ohTransmitters = 0;
if(!_cr.brivoSkus || typeof _cr.brivoSkus !== 'object') _cr.brivoSkus = {};
// Strip deleted credential families (Dual-Tech *-SCP*, Pre-Punch B-SC-Punch-*).
var _DELETED_CRED = /(-SCP\d|SC-Punch-)/;
var _removed = 0;
Object.keys(_cr.brivoSkus).forEach(function(sku){ if(_DELETED_CRED.test(sku)){ delete _cr.brivoSkus[sku]; _removed++; } });
if(_removed > 0 && typeof showOneShotToast === 'function'){
  showOneShotToast('Removed ' + _removed + ' discontinued credential line' + (_removed>1?'s':'') + ' (Dual-Tech / Pre-Punch). Re-add under Credentials if needed.');
}
delete _cr.cards; delete _cr.fobs; delete _cr.ohReceiver;
```

- [ ] **Step 3: Syntax check.** Run the syntax primitive. Expected: exit 0.

- [ ] **Step 4: Commit.**

```bash
git add camera_markup_tool.html
git commit -m "feat(ac): reshape credentials state + force auto-spec on, with load migration"
```

### Task 0.2: Delete Dual-Tech & Pre-Punch from the credential catalog

**Files:** Modify `camera_markup_tool.html` — `BRIVO_CRED_CATALOG` (search `var BRIVO_CRED_CATALOG = {`).

- [ ] **Step 1: Remove the deleted-family rows.** Delete the entries whose `tier2_family` is `'Dual-Tech'` (`B-BUC3-37-SCP50`, `B-BUC3-56-SCP50`, `B-SCP-Custom`) or `'Pre-Punch Service'` (`B-SC-Punch-V`, `B-SC-Punch-H`). Keep Cards, Fobs, and the two Overhead-Door (Farpointe) rows. Ensure remaining object syntax stays valid (no trailing comma issues).

- [ ] **Step 2: Re-tag overhead family as Remotes (optional rename for clarity).** Leave the Farpointe SKUs' `section:'2.2'`; the UI groups them under "Remotes" by SKU prefix `FP-`, not by `tier2_family`, so no functional rename needed. Add a comment noting Remotes = `FP-WRR22` (receiver) + `FP-WRT2B` (transmitter).

- [ ] **Step 3: Syntax check + grep.** Run syntax primitive (exit 0). Grep for `SCP|Punch` in `BRIVO_CRED_CATALOG`'s range → expect no matches.

- [ ] **Step 4: Commit.** `git commit -m "feat(ac): drop Dual-Tech and Pre-Punch credential families"`

---

## Phase 1 — Custom icons

### Task 1.1: Prox-fob and car-remote SVG icons in `AC_ICONS`

**Files:** Modify `camera_markup_tool.html` — `AC_ICONS` map (search `var AC_ICONS = {`).

- [ ] **Step 1: Add icon entries.** Add keys used by the new tiles (24×24 viewBox, `currentColor`, stroke 1.5, matching existing entries):

```js
// Grey prox keyfob (teardrop body + hole). Used for the Credentials category
// tile and the Fobs tier-2 tile.
ProxFob: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="8" y="3" width="8" height="18" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="6.5" r="1.4" fill="none" stroke="currentColor" stroke-width="1.3"/><rect x="10.5" y="12" width="3" height="5" rx="1" fill="currentColor"/></svg>',
// Car-remote clicker (keyring loop + body + two buttons). Used for Remotes.
CarRemote: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="3.4" r="1.8" fill="none" stroke="currentColor" stroke-width="1.3"/><rect x="7" y="6" width="10" height="15" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="9.2" y="9" width="5.6" height="3" rx="1" fill="currentColor"/><circle cx="12" cy="16" r="1.3" fill="currentColor"/></svg>',
// Card (smart card) — for the Cards tile.
CredCard: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="3" y="9" width="18" height="2.2" fill="currentColor"/><rect x="6" y="14" width="6" height="1.4" fill="currentColor"/></svg>',
// Phone — for the Mobile tile.
MobilePass: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="7" y="2" width="10" height="20" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="10.5" y="18.5" width="3" height="1.4" rx="0.7" fill="currentColor"/></svg>',
```

- [ ] **Step 2: Syntax check.** Exit 0.

- [ ] **Step 3: Visual spot-check.** Temporarily render the four SVGs in a scratch HTML file (or browser console) to confirm shape reads correctly at 22×22. Adjust paths if a shape is unclear.

- [ ] **Step 4: Commit.** `git commit -m "feat(ac): add prox-fob, car-remote, card, phone icons"`

---

## Phase 2 — Panel framework (tier-1 categories + elevator toggle)

> Read the current AC render functions before editing: search `lpPickAcBrand`, `armAcDevice`, the renderers that write `#lp-ac-tier2` / `#lp-ac-tier3`, `acCredentialsView`, and `currentACCategory`. Mirror their tile markup (`.tier2-tile`, `.lp-tier-row`, `acIconFor(...)`).

### Task 2.1: Tier-1 = Readers / Controllers / Credentials

**Files:** Modify `camera_markup_tool.html` — AC panel HTML (search `<div id="ac-brand-grid">`) and the AC render entry point.

- [ ] **Step 1: Replace the brand grid with three category tiles.** In the `#ac-brand-grid` block, render three `.tier1-tile` tiles — Readers (`acIconFor('Readers')`), Controllers (`acIconFor('Controllers')`), Credentials (`acIconFor('ProxFob')`) — each calling a new `lpPickAcCategory('Readers'|'Controllers'|'Credentials')`. Keep `#lp-ac-tier2` / `#lp-ac-tier3` containers.

- [ ] **Step 2: Add `lpPickAcCategory(cat)`.** Near `lpPickAcBrand` (which it replaces/wraps):

```js
function lpPickAcCategory(cat){
  currentACCategory = cat;
  acCredentialsView = (cat === 'Credentials');
  currentACSubcategory = null;
  if(cat === 'Readers')          renderAcReaders();      // existing reader tier-2/3 render
  else if(cat === 'Controllers') renderAcControllers();  // Task 3.x
  else                           renderAcCredentials();  // Task 4.x
  paintAcTier1Active(cat);
}
```

Wire `renderAcReaders()` to the existing readers render path (today's Readers tier-2 → Mullion/Single/Keypad). `paintAcTier1Active` toggles `.active` on the chosen tile.

- [ ] **Step 3: Syntax check + browser check.** Switch to Access mode; confirm three tiles appear and Readers still places exactly as before.

- [ ] **Step 4: Commit.** `git commit -m "feat(ac): tier-1 Readers/Controllers/Credentials categories"`

### Task 2.2: Elevator toggle row beneath tier-1

**Files:** Modify AC panel HTML (below `#ac-brand-grid`); add handler near `lpPickAcCategory`.

- [ ] **Step 1: Add the toggle markup** beneath the category grid: a row with an "Elevator control" label + a switch input `id="ac-elev-toggle"` `onchange="onElevatorToggle(this.checked)"`. Reflect `projectInfo.elevatorControl.cabs > 0` as checked on render.

- [ ] **Step 2: Add `onElevatorToggle(on)`** — when turned on, open the elevator modal (Task 6); when turned off, set `elevatorControl = {cabs:0, floors:0}`, `markDirty()`, `recalcBom()`.

- [ ] **Step 3: Syntax + browser check.** Toggle shows; on→opens modal; off→clears.

- [ ] **Step 4: Commit.** `git commit -m "feat(ac): elevator control toggle in AC panel"`

---

## Phase 3 — Controllers (auto-spec, to-place tiles, flag, boards, power)

### Task 3.1: Controller requirement model — `acControllerPlan()`

**Files:** Modify `camera_markup_tool.html` — add a pure helper near the auto-spec block (search `─── AC Hardware Auto-Spec`).

- [ ] **Step 1: Write the logic harness** `controller_plan_test.js` replicating the door→controller tiering already in the auto-spec (`_hwD===1→ACS100`, `2→ACS300`, `3-6→ACS6100R`, `7-14→ACS6100L`, `15-22→L+R-EXP`, `23-28→L+L-EXP`) plus `_hwDB = ceil((D-2)/2)`. Assert the controller list (the placeable panels only — not DB/IO/power) for D=1,2,6,14,20,28. Run: `node controller_plan_test.js` → expect FAIL (no `acControllerPlan`).

- [ ] **Step 2: Extract `acControllerPlan()`** from the existing auto-spec so both the BOM emitter and the UI share one source. It returns `{ controllers: [{sku, name, qty}], boards: [{sku, name, qty}], power: [{sku,name,qty}] }`, where `controllers` are the placeable panels (ACS100/300/6100R/L incl. EXP chassis) and `boards`/`power` are read-only. Refactor the auto-spec block to build its rows from this function.

- [ ] **Step 3: Run harness** → expect PASS for all door counts.

- [ ] **Step 4: Syntax check + PDF/BOM render** (representative project) → §2.1 controller rows unchanged vs pre-refactor.

- [ ] **Step 5: Commit.** `git commit -m "refactor(ac): extract acControllerPlan() shared by BOM + UI"`

### Task 3.2: Controllers tier-2 = to-place tiles + placement flag

**Files:** Modify `camera_markup_tool.html` — add `renderAcControllers()`; add placement-count helpers.

- [ ] **Step 1: Add placement counters.**

```js
function requiredControllerCount(){ return acControllerPlan().controllers.reduce(function(s,c){ return s + c.qty; }, 0); }
function placedControllerCount(){ return acDevices.filter(function(d){ return acCategoryOf(d) === 'Controllers'; })
  .reduce(function(s,d){ return s + pageMultiplier(d.page); }, 0); }
```

- [ ] **Step 2: Add `renderAcControllers()`** into `#lp-ac-tier2`: one `.tier2-tile` per `acControllerPlan().controllers` entry (icon `acIconFor('ACS6100')`/`ACS300`/`ACS100` by sku, label `name`, qty badge). Clicking arms that exact controller SKU to place (reuse `armAcDevice('Controllers', <subcategory>)` with the SKU pre-resolved). Above the tiles, render a placement flag chip when `placedControllerCount() < requiredControllerCount()`: text `"{placed} of {required} controllers placed — place the rest"`, warning style.

- [ ] **Step 3: Suppress placed-controller BOM rows.** In `computeAutoRows` `acGroups` emission (search `acGroups[groupKey]`), skip placed devices whose `acCategoryOf === 'Controllers'` (the auto-spec emits controllers now). Keep readers. Add harness assertion: a project with placed controllers + readers emits controller rows once (from auto-spec), not twice.

- [ ] **Step 4: Syntax + harness + browser.** Place a controller → flag decrements; BOM controller qty stays = auto-spec.

- [ ] **Step 5: Commit.** `git commit -m "feat(ac): controllers as to-place tiles with placement flag; BOM from auto-spec only"`

### Task 3.3: Read-only board list + power-supply tiles

**Files:** Modify `camera_markup_tool.html` — extend `renderAcControllers()` to also fill `#lp-ac-tier3`.

- [ ] **Step 1: Render read-only board list** into `#lp-ac-tier3`: a non-interactive list of `acControllerPlan().boards` (two-door expansion, elevator I/O) + `.power` rows, each `name ×qty`. No click handlers.

- [ ] **Step 2: Render power-supply tiles** (Internal PSB / LSP / Altronix) as `.tier2-tile`s with icons (`ti`-style or simple SVG), clicking → `acSetPowerMode('internal'|'lsp'|'altronix')` (writes `acHardwareConfig.powerMode`, re-renders, `markDirty`, `recalcBom`). Active tile reflects current `powerMode`.

- [ ] **Step 3: Syntax + browser.** Boards list matches the §2.1 board rows; power tile changes flip the emitted PSU rows.

- [ ] **Step 4: Commit.** `git commit -m "feat(ac): read-only board list + power-supply tiles under Controllers"`

---

## Phase 4 — Credentials tiles (Cards / Fobs / Mobile / Remotes)

### Task 4.1: Credentials tier-2 icon tiles

**Files:** Modify `camera_markup_tool.html` — add `renderAcCredentials()` (replaces the old `acCredentialsView` grid render).

- [ ] **Step 1: Render four tier-2 tiles** into `#lp-ac-tier2`: Cards (`acIconFor('CredCard')`), Fobs (`acIconFor('ProxFob')`), Mobile (`acIconFor('MobilePass')`), Remotes (`acIconFor('CarRemote')`). Each calls `pickCredFamily('Cards'|'Fobs'|'Mobile'|'Remotes')`. Render count badges: Mobile = `mobilePasses`; Remotes = `ohDoors` (when > 0).

- [ ] **Step 2: `pickCredFamily(fam)`** routes to the tier-3 renderer for that family (Tasks 4.2 / 5 / 6-adjacent). Cards/Fobs → existing SKU-tile render filtered to that `tier2_family`.

- [ ] **Step 3: Syntax + browser.** Four tiles with the correct icons; Cards/Fobs tier-3 SKU tiles add to quote as before.

- [ ] **Step 4: Commit.** `git commit -m "feat(ac): credentials tier-2 icon tiles (Cards/Fobs/Mobile/Remotes)"`

### Task 4.2: Cards / Fobs tier-3 (carry over, minus deleted families)

**Files:** Modify `renderAcCredentials()` tier-3 path.

- [ ] **Step 1:** For Cards/Fobs, render tier-3 tiles from `BRIVO_CRED_CATALOG` filtered to `tier2_family === fam`, reusing the existing add-to-quote flow (`projectInfo.credentials.brivoSkus[sku] += qty`). Confirm only the surviving SKUs (37/56/custom) appear.
- [ ] **Step 2: Syntax + browser + BOM render** — §2.1 credential rows for added cards/fobs.
- [ ] **Step 3: Commit.** `git commit -m "feat(ac): Cards/Fobs tier-3 options on the new credentials view"`

---

## Phase 5 — Remotes (overhead transmitter/receiver)

### Task 5.1: Door-count prompt → receivers; transmitter rule

**Files:** Modify `camera_markup_tool.html` — `pickCredFamily('Remotes')` path; reuse/extend `credentials-qty-modal`.

- [ ] **Step 1: Logic harness** `remotes_test.js` for the emit rule: given `{ohDoors, ohTransmitters}` produce rows — receiver `FP-WRR22` qty = `ohDoors`; transmitter `FP-WRT2B` qty = `ohTransmitters`; **invariant: if `ohTransmitters > 0` then effective receivers = `max(ohDoors, 1)`**. Assert: (0,0)→none; (2,0)→2 rcv,0 tx; (0,5)→1 rcv,5 tx; (3,5)→3 rcv,5 tx. Run → FAIL.

- [ ] **Step 2: Implement the Remotes view.** First click on Remotes (when `ohDoors === 0`) opens the qty modal titled "Overhead doors" → saves `credentials.ohDoors`. Tier-3 shows Transmitter (editable qty → `ohTransmitters`) + Receiver (read-only, `= max(ohDoors,1)` when transmitters>0 else `ohDoors`). Clicking the Remotes tile badge reopens the door-count modal.

- [ ] **Step 3: Emit rows in `computeAutoRows`** (replace today's `ohTransmitters`/`ohReceiver` per-type emission): push `FP-WRR22` qty `effectiveReceivers` and `FP-WRT2B` qty `ohTransmitters` (priced from book) with `section:'2.2'`. Make the harness logic match this code exactly.

- [ ] **Step 4: Run harness (PASS) + syntax + BOM render** — §2.2 shows receiver/transmitter with the rule enforced.

- [ ] **Step 5: Commit.** `git commit -m "feat(ac): Remotes (overhead) door-count→receivers + transmitter rule"`

---

## Phase 6 — Mobile passes (subscription)

### Task 6.1: Mobile-pass subscription rows (incl. multifamily 500-included)

**Files:** Modify `camera_markup_tool.html` — `computeSubscriptionRows()` (search `function computeSubscriptionRows`); Mobile tier-3 in `renderAcCredentials`.

- [ ] **Step 1: Logic harness** `mobile_test.js` for the pack rule. **Packing algorithm (explicit, deterministic):** packs = {1000, 500, 100}. To cover an overage `o`: repeatedly subtract the largest pack ≤ remaining; if a remainder `0 < r < 100` is left at the end, add one 100-pack. (Greedy least-overshoot; overshoot always < 100.) Worked examples to assert:
  - o=0 → `[]`; o=50 → `[B-MP-100×1]`; o=120 → `[B-MP-100×1]`+remainder20→`[B-MP-100×2]`; o=600 → `[B-MP-500×1, B-MP-100×1]`; o=1500 → `[B-MP-1000×1, B-MP-500×1]`.
  - **multifamily:** always include a `B-MP-500` line of qty 500 at `$0` ("included"); then cover `o = max(count-500, 0)` with the packing above.
  - **non-multifamily:** cover `count` with the packing above (no included line).
  - SKU term suffix `-1`/`-12` per `projectInfo.subscriptionTerm` (e.g. `B-MP-500-1`).
  Run → FAIL (no implementation yet).

- [ ] **Step 2: Implement** in `computeSubscriptionRows()`: read `projectInfo.credentials.mobilePasses`; if multifamily (`_subGatewayUnitCount() > 0`) push the included-500 `$0` row; push overage packs; else push packs for the full count. Use `getUnitPrice`/`getListPrice` with the term suffix.

- [ ] **Step 3: Mobile tier-3 UI** — a single qty entry (reuse the qty modal) writing `credentials.mobilePasses`; badge on the Mobile tile. Show an inline "500 included" note when multifamily.

- [ ] **Step 4: Run harness (PASS) + syntax + subscription render** — §6 shows the included + overage lines.

- [ ] **Step 5: Commit.** `git commit -m "feat(ac): mobile-pass subscription rows with multifamily 500-included"`

---

## Phase 7 — Elevator modal + floor auto-count; remove Project Info fields

### Task 7.1: Floor auto-count helper

**Files:** Modify `camera_markup_tool.html` — add `buildingFloorCount()` near `pageMultiplier`.

- [ ] **Step 1: Harness** `floors_test.js`: `buildingFloorCount()` = Σ `pageMultiplier(i)` over pages. Assert with stub pages: [×1,×1]→2; [×10,×1]→11. Run → FAIL.
- [ ] **Step 2: Implement** `function buildingFloorCount(){ return pages.reduce(function(s,_,i){ return s + pageMultiplier(i); }, 0); }`.
- [ ] **Step 3: Harness PASS + syntax.**
- [ ] **Step 4: Commit.** `git commit -m "feat(ac): buildingFloorCount() = sum of floor multipliers"`

### Task 7.2: Elevator modal

**Files:** Modify `camera_markup_tool.html` — add a modal `#elevator-modal` (mirror `#credentials-qty-modal` markup); handlers near `onElevatorToggle`.

- [ ] **Step 1: Add modal markup** with two number inputs (`#elev-cars`, `#elev-floors`) + Cancel/Save. Title "Elevator control".
- [ ] **Step 2: `openElevatorModal()`** prefills `#elev-cars` = `elevatorControl.cabs || 1`, `#elev-floors` = `elevatorControl.floors || buildingFloorCount()`; `saveElevator()` writes `elevatorControl = {cabs, floors}`, re-syncs the toggle, `markDirty()`, `recalcBom()`, closes.
- [ ] **Step 3: Wire `onElevatorToggle(true)` → `openElevatorModal()`**; cancel with no prior config reverts the toggle to off.
- [ ] **Step 4: Syntax + browser + BOM render** — boards = `cabs × ⌈floors/8⌉`, cab readers = `cabs` (existing `computeAutoRows` elevator block already does this; just reads the same state).
- [ ] **Step 5: Commit.** `git commit -m "feat(ac): elevator modal with floor auto-count"`

### Task 7.3: Remove Project Info elevator fields

**Files:** Modify `camera_markup_tool.html` — Project Info modal (search `proj-elev-cabs`), `openProjectModal`, `saveProjectInfo`.

- [ ] **Step 1: Delete** the Elevator Control section markup, the `openProjectModal` populate lines for `proj-elev-*`, and the `elevatorControl` read in `saveProjectInfo` (the AC modal owns it now; the field persists via the normal save of `projectInfo`). Confirm `projectInfo.elevatorControl` is still carried through `saveProjectInfo`'s object (add a carry-over line if the wholesale-replace would drop it).
- [ ] **Step 2: Syntax + browser** — Project Info no longer shows elevator fields; AC toggle still drives it; save/load round-trips `elevatorControl`.
- [ ] **Step 3: Commit.** `git commit -m "refactor(ac): move elevator ownership from Project Info to AC panel"`

---

## Phase 8 — Final verification

### Task 8.1: End-to-end regression

- [ ] **Step 1:** Syntax primitive → exit 0.
- [ ] **Step 2:** Build a representative project (readers across floors, a multifamily gateway, overhead doors, elevator on) and render the full proposal PDF via the jsPDF+pymupdf harness. Verify: §2.1 controllers (auto, no dupes) + cab readers + elevator boards; §2.2 receiver/transmitter; §4.2 MF training (prior pass); §6 mobile-pass included + overage.
- [ ] **Step 3:** Load an OLD save (with placed elevator board / Dual-Tech creds / Project-Info elevator) → confirm migration toasts fire once and nothing double-counts.
- [ ] **Step 4:** Final commit. `git commit -m "test(ac): end-to-end respec verification"`

---

## Self-review notes (spec coverage)

- Spec §3.1 panel → Tasks 2.1, 2.2. §3.2 readers → unchanged (2.1 wires existing path). §3.3 controllers → 3.1–3.3. §3.4 credentials → 4.1–4.2, 5.1, 6.1. §3.5 elevator → 7.1–7.3. §4 data model → 0.1. §5 migration → 0.1, 0.2, 7.3, 8.1. §6 BOM routing → 3.2 (controller suppression), 5.1 (§2.2), 6.1 (§6). §7 acceptance → 8.1. §8 non-goals (wallet passes) → omitted by design.
- Open follow-ups to confirm during execution: exact greedy mobile-pack packing rule (lock in Task 6.1 harness); exact `armAcDevice` signature for pre-resolved controller SKUs (read before Task 3.2).
