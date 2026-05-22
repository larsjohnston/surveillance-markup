# Pass: Door Hardware W7 — Supply-only + Exclude + Zero-labour warning

Three interdependent additions to the Door Hardware manager wizard (now on main at `89cd2fe`).
Ship together: the zero-labour warning must know what's excluded and whether supply-only is on,
so all three land in one pass. Build on a fresh branch off main.

Base: M3.5 wizard is merged to main. Branch: `git checkout main && git checkout -b dhw-w7`.

Milestoned W7a–W7c, checkpoint-committed, browser-review gate after each. NOT an overnight
blind run.

## The three features

1. **Supply-only toggle** — for jobs with no install labour (supply hardware only).
2. **Exclude** — mark any line excluded; it leaves the hardware schedule and all totals, and
   lists in a dedicated Excluded section on the Summary. This is how unpriced gaps get
   resolved: a line is either priced or explicitly excluded.
3. **Zero-labour warning** — flag priced lines that have no labour entered, so the user
   doesn't forget to price install on a real line.

## Milestones

### W7a — Exclude (Step 2 Hardware + Step 5 Summary section)
- **Per-line Exclude control on Step 2 Hardware.** Every line in the awarded hardware list
  (ANY line — priced, flagged, or gap) gets an exclude control (a button or small toggle in
  a new cell). Reversible — the user can un-exclude.
- **Excluded lines drop out entirely:**
  - Removed from the Step 2 hardware schedule's active list (or visibly struck/moved — see
    UX note below), and from the hardware cost/sell subtotal.
  - Dropped from the Step 4 labour table (no labour on an excluded line) and labour totals.
  - Dropped from the Step 5 Summary main table, Sums row, Grand Total, and Project Totals box
    (cost, sell, labour, margin — excluded lines contribute to NONE of it).
- **New "Excluded" section on Step 5**, at the BOTTOM of the step, ABOVE the Project Totals
  box. Lists excluded lines showing **line identifiers only**: Qty · SKU · Description ·
  Finish. No pricing, no cost — just what was left out, so the estimator/customer sees the
  deliberate exclusions. If nothing is excluded, the section doesn't render.
- **State:** `hardwareAward.excluded` — a map/object of `{ matchKey: true }` (use an object,
  not a JS Set, so it serializes to JSON cleanly). Additive; backfill missing → `{}` in
  dhwNormalizeState. A line is excluded iff `hardwareAward.excluded[matchKey]` is truthy.
- **markDirty** on every exclude/un-exclude.
- **UX note (decide and report):** on Step 2, does an excluded line stay in place visually
  (struck-through / greyed, with an "un-exclude" affordance) or move to a small "Excluded"
  group at the bottom of Step 2 too? Either is fine — pick the clearer one and report which.
  The Step 5 Excluded section is required regardless.
- **Interaction with award resolution:** exclusion is a layer ON TOP of `resolveAward` — don't
  change the engine. Resolve the award as today, then filter out excluded matchKeys when
  building each step's displayed/totalled line set. Keep `resolveAward` untouched.
- `node --check`. COMMIT: "Door Hardware W7a: per-line Exclude on Hardware step; excluded
  lines drop from all totals; Excluded section on Summary (identifiers only)."
- **Browser gate:** exclude a line on Step 2 → it leaves the hardware subtotal, the labour
  table, and the Summary main table + all totals; it appears in the Summary Excluded section
  with just Qty/SKU/Description/Finish; un-exclude restores it everywhere; save/reload
  persists the excluded set.

### W7b — Supply-only toggle (Step 4 Labour)
- **Toggle on Step 4, positioned ABOVE the hourly rate**, labelled "Supply only".
- **ON:**
  - Hides the per-line labour table AND the hourly rate input.
  - Shows a clear "Supply Only" notice in the step's main container (so it's obvious labour
    is intentionally excluded).
  - Labour is excluded from ALL totals everywhere — Step 5 labour total = 0 / not shown,
    Grand Total = hardware only, Project Totals labour line = 0 (or hidden), margin math uses
    hardware only.
- **OFF (default):** everything as it is today.
- **State:** `hardwarePricing.supplyOnly`, boolean, default false. Additive; backfill missing
  → false in dhwNormalizeState. markDirty on toggle.
- Consider how supply-only interacts with the includeLabour column-combine toggle on Step 5:
  when supply-only is ON there's no labour, so the combine toggle is moot — hide or disable
  it, and don't show a Labour/Total split that implies labour exists. Report how you handled
  it.
- `node --check`. COMMIT: "Door Hardware W7b: Supply-only toggle on Labour step — hides
  labour UI + rate, shows Supply Only notice, excludes labour from all totals."
- **Browser gate:** toggle Supply-only ON → labour table + hourly rate hidden, "Supply Only"
  notice shown, Step 5 grand total + Project Totals reflect hardware only with no labour;
  toggle OFF → labour returns; save/reload persists the flag.

### W7c — Zero-labour warning (Step 4 Labour)
- **At the bottom of Step 4**, when (and only when) supply-only is OFF: show a warning when
  any qualifying line has 0 or blank install hours.
  - Warning text: "⚠ N lines have no labour entered" (N = count of qualifying lines).
  - **Highlight those rows** in the labour table (warn-color row tint).
  - **Qualifying lines = priced/awarded lines that are NOT excluded.** Gaps (unpriced lines)
    do NOT count — they have no hardware, so they need no labour. Excluded lines do NOT count.
  - Live: as the user enters hours, N drops and the highlight clears on filled rows.
  - If every qualifying line has labour, no warning shows.
- **When supply-only is ON, the warning is suppressed entirely** (no labour expected).
- `node --check`. COMMIT: "Door Hardware W7c: zero-labour warning on Labour step — counts
  priced non-excluded lines with no hours, highlights rows, suppressed when supply-only."
- **Browser gate:** with several priced lines blank → warning shows correct count + those
  rows highlighted; enter hours → count drops, highlight clears; exclude a blank line → it
  leaves the count; gaps never count; toggle supply-only ON → warning disappears.

## Constraints (every milestone)
- Vanilla JS, `var`, single file, no new dependencies.
- Reuse existing modal CSS, toggle/button patterns, tool palette (navy #111827, red #c8202c,
  white panels, Courier New).
- **Do NOT change the M1 engine.** `resolveAward`, `compareBySupplier`, `compareBestLine`,
  `dhwUnitSell`, `dhwLabourTotal`, `dhwAcOverlap` stay untouched. Exclude and supply-only are
  display/filter layers applied on top of the resolved line set, NOT changes to how the award
  resolves.
- Save-format additive only: `hardwareAward.excluded` (W7a, object map), `hardwarePricing.supplyOnly`
  (W7b, boolean). Backfill both in dhwNormalizeState. No version bump unless forced.
- markDirty() on every state mutation.
- Excluded lines and supply-only affect TOTALS and the customer-relevant view — make sure the
  Step 5 table tools (filter/sort/hide/columns) and the "totals reflect all lines" caption
  still hold: "all lines" means all NON-excluded awarded lines. Excluded lines are out of the
  totals scope by definition, separate from the viewing-lens filters. Don't conflate the two.
- Surgical (Rule 1), read-before-write (Rule 2), fail loud (Rule 4).

## Stop conditions
- Excluding correctly requires changing resolveAward rather than filtering on top → STOP and
  flag before touching the engine.
- A milestone needs a UX decision not settled here → STOP, commit prior, ask.

## Out of scope (do NOT build)
- M4 customer-facing proposal pages (the Excluded section here is the INTERNAL Summary's; the
  customer proposal's handling of exclusions is M4).
- PO generation / tie-break (separate future pass).
- The "priced by others -> Overlap subsection" reclassification (separate; W7 exclude is the
  manual mechanism, that item is the automatic by-others move).
