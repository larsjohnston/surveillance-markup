# Pass: Hardware Module — home canvas + checklist + proposal Hardware Schedule

Turn Door Hardware from a scattered set of File-menu imports + a Proposal-menu wizard into a
proper **module**: a left-rail mode (key icon) opening a Hardware **home canvas** that presents
the job as a checklist/dashboard, relocates the hardware file actions onto it, shows live
status, launches the existing wizard for pricing, and produces a customer-facing **Hardware
Schedule** page in the proposal export.

Base: W8 merged to main at `3ad1029`. Branch off main: `git checkout main && git checkout -b hardware-module`.

Milestoned M1–M5, checkpoint-committed, browser-review gate after each. NOT overnight blind runs.

## Background — the workflow this models

The user's hardware job is an 8-step sequence:
1. Import door schedule (reference PDF)
2. Import hardware schedule (the Allegion takeoff CSV)
3. Email RFQ to suppliers (Export RFQ CSV — emailing is manual/external)
4. Import supplier quotes (CSV; repeatable, multiple suppliers)
5. Compare vendor pricing  ┐
6. Markup → hardware price   ├─ these three ARE the existing wizard (Comparison/Hardware/Labour)
7. Add labour               ┘
8. Output into the security package (the proposal Hardware Schedule page)

The home canvas presents 1–4 as setup actions with live status, collapses 5–7 into a single
"Price the hardware → opens the wizard" item, and 8 is the proposal export.

## Pre-existing pieces (don't rebuild — wire to them)
- Importers already exist: Attach Door Schedule PDF, Import Takeoff, Import Quote, Export RFQ —
  currently in the File menu.
- The 5-step wizard (Comparison → Hardware → AC Overlap → Labour → Summary) is built and on main.
- `doorHardware` state holds: importedTakeoff, hardwareQuotes[], sourceDocument (the PDF),
  hardwareAward (basis, lineSupplier, excluded, lineNotes), hardwarePricing (defaultMarkupPct,
  lineMarkupOverrides, hourlyRate, lineInstallHours, includeLabour, supplyOnly).

## Milestones

### M1 — Left-rail icon fill consistency + add the Hardware (key) mode
- **Fill all left-rail mode-switcher icons** to match the top two (which are filled). The lower
  icons are currently stroke/outline style; convert them to filled to match. Report which icons
  were changed (they're inline SVG — convert stroke to fill, matching the top two's approach).
- **Add a new left-rail mode: Hardware**, with a **key** icon (filled, same style). Clicking it
  switches the workspace to the new Hardware home canvas (M2). It's a mode like Cameras / AC /
  etc. — but its canvas is a dashboard, not a drawing surface (no on-canvas placement; that's
  deferred).
- Wire the mode switch (the same mechanism the other modes use). Report how modes are dispatched
  so the Hardware mode hooks in cleanly.
- `node --check`. COMMIT: "Hardware Module M1: fill left-rail icons consistently; add Hardware
  (key) left-rail mode + empty home canvas shell."
- **Browser gate:** all left-rail icons filled/consistent; new key icon present; clicking it
  switches to a (placeholder for now) Hardware canvas; other modes unaffected.

### M2 — Hardware home canvas: the checklist/dashboard
Build the Hardware home canvas as a checklist of the job, using the tool's tile + flat-icon
design language (consistent with the rest of the tool). Rows/tiles, each with a flat icon,
a label, a **live status**, and an action:

1. **Import Door Schedule** — action opens the door-schedule PDF picker. Status: "Not imported"
   / "<filename> ✓" when a sourceDocument exists.
2. **Import Hardware Schedule** — action opens the takeoff CSV picker. Status: "Not imported" /
   "<N> lines ✓" when importedTakeoff exists.
3. **Export RFQ** — always-available action (no done-state); generates the RFQ CSV to send to
   suppliers. Status: a hint like "Send to suppliers for pricing" (not a checkmark — it's a
   convenience action, non-gating).
4. **Import Quotes** — action opens the quote CSV picker; repeatable. Status: "No quotes" /
   "<supplier names> ✓" listing imported quotes (e.g. "CC Craig, Aline").
5. **Price the Hardware** — action LAUNCHES THE EXISTING WIZARD (the 5-step manager modal).
   Status: "Not started" / a summary when an award is confirmed (e.g. "Best-line — 57 priced,
   9 omissions" or "Awarded: CC Craig"). This single item collapses wizard steps compare +
   markup + labour; the wizard's own step indicator handles the sub-steps.
6. **Add to Proposal** — toggles the Hardware Schedule into the proposal export (M4/M5). Status:
   "Not in proposal" / "Included ✓". (Until M5 wires the export, this can be a disabled "coming
   in this pass" row — but prefer building it live in M5.)

- **Not gated** — every action is available in any order; the statuses just show what's done.
  But where an action has a hard data dependency (quotes match against the takeoff), show a soft
  visual hint (e.g. a muted note "import a hardware schedule first") without disabling — the
  user decides.
- **Live status** — each row reflects current `doorHardware` state, recomputed on render.
- `node --check`. COMMIT: "Hardware Module M2: home canvas checklist with live status; tiles
  for door schedule / hardware schedule / RFQ / quotes / price / proposal; launches wizard."
- **Browser gate:** canvas shows the 6-item checklist; importing a takeoff updates row 2's
  status live; importing a quote updates row 4; clicking "Price the Hardware" opens the wizard;
  status reflects an award after the wizard runs.

### M3 — Relocate hardware file actions out of the File menu
- **Remove from the File menu:** Import Takeoff, Import Quote, Export RFQ, Attach Door Schedule
  PDF. These now live ONLY on the Hardware home canvas (M2).
- **LEAVE in the File menu:** Load Pricing / Clear Pricing (the global price-book actions — to be
  removed entirely later when price books integrate directly; not part of this pass).
- The underlying handlers are unchanged — only their entry points move (from File-menu items to
  canvas tile actions). The canvas tiles in M2 should already call the same handlers; M3 just
  removes the now-duplicate File-menu entries.
- `node --check`. COMMIT: "Hardware Module M3: remove hardware import/RFQ/attach actions from
  File menu (now on the Hardware canvas); leave Load/Clear Pricing in File."
- **Browser gate:** File menu no longer lists the four hardware actions; they all still work
  from the canvas; Load/Clear Pricing still in File; no orphaned/broken menu items.

### M4 — Customer-facing Hardware Schedule proposal page (render)
Build the Hardware Schedule proposal page. It sits **after the Riser, before the Plans**
(Cover → BOM → Take-Off → Riser → **Hardware Schedule** → Plans).

- **SELL ONLY.** Never show cost, markup, supplier names, flags, or any internal data. Only the
  customer-facing sell prices (hardware sell = cost × (1+markup); labour sell = hours × rate).
- **Four presentation combinations** (a 2×2, chosen in the proposal export section — see M5):
  - **Detail:** Line-by-line  OR  Lump-sum (whole-job total only, no line rows)
  - **Split:** Hardware & labour shown SEPARATELY  OR  Combined into one price
  - So: line-by-line separate / line-by-line combined / lump-sum separate / lump-sum combined.
- **Line-by-line layout:** per included (awarded, non-excluded) line — a customer-appropriate
  description + qty + sell. In separate mode, hardware sell and labour sell as distinct
  amounts/columns; in combined mode, one price per line. Excluded lines do NOT appear. Gaps
  (unpriced) — decide: omit, or show as "by others / N/A" with no price (report your choice;
  lean omit, since a customer schedule shouldn't list unpriced phantom lines).
- **Lump-sum layout:** no line rows — just the totals. Separate mode: "Hardware: $X / Labour: $Y
  / Total: $Z". Combined mode: "Hardware & Installation: $Z".
- Reuse the riser/proposal table + page-overflow patterns (the brief references "reuse riser
  table/overflow") for consistent proposal styling and pagination.
- The page reads from the SAME resolved award + pricing the wizard Summary uses (resolveAward,
  dhwUnitSell, dhwLabourTotal), filtered to non-excluded lines, respecting supply-only (no
  labour when supply-only is on).
- `node --check`. COMMIT: "Hardware Module M4: customer-facing Hardware Schedule proposal page
  (sell-only; line-by-line/lump-sum × separate/combined), placed after Riser before Plans."
- **Browser gate:** page renders in all four combinations; sell-only (no cost/markup/supplier
  anywhere); correct placement in proposal order; excluded lines absent; supply-only suppresses
  labour; totals match the wizard Summary's sell figures.

### M5 — Proposal export integration + the 2×2 controls
- **Add the Hardware Schedule to the proposal export section** as a selectable section (a
  proposalSections toggle, like the other proposal pages). Off by default until the user opts in.
- **Add the 2×2 controls** in the proposal export UI for the Hardware Schedule section:
  Detail (line-by-line / lump-sum) and Split (separate / combined). Persist these choices
  (new fields on proposalInfo or the hardware proposal config — additive, backfill defaults:
  line-by-line + separate). markDirty on change.
- Wire the "Add to Proposal" checklist row (M2 row 6) to this toggle — the canvas row reflects
  and can set the proposal inclusion.
- The Hardware Schedule page renders in the export PDF when its section is enabled, in the four
  combinations per the controls.
- `node --check`. COMMIT: "Hardware Module M5: Hardware Schedule proposal section toggle + 2x2
  presentation controls (detail/split), wired to the canvas 'Add to Proposal' row; persisted."
- **Browser gate:** toggle the section on → Hardware Schedule appears in the proposal/export;
  the 2×2 controls switch the four layouts; choices persist across save/reload; the canvas
  row 6 status reflects inclusion.

## Constraints (every milestone)
- Vanilla JS, `var`, single file, no new dependencies (pdf.js + jsPDF only).
- Reuse existing tile/flat-icon design, mode-switch mechanism, proposal table/overflow patterns,
  tool palette (navy #111827, red #c8202c, white panels, Courier New). Consistent design on
  every module surface (per the standing tile-with-flat-icon rule).
- Engine sacred: resolveAward, compareBySupplier, compareBestLine, dhwUnitSell, dhwLabourTotal,
  dhwAcOverlap untouched. The canvas, checklist, and proposal page are presentation/wiring on top.
- Customer-facing page is SELL ONLY — no cost/markup/supplier/flags. This is a hard rule.
- markDirty() on every state mutation (proposal toggle, 2×2 choices).
- Save-format additive only (M5 proposal config fields). Backfill defaults in dhwNormalizeState
  or the proposal normalizer. No version bump unless forced.
- Surgical (Rule 1), read-before-write (Rule 2), fail loud (Rule 4).

## Stop conditions
- The mode-switch mechanism can't take a non-canvas (dashboard) mode without a refactor → STOP
  and describe before refactoring.
- The proposal page needs cost/markup/supplier to compute a sell figure → STOP (it shouldn't;
  sell is derivable from the resolved award + pricing without exposing internals).
- A milestone needs a decision not settled here → STOP, commit prior, ask.

## Known future architecture problem (NOT this pass — note for the queue)
**Cross-tie: door schedule ↔ hardware schedule ↔ floor plans.** Eventually a door on the floor
plan should tie to its door-schedule entry and its hardware-schedule line(s) — so the three
imports share openings/keys. Today they're independent (PDF reference, CSV line list, canvas
drawings) with no linkage. Matching openings across three sources that don't share keys is a
substantial data-model feature. Out of scope here; flagged so the module's structure leaves
room for it later.

## Out of scope (do NOT build)
- The cross-tie data model above.
- Suppliers importing quotes directly into a database (the step-3 future — "later version").
- On-canvas hardware placement (deferred).
- Price-book direct integration / removing Load-Clear-Pricing from File (later pass).

---

## ADDENDUM — Resolution safeguard (folded into M4/M5 + wizard)

Added after initial draft. Prevents sending a customer a proposal with a silently-missed line.

**Three states a takeoff/awarded line can be in:**
1. **Priced** — has a sell price → shows on the customer page with its price.
2. **Excluded / "by others"** — deliberately marked out (W7 Exclude) → shows on the customer page
   as "—" (no price), which honestly signals the proposal excludes it.
3. **Missed** — unpriced (gap) AND not excluded → the dangerous state: a forgotten line that
   would otherwise go to the customer with no price and no explanation.

**The safeguard: a "resolved" check** — every awarded line must be either priced OR excluded.
A line in state 3 (missed) is UNRESOLVED.

- **Customer page (M4):** excluded/"by others" lines render as "—" (no price). They are NOT
  omitted — showing them as "—" is the honest signal that they're out of scope. (This overrides
  the earlier "lean omit" note: excluded lines SHOW with "—", they don't disappear.) Genuinely
  unresolved (missed) lines should not reach a generated customer page — see the gate.
- **Proposal-generation gate (M5), WARNING not hard block:** when the user adds the Hardware
  Schedule to the proposal / generates the export with one or more UNRESOLVED lines, show a loud,
  impossible-to-miss warning, e.g.: "⚠ N lines are neither priced nor excluded — they won't show
  a price to the customer. Price them, or mark them by-others/excluded, before sending." The user
  MAY proceed anyway (not a hard block), but the warning must be prominent and require an explicit
  acknowledgement/continue rather than being passively dismissable.
- **Early warning in the wizard (Summary step):** also surface the unresolved count in the wizard
  Summary (and/or on the step indicator) — e.g. "⚠ N lines not yet priced or excluded" — so the
  user catches missed lines BEFORE reaching proposal generation. This realizes the previously-
  deferred "unpriced-hardware warning on step indicator" queue item, now with a precise meaning:
  it fires only on lines that are neither priced nor excluded (NOT on excluded/by-others lines,
  which are resolved).
- **Definition of "unresolved" in code:** an awarded line where the resolved award has no valid
  price (priced=false / no awarded unit cost) AND the line is not in hardwareAward.excluded.
  Excluded lines and priced lines are both "resolved." Compute from the existing resolved award +
  excluded map; no engine change.

This safeguard is the reason "by others" can be pushed through cleanly (it's a resolved,
deliberate state) while a bare gap cannot silently reach the customer.
