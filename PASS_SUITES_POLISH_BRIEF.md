# Pass: Suites UI Polish + Per-Unit-Type IoT

*Created May 19, 2026 — post-Pass-N+1, sequenced between Take-Off M1 and Take-Off M2.*

## Context

Three changes to the Suites mode, bundled together because they share UI surface and one of them forces a model migration that the other two are visually entangled with:

1. **Visual consistency.** The Suites mode left-pane currently exposes two blue rectangular buttons ("Manage Unit Types…" and "IoT Devices…"). Every other mode uses tile-style entry points (the Tier-1 brand/style picker aesthetic). The Suites mode should match.

2. **Duplicate-name validation.** The Unit Types modal currently allows two rows with identical labels. This silently breaks downstream lookups and produces ambiguous BOM rows. Add a validation block — duplicates throw an inline error and prevent save.

3. **Per-unit-type IoT counts.** Today, `projectInfo.iotDevices = { smartLock: false, thermostat: false, waterSensor: false }` — three boolean flags applied uniformly to every suite. New model: the IoT modal selects which IoT devices are *available for use in the project*, and each unit type row in the Unit Types modal gets a column per available device where the user enters the per-suite count for that unit type. This is what the v1.1 user guide called out as "Per-unit-type rules — coming later via Rules Page editor" — we're bringing it forward.

Bundling (1) + (2) + (3) into one pass because change (3) restructures the Unit Types modal columns anyway, and change (1) restructures the entry buttons that open both modals. Doing them sequentially would touch the same surface three times.

## Model migration: today vs. after

### Before (M8 model)

```
projectInfo.iotDevices = {
  smartLock: false,
  thermostat: false,
  waterSensor: false,
}

projectInfo.unitTypes = [
  { id: 'ut-1', label: '1BR / 1BA', bedrooms: 1, bathrooms: 1 },
  …
]

// BOM SMART APARTMENT IoT auto-rows:
// For each flag === true, qty = total suite count × pageMultiplier
```

### After (this pass)

```
projectInfo.iotDevices = {
  // SAME keys, but the boolean now means "this device is available
  // for unit-type-level configuration". Unchecking removes columns
  // from the Unit Types modal AND removes the device from BOM auto-rows
  // entirely.
  smartLock: false,
  thermostat: false,
  waterSensor: false,
}

projectInfo.unitTypes = [
  {
    id: 'ut-1',
    label: '1BR / 1BA',
    bedrooms: 1,
    bathrooms: 1,
    iotCounts: {            // NEW — present only when iotDevices flags exist
      smartLock: 1,
      thermostat: 1,
      waterSensor: 0,       // 0 = this unit type doesn't get this device
    },
  },
  …
]

// BOM SMART APARTMENT IoT auto-rows:
// For each iotDevices flag === true, qty = sum over unit types of
//   (suite count of that type × pageMultiplier × iotCounts[device])
```

### Backwards compatibility

On project load, `applyProjectState` backfills:

- If a save has the old `iotDevices` flags and the unit types lack `iotCounts`: for each unit type, populate `iotCounts[device] = 1` for every device whose flag is currently true; `0` for false. This preserves the M8 "every suite gets every flagged device" behavior exactly.
- If a save lacks `iotDevices` entirely (pre-M8): default flags to all-false and unit types get no `iotCounts` (or empty `{}`).
- If a save has both fields: trust them as-is.

No JSON version bump needed — additive shape.

### Default for newly-created unit types

When the user clicks "+ Add Unit Type" in Modal #1, the new row's `iotCounts` initialize to **1 for every device whose flag is currently true**, **0 for false**. This mirrors current M8 behavior and minimizes clicks for the common case (most unit types will use the same IoT-count profile). The user can edit any cell to override.

## UI changes

### Suites left-pane entry points

Replace the two blue rectangular buttons with two Tier-1-style tiles:

```
┌───────────────────┐  ┌───────────────────┐
│   🏘️              │  │   🔌              │
│   Unit Types      │  │   IoT Devices     │
│   (N defined)     │  │   (N selected)    │
└───────────────────┘  └───────────────────┘
```

Match the visual style of the brand/style tiles in other modes — same border, same hover state, same selected state, same proportions. The count footer ("N defined" / "N selected") replaces an explicit "manage" button label with a state hint. Clicking the tile opens the corresponding modal.

If a count is 0, the tile shows a subdued state (similar to how disabled drill-down tiles look).

### Unit Types modal — new dynamic columns

Existing columns: **Bedrooms | Bathrooms | Label | ×**

After this pass, dynamic IoT columns appear between Bathrooms and Label, one per `iotDevices` flag === true:

```
┌─────────┬───────────┬───────────┬───────────┬─────────────────────┬───┐
│ BR      │ BA        │ SMART LOCK│ THERMOSTAT│ LABEL               │ × │
├─────────┼───────────┼───────────┼───────────┼─────────────────────┼───┤
│   1     │   1       │     1     │     1     │ 1BR / 1BA           │ × │
│   2     │  1.5      │     1     │     1     │ 2BR / 1.5BA         │ × │
│   3     │   2       │     2     │     2     │ Penthouse           │ × │
└─────────┴───────────┴───────────┴───────────┴─────────────────────┴───┘
```

When zero IoT devices are selected in the IoT modal, the columns vanish and the modal looks identical to its M8 state.

IoT cell input: number input, min 0, max 10 (cap suggestion — adjust if you have a real ceiling), integer only. Empty cell = 0.

Column headers use the same uppercase styling as BEDROOMS / BATHROOMS / LABEL. Header label = the device's display name in caps (`SMART LOCK`, `THERMOSTAT`, `WATER SENSOR`).

### Duplicate-name validation

In `saveUnitTypes`, after the cleaned-row pass:

- Build a Set of lowercase-trimmed labels.
- If any duplicate is found, abort save, show inline error: `"Two unit types share the name '<label>'. Each unit type needs a unique label."`
- Error displays in the existing error region of the modal (or add one if it doesn't exist — copy the pattern from Modal #3).
- User can fix the duplicates and re-save without losing other edits.

Case- and whitespace-insensitive matching: `"Penthouse"` and `"  penthouse  "` count as duplicates.

### IoT Devices modal — semantic shift

The modal's 3 checkboxes look the same as today. What changes is the **meaning** of "checked":

- **Before:** "Every suite gets this device."
- **After:** "This device is available for per-unit-type configuration."

When the user **checks** a device that was unchecked, the Unit Types modal gets a new column for it. New unit-type rows default to `iotCounts[device] = 1`. **Existing unit-type rows default to `iotCounts[device] = 1` too** — for the same minimize-clicks reason. User can edit.

When the user **unchecks** a device that was checked, the Unit Types modal column for it disappears. The `iotCounts[device]` value on each unit type is preserved (not deleted) so re-checking restores prior values.

Add a one-line helper text below the checkboxes:

> *Selected devices appear as columns on the Unit Types modal, where you set the per-suite count for each unit type.*

## BOM impact

`computeAutoRows` IoT block (M8 line ~9750ish) currently emits one row per checked flag with `qty = suites.reduce((s,d) => s+pageMultiplier(d.page), 0)`. New computation:

```
for each device in iotDevices where flag === true:
  qty = 0
  for each unitType in projectInfo.unitTypes:
    suitesOfThisType = suites where suite.unitTypeId === unitType.id
    perTypeQty = sum_over(suitesOfThisType, s => pageMultiplier(s.page))
    qty += perTypeQty × (unitType.iotCounts?.[device] ?? 0)
  emit row { description: '<Device name> — in-unit', qty }
```

The row description format and section placement stay identical. Only the qty math changes.

**Edge case:** suite references an unknown unit type ID (deleted type). Contribution from that suite = 0 (no row generated for it). Suite still appears on the floor plan and in the suite count, but contributes nothing to the IoT BOM. Matches the Take-Off M1 fallback behavior.

## Take-Off impact

`buildTakeOffData()` Section 3b emission (just shipped in Take-Off M1) currently produces `{device, perSuiteQty: 1, totalQty}` rows. After this pass, the row structure stays the same, but `perSuiteQty` is no longer always 1 — it becomes a **weighted average across unit types**:

```
for each device where flag === true:
  weightedSumQty = 0
  totalSuites = 0
  for each unitType:
    suitesOfThisType = pageMultiplier-aware count
    weightedSumQty += suitesOfThisType × iotCounts[device]
    totalSuites += suitesOfThisType
  perSuiteQty = totalSuites > 0 ? round(weightedSumQty / totalSuites, 1) : 0
  totalQty = weightedSumQty
```

The Take-Off PDF row will read something like `"Smart Lock | 1.2 (avg) | 73"` instead of `"Smart Lock | 1 | 73"` when unit types differ in their counts. M2 of Take-Off (not yet shipped) will render the "(avg)" suffix when `perSuiteQty` isn't a whole number.

Take-Off brief gets a one-section patch at pass closure to document this.

## Scope (milestones)

### M1 — Model migration + backfill (no UI yet)

- Extend `projectInfo.unitTypes` schema with optional `iotCounts: {smartLock, thermostat, waterSensor}` field
- Add `applyProjectState` backfill rules per the migration section above
- Update `addUnitTypeRow` and `openUnitTypesModal` default-row emission to seed `iotCounts` from current `iotDevices` flags (1 if flag=true, 0 if false)
- Update `saveUnitTypes` to persist `iotCounts` alongside existing fields
- Pure model layer — no DOM, no rendering, no validation UI yet (M2 adds those)
- Console-smoke testable: open the tool with an old save, run `projectInfo.unitTypes` in DevTools, confirm `iotCounts` is backfilled correctly

### M2 — Unit Types modal UI (dynamic columns + duplicate validation)

- Update `_renderUnitTypesRows` to emit dynamic IoT column headers + cells based on currently-checked `iotDevices` flags
- Update `onUnitTypeRowEdit` to handle IoT cell input changes (parse integer, clamp to [0, 10], write to draft `iotCounts`)
- Add duplicate-label validation in `saveUnitTypes` per the spec above
- Inline error region: confirm one exists or add it (copy from Modal #3 if needed)
- The label auto-fill behavior from the prior mini-pass stays untouched (BR/BA → label only when `labelUserEdited` is false)
- Modal width may need to expand if all 3 IoT devices are selected — sanity check column widths fit

### M3 — Suites left-pane tile redesign + IoT modal helper text

- Replace the two blue rectangular buttons with Tier-1-style tiles
- Tiles show device-count footers ("N defined" / "N selected")
- Subdued state when count = 0
- Add the helper text line under IoT Devices modal checkboxes
- Re-check Suites left-pane layout flow — Unit Types tile, IoT Devices tile, then the existing "Hide unit labels" toggle, then the suites-on-this-page list

### M4 — BOM + Take-Off integration

- Update `computeAutoRows` smartApartment IoT block to use the per-unit-type qty math
- Update `buildTakeOffData()` `smartAptIot[]` emission to compute weighted-average `perSuiteQty` (data layer only — Take-Off M2 will handle the "(avg)" suffix render)
- Patch `PASS_TAKE_OFF_PAGE_BRIEF.md` Section 3b spec to reflect the new computation; remove the "Per-Suite Qty is always 1" claim
- Test that the BOM matches expected counts across mixed unit-type configurations
- Test that the Take-Off `smartAptIot[]` shape is unchanged externally (still `{device, perSuiteQty, totalQty}`) — just `perSuiteQty` semantics shift

### M5 — User guide patch (pass-closure step, not a code milestone)

- Update `docs/user-guide.md` Smart Apartment Setup section:
  - Remove the "Per-unit-type rules — coming later" callout
  - Update the IoT Devices modal description to reflect the new "available devices" semantic
  - Add a paragraph in the Unit Types section describing the per-unit-type IoT count columns
- Bump `version:` to `1.2` in the META block
- Add new Version 1.2 entry in Version History
- Run `node docs/build-guide.js` to regenerate docx + PDF
- Commit markdown + regenerated output together

## Constraints

- No new dependencies
- No new modals (M2 modifies the existing Unit Types modal; M3 modifies the IoT Devices modal copy + the left-pane tiles)
- Maintain backwards compatibility — pre-pass saves load cleanly with backfilled `iotCounts`
- All `pageMultiplier` accounting consistent across BOM, Cover, Take-Off, riser
- Visual aesthetic stays consistent with existing Tier-1 tile patterns

## Test cases

- **Old save load:** Open a project saved before this pass with `iotDevices.smartLock = true` and 3 unit types. After load, each unit type has `iotCounts.smartLock = 1`, `iotCounts.thermostat = 0`, `iotCounts.waterSensor = 0`. BOM Smart Lock row qty matches pre-pass exactly.
- **Mixed-count project:** Define unit types "1BR / 1BA" (smartLock=1), "Penthouse" (smartLock=2). Place 4 suites of "1BR" + 1 of "Penthouse" on a non-typical page. BOM Smart Lock row qty = 4×1 + 1×2 = 6.
- **Typical-floor multiplier:** Same setup on a 3-typical page. BOM Smart Lock row qty = (4×1 + 1×2) × 3 = 18.
- **Duplicate label:** In Unit Types modal, name two rows "1BR / 1BA". Click Save. Modal stays open, inline error shows. Fix one to "1BR / 1BA-corner", Save. Now persists cleanly.
- **Case-insensitive duplicate:** Rows "Penthouse" and "PENTHOUSE" → flagged as duplicate.
- **Whitespace duplicate:** "Standard" and "  Standard  " → flagged.
- **Uncheck IoT device:** Check Smart Lock, define 3 unit types with various Smart Lock counts, Save. Open IoT modal, uncheck Smart Lock, Save. BOM Smart Lock row disappears. Reopen Unit Types modal — Smart Lock column is gone but the stored values remain. Re-check Smart Lock in IoT modal → column reappears with original values restored.
- **Tile state — zero defined:** Cold project, zero unit types. Unit Types tile shows subdued state with "0 defined". IoT Devices tile shows "0 selected". Both still clickable to open their modals.
- **Tile state — populated:** Define 3 unit types, check 2 IoT devices. Unit Types tile shows "3 defined". IoT Devices tile shows "2 selected".
- **Re-export consistency:** Project from mixed-count scenario above. Export proposal PDF. Cover summary line for "Smart Lock" matches BOM qty. Take-Off Section 3b shows weighted-average per-suite qty.

## Out of scope

- Per-unit-type counts for placed devices (intercoms / parcels / mailboxes). They stay as placed markers; only IoT is unit-type-aware in this pass.
- Pricing logic (still queued separately)
- Rules Page editor (still queued separately — this pass implements one rule category; the broader editor remains future work)
- Per-bedroom-count auto-fill (e.g., "default Smart Lock count to bedroom count"). Could be useful but adds UX complexity. Defer.
