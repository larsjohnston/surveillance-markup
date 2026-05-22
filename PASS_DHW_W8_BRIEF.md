# Pass: Door Hardware W8 — Comparison click-to-select + column sums + non-cheapest flag + notes

Improvements to the Comparison step (Step 1) Best-by-Line view of the Door Hardware wizard.
Base: W7 merged to main at `03b87ed`. Branch off main: `git checkout main && git checkout -b dhw-w8`.

Milestoned W8a–W8c, checkpoint-committed, browser-review gate after each. NOT an overnight
blind run — this is interaction-model + new-persisted-state work.

## Context (current Best-by-Line state, post-wizard)

Step 1 Comparison has two views. The **Best by Line** view shows one row per takeoff line:
Qty · Description · Catalog#/SKU · Finish · one price column PER SUPPLIER · Best. Today the
per-line supplier choice is a `<select>` dropdown (Auto/supplier names) writing
`hardwareAward.lineSupplier[matchKey]`. The cheapest valid cell is tinted green automatically.
Picks STAGE (don't confirm); award confirms on Continue (basis=null is the staged sentinel).
The supplier `<select>` is part of the Tab/Enter column-down keyboard nav.

W8 replaces the dropdown with click-to-select, adds column sums, a non-cheapest cost flag, and
per-line notes.

## Milestones

### W8a — Click-to-select supplier cells (replace the dropdown)
- **Remove the per-row supplier `<select>`.** Replace with click-to-select on each supplier's
  PRICE CELL:
  - On load, the cheapest valid supplier per line is **pre-selected** (matches today's
    auto-cheapest default — write these into the effective selection, or keep them implicit;
    see state note).
  - Click any supplier's price cell on a row → that supplier becomes the chosen one for that
    line. Writes `hardwareAward.lineSupplier[matchKey] = supplierName` (same state as the
    dropdown wrote — just a different input mechanism).
  - **One green cell per row = the selected supplier.** When the user picks a different
    supplier, the previously-green cell loses its tint; only the chosen cell is green.
  - **Clicking the already-selected cell does nothing** (NOT click-to-clear). To revert a
    manual pick back to cheapest, the user clicks the cheapest cell.
  - **Gap cells** (supplier didn't price the line, shows "—") are NOT clickable / not
    selectable.
  - The **Best column** continues to show the chosen supplier's price + name, driven by the
    selection.
  - Add a clear hover + cursor cue so users know price cells are clickable.
- **Staging/confirm unchanged (F4):** clicking a cell STAGES the pick — does NOT flip the
  status pill to Awarded. Award still confirms on Continue from Comparison. markDirty on each
  pick.
- **State note:** keep using `hardwareAward.lineSupplier[matchKey]`. Decide whether the
  pre-selected cheapest is written explicitly into the map on load or left implicit (resolver
  falls back to cheapest when a matchKey isn't in the map, as today). Implicit is less state
  churn and matches current resolveAward behavior — prefer implicit unless the green-cell
  rendering needs the explicit value. Report which you chose.
- **Keyboard nav:** the `<select>` is gone, so the supplier column's Tab/Enter down-nav
  (built in the wizard) no longer has a form element to target. Either (a) make the price
  cells focusable (tabindex) + Enter/Space to select + Tab/Enter to move down the column, or
  (b) drop the supplier column from the column-nav set entirely. Pick one, implement, and
  report which. Don't leave a broken/half-working nav on that column.
- Engine untouched (resolveAward still consults lineSupplier).
- `node --check`. COMMIT: "Door Hardware W8a: Best-by-Line click-to-select supplier cells
  (replaces dropdown); one green cell = selected; cheapest pre-selected; gaps not selectable;
  staging unchanged."
- **Browser gate:** cheapest pre-selected/green on load; click a non-cheapest cell → it goes
  green, old loses green, Best column updates, status stays Unawarded (staged); click the
  selected cell → nothing; gap cells not clickable; Continue confirms the award; keyboard nav
  on the column works or is cleanly removed (per your choice); save/reload persists picks.

### W8b — Column sums + non-cheapest flag
- **Column sums at the bottom of Best-by-Line:** a footer row summing each supplier's column —
  the whole-job cost from that supplier (Σ qty × that supplier's unit cost over the lines they
  priced; gaps/unpriced-by-that-supplier contribute nothing). One sum per supplier column.
  (This is each supplier's effective whole-package number, parallel to the By Supplier view's
  package cost.)
- **Non-cheapest flag:** a summary flag/banner showing how many selected lines are NOT the
  cheapest option, and the extra cost it represents:
  - Count = number of lines whose selected supplier (via lineSupplier or the pre-selected
    cheapest) is NOT the lowest-cost valid supplier for that line.
  - Extra cost = Σ over those lines of (qty × selected unit cost − qty × cheapest valid unit
    cost). I.e. how much more than rock-bottom the current selections cost.
  - Display e.g.: "⚠ N lines not at lowest price — $X above cheapest."
  - If every selection is the cheapest, no flag (or a muted "all lines at lowest price").
- The flag is clickable → opens the notes list (W8c). In W8b it can just be the flag; wire the
  click in W8c.
- All computed from the comparison data + current selections; no engine change.
- `node --check`. COMMIT: "Door Hardware W8b: per-supplier column sums + non-cheapest flag
  (count + extra cost vs cheapest)."
- **Browser gate:** column sums correct per supplier; pick a non-cheapest supplier on a line →
  flag count increments and extra-cost rises by that line's delta; revert to cheapest → flag
  decrements; all-cheapest → no flag.

### W8c — Per-line notes (the flag-annotation feature)
- **Click the non-cheapest flag → opens a list** of the non-cheapest lines (or all lines —
  decide; the natural scope is the lines that aren't cheapest, since notes explain WHY you
  didn't take cheapest). Report which scope you chose.
- Each line in that list gets a **notes field** the user can type into, to explain the
  non-cheapest choice (e.g. "lead time", "quality", "supplier C had a gap").
- **New persisted state:** `hardwareAward.lineNotes` — object map `{ matchKey: "note text" }`.
  Additive; backfill missing → `{}` in dhwNormalizeState. markDirty on note edit. (Object map,
  not a Set/array.)
- Notes are INTERNAL (estimator's reasoning) — they do NOT appear on the customer proposal.
  Where they surface beyond this list (e.g. a notes column on the Summary, a hover) is future;
  for W8c just the list-with-notes opened from the flag.
- `node --check`. COMMIT: "Door Hardware W8c: per-line notes on non-cheapest selections,
  opened from the flag; persisted hardwareAward.lineNotes."
- **Browser gate:** click flag → list of non-cheapest lines opens; type a note → persists;
  save/reload → notes restore; notes don't leak to any customer-facing view.

## Constraints (every milestone)
- Vanilla JS, `var`, single file, no new dependencies.
- Reuse existing modal CSS, the green-cheapest tint convention, info/flag patterns, tool
  palette (navy #111827, red #c8202c, white panels, Courier New).
- Engine sacred: resolveAward, compareBySupplier, compareBestLine, dhwUnitSell, dhwLabourTotal,
  dhwAcOverlap untouched. Selections, sums, flag, and notes are display/state layers on top.
- Save-format additive only: `hardwareAward.lineNotes` (W8c, object map). Backfill in
  dhwNormalizeState. No version bump unless forced.
- markDirty() on every state mutation (pick, note edit).
- Don't break the W7 work (exclude, supply-only) or the staging/confirm-on-Continue flow.
- Surgical (Rule 1), read-before-write (Rule 2), fail loud (Rule 4).

## Stop conditions
- Click-to-select requires changing resolveAward rather than reusing lineSupplier → STOP and
  flag before touching the engine.
- The keyboard-nav decision (W8a) turns out to need a bigger refactor than (a)/(b) → STOP and
  describe before doing it.
- A milestone needs a UX decision not settled here → STOP, commit prior, ask.

## Out of scope (do NOT build)
- M4 customer-facing proposal pages. Notes are internal and don't surface there.
- Surfacing notes anywhere beyond the flag-opened list (Summary notes column, hovers) — future.
- PO consolidation / tie-break (separate future pass) — though the non-cheapest flag is related
  context for it.
