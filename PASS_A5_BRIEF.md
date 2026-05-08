# Pass A.5: Typical Floor Multiplier

## Context

Multi-family floor plans frequently include a "typical" floor — a single floor plan drawing that represents many identical floors stacked vertically (e.g., "Tower Typical, Floors 3-17"). Without modeling this, the BOM and proposal under-count cameras and access devices by a large factor — quoting math is fundamentally wrong on most multi-family jobs.

This PR adds a first-class "typical floor" concept: each page can be marked as representing a range of floors, and that multiplier is applied universally to every count, total, and aggregate calculation in the tool.

## Builds on Pass A

This PR depends on Pass A having shipped (editable floor tabs with `pages[idx].name`). The typical-floor configuration lives on the same tab metadata. Don't start this PR until Pass A is committed.

## Data model

Extend `pages[idx]` with a new optional `typical` object:

```javascript
pages[idx] = {
  // existing fields stay
  name: "Tower Typical",
  typical: {
    enabled: true,
    fromFloor: 3,
    toFloor: 17,
    note: ""        // optional free text shown in tooltip / proposal
  }
}
```

If `typical` is missing or `enabled === false`, the page represents one floor (multiplier = 1).

The `note` field is optional and used for human-readable annotations like "Tower typical" or "Resi tower" that the salesperson can add for clarity. It appears in tooltips and on the proposal-PDF page header but doesn't affect math.

JSON format bumps from v9 to v10. Read v9 files cleanly (treat all pages as non-typical when loading).

## Tab UI changes

### Rename dialog

When the user clicks a tab name to enter edit mode (the Pass A behavior), the inline rename input expands into a slightly larger inline panel with:

```
┌─ Edit Tab ─────────────────────────────┐
│ Tab name:                              │
│ [Tower Typical                       ] │
│                                        │
│ [✓] This page represents multiple      │
│     floors                             │
│                                        │
│   ┌─ Floor range ──────────────┐       │
│   │ From: [3]  To: [17]        │       │
│   │ Represents 15 floors       │       │
│   └────────────────────────────┘       │
│                                        │
│   Note (optional):                     │
│   [Tower typical resi               ]  │
│                                        │
│ [ Cancel ]    [ Save ]                 │
└────────────────────────────────────────┘
```

Behavior:

- The "represents multiple floors" checkbox toggles the visibility of the floor-range fields. Default unchecked.
- From and To are number inputs.
- "Represents N floors" auto-updates as the user types.
- If user enters from=17, to=3, silently auto-swap on save (don't error).
- If from === to, allow it. Multiplier is 1. The page is still considered "typical" data-model-wise but behaves as a single floor.
- Esc cancels and reverts. Save commits.

### Tab strip badge

Tabs that are typical AND have a multiplier > 1 show a small subtle range badge after the name:

- `Floor 1` (non-typical, no badge)
- `Tower Typical · F3–17` (typical, multiplier 15, badge shows "F3–17")
- `Penthouse · F18` (typical, multiplier 1, no badge — looks like a normal tab)

Badge styling: smaller font, muted color, separated from the name by a thin middot. Don't use a chip or colored pill — keep it understated.

The × delete button stays right of the badge.

### Tooltip

Hover a typical tab → tooltip showing: "Floors 3-17 (15 floors)" plus the optional note if set: "Floors 3-17 (15 floors) — Tower typical resi"

## Multiplier application

Wherever cameras, AC devices, or cable runs are counted/summed for BOM, riser, schedule, or cover summary, multiply by the page's typical multiplier:

```javascript
function pageMultiplier(pageIdx) {
  var p = pages[pageIdx];
  if (!p || !p.typical || !p.typical.enabled) return 1;
  var n = (p.typical.toFloor - p.typical.fromFloor + 1);
  return Math.max(1, n);   // safety: never < 1
}
```

Apply this in the following places (comprehensive list — find each one in the codebase):

### BOM (`computeAutoRows`)

- Camera auto-rows: when summing cameras by model/type, multiply each camera's contribution by `pageMultiplier(c.page)`
- AC auto-rows (when added in future Pass D): same multiplication
- Cable auto-rows: cable runs on a typical page count N times in total cable footage
- Switch sizing: total camera count for switch/NVR sizing uses multiplied count
- NVR channel count: same

### BOM CSV export

Export uses the same multiplied counts as BOM display. Each line item shows the total quantity (post-multiplier).

### Riser (`computeRiserModel`)

The riser shows ONE band per page — don't expand a typical page into 15 bands. The band's label includes the multiplier:

- Non-typical: `Floor 1`
- Typical: `Tower Typical · F3–17 (×15)`

The equipment schedule on the riser (right side of the riser page) shows multiplied counts. Each camera in the schedule gets a "Floors" column noting which floors it covers:

- Camera on a non-typical page: "Floor 1" in Floors column
- Camera on a typical page: "F3–17" in Floors column

Cable IDs stay sequential project-wide (C-01, C-02, ...). Cables on typical pages display length and a multiplier note: `C-08: 38 ft (×15 floors)` — total cable for that run is `38 ft × 15 = 570 ft`.

### Proposal cover summary

Cover page totals reflect multiplied counts:

- "47 cameras across 17 floors" — where 47 is the multiplied total and 17 is the sum of `pageMultiplier(i)` across all pages
- Floor count is the sum of multipliers, not the count of pages

### Camera schedule page

The schedule lists each camera with its Floors column (same as riser schedule). For typical-page cameras, show the floor range, not just one floor.

### Storage calculator

Total camera count for storage math uses the multiplied count.

## Head-end on typical pages

A head-end (NVR + switch) belongs on a single physical floor — typically the parkade, basement, or telecom room. It doesn't make sense on a typical page since you'd be implying 15 NVRs.

Block placement of a head-end on typical pages:

- When `startHeadendPlacement()` is called and `currentPage` has `typical.enabled === true && multiplier > 1`, show an inline tooltip or banner: "Place the head-end on a non-typical floor (parkade, lobby, or single floor). Typical floors share the same head-end."
- Don't enter placement mode on typical pages
- If a typical page already has a head-end (e.g. data was migrated or user marked the page typical after placing a head-end), keep it but display a warning badge in the property panel

The tooltip language matters — be specific about WHY, since users may not see the conceptual issue immediately.

## Calibration on typical pages

Calibration works the same on typical and non-typical pages. The scale is per-page geometry, not per-floor count. No changes needed.

## DORI, blind spots, heatmap on typical pages

These are visual overlays on a single page's floor plan. They render the same on typical pages — they show what the camera sees on ONE floor, which is correct (each typical floor sees the same coverage). No multiplier applied to these visuals.

## Cable run length on typical pages

The tool already calculates cable length from each camera to the head-end on the same page. For a typical page that has no head-end (per the rule above), there's no head-end on the page to calculate distances from.

For now, keep the existing behavior:

- If the typical page has a head-end (rare, but possible from old saves), calculate as today
- If the typical page has no head-end, cable lengths are blank/dashes for those cameras (existing behavior when no head-end is placed)

The multiplier still applies to total cable footage in the BOM. Cable cost calculations use the multiplier on cable footage even when individual run length is blank — assume an average run estimate handled in a future PR. Don't try to fix this in Pass A.5.

This is a known limitation. Add a short note in the BOM cable line: "Cable totals on typical floors are estimated; actual installation may vary."

## Saved JSON v10

The save format gets a version bump:

```javascript
{
  version: 10,
  // ... other fields ...
  pages: [
    {
      name: "Floor 1",
      typical: null   // or { enabled: false, ... }
    },
    {
      name: "Tower Typical",
      typical: {
        enabled: true,
        fromFloor: 3,
        toFloor: 17,
        note: "Tower typical resi"
      }
    }
  ]
}
```

Read v9 files cleanly: treat all pages as `typical: null` (non-typical). Read v10 normally.

## Out of scope for this PR

- IDF/MDF cabinets per floor (still deferred from the riser spec)
- Per-floor cable routing variation (we're treating all typical floors as having the same cable lengths as the displayed floor)
- Vertical riser distance / drop allowance from typical floor to building head-end
- AC device multiplier — wait, AC devices ARE in scope. Apply the multiplier to acDevices counts in any place that aggregates them, even though current AC integration into BOM is deferred. Future Pass D will surface AC counts in BOM, and Pass A.5's multiplier infrastructure should be ready when Pass D lands.

## Edge cases to handle

- **User unchecks "represents multiple floors":** clear the typical object. Set to null. Multiplier becomes 1.
- **User changes the range from 3-17 to 3-12:** save the new range. All dependent counts (BOM, riser, etc.) auto-recompute on next render.
- **User deletes a typical page:** cascade follows existing rules. The pages reindex, the typical config goes with the deleted page, and the multiplier no longer applies (the page is gone).
- **Project loaded from old save (v9 or earlier):** all pages default to non-typical. User has to manually mark typicals. Show a small one-time info banner (or just rely on the user's own knowledge) — don't try to auto-detect.
- **Two pages both marked typical with overlapping ranges (e.g., Page A is "F3-10" and Page B is "F8-15"):** allow it. Don't validate cross-page conflicts. The user is responsible for not double-booking floors. Total floors counted = sum of all page multipliers; if user defines overlapping typicals, they get the sum (which is accurate to what they asked for, even if it's logically weird).

## Constraints

- Don't change canvas drawing logic
- Don't introduce new dependencies
- Preserve all existing JS-referenced IDs
- Test save/load round-trip with v9 and v10 formats
- Find every aggregation point in the code that counts cameras/AC/cable for BOM/riser/schedule/cover and apply the multiplier — don't miss one. Use grep to find all references to `cameras.length`, `acDevices.length`, similar patterns, and verify each one.

## Process

1. Read camera_markup_tool.html and CLAUDE.md.
2. Lay out an implementation plan as a numbered checklist before any edits. The plan must include a list of EVERY function/place where a count or sum is aggregated and confirm the multiplier is applied at each one.
3. Confirm the plan with me before starting edits.
4. Execute in this order:
   a. Add `pages[idx].typical` data structure; bump JSON to v10
   b. Add `pageMultiplier()` helper function
   c. Update tab UI: rename dialog gets typical section, tab strip gets badge, tooltip
   d. Apply multiplier in BOM compute (camera, AC, cable, switch sizing, NVR)
   e. Apply multiplier in riser compute (band labels, schedule)
   f. Apply multiplier in proposal cover summary
   g. Apply multiplier in camera schedule page
   h. Apply multiplier in storage calculator
   i. Block head-end placement on typical pages with multiplier > 1
5. JS syntax check after each step.
6. Tell me what to test in the browser.
