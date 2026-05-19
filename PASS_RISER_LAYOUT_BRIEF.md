# Pass: Riser Layout

*Created May 19, 2026. Slots after Take-Off Page closure, before Pricing Data Foundation.*

## Context

The riser today renders devices at their floor-plan-coordinate offsets within each zone band. That works on sparse floor plans but produces visible overlaps and bad spacing in real use. The user has reported "devices are no longer staggered and overlap" — multiple icons collide, labels stack on top of each other, the diagram becomes unreadable on a busy floor.

The riser is **topology, not geometry.** Within a zone band, "where on the floor plan a device sits" is irrelevant to "what's connected to what." Floor-plan position determines which zone a device falls into, not where in the zone it renders.

This pass fixes the spread algorithm. The result is a clean, predictable, readable riser regardless of floor-plan density.

Scope is **rendering layout only.** No model changes. No new data sources. No device-family additions.

## Design decisions (resolved per integrator input)

### 1. Spread strategy — preserve floor-plan ordering, normalize spacing

Devices on the riser are sorted by their floor-plan x-coordinate within each zone (left-to-right on the plan = left-to-right on the riser), then distributed evenly across the band's usable width. The relative ordering signal stays meaningful ("the lobby camera is on the left, the parkade entry is on the right"), but absolute floor-plan coordinates no longer drive pixel positions.

Why this over pure even distribution: integrators reading the riser frequently cross-reference "where on the floor plan is this device?" Preserving order keeps that mental mapping. Why this over collision-avoidance: predictable layout matters more than the residual floor-plan-position signal.

### 2. High-density zones — multi-row wrap

When a zone band's camera rail or AC rail contains more devices than fit in the band width (target: 15 devices, configurable), the layout wraps to a second row. Multiple rows stack vertically within the band; the band grows in height to accommodate.

Why not zoom out / wider bands: the riser page is US Letter portrait, fixed width. Trying to fit 30 devices in one horizontal row produces icons too small to read.

Why not smaller icons: degrades scannability for everyone, including projects where the high-density zone is the exception.

### 3. Both rails

Spread + multi-row wrap apply to both the camera rail (upper sub-region of mixed bands) and the AC rail (lower sub-region including AC, intercoms, parcels, mailboxes). Each rail is handled independently — a band might have 8 cameras (1 row) and 18 AC devices (2 rows).

Suites do not appear on the riser (suites are not equipment, per Pass N+1 D7). No change to that.

### 4. Cable routing follows positions

The existing cable-line logic draws stubs from each device up to its trunk. After spread, devices have new x-positions; the cable lines re-route automatically using the same logic. Trunk geometry (vertical line down the band's center) is unchanged. Cable IDs (C-NN for cameras) stay attached to their devices.

### 5. Other riser gaps — deferred

Per integrator: the spread fix is the immediate need. Other riser-completeness items (cable IDs for intercoms, zone subtotals, band-label clarity) are not in this pass. Re-evaluate after this lands.

## Layout algorithm

For each zone band, for each rail (camera + AC):

1. **Collect devices** belonging to this rail in this zone (devices on pages within the zone's floor range).
2. **Sort by floor-plan x-coordinate** ascending (left-to-right on the plan).
3. **Compute row count:** `rows = ceil(deviceCount / maxPerRow)` where `maxPerRow = 15` (tunable constant).
4. **Compute per-row icon spacing:** distribute device count evenly across `rows`. The first row gets `ceil(count / rows)` devices, subsequent rows fill the rest.
5. **Compute icon positions:** for each row, the available width is `bandWidth - 2 * railPadding`. Divide by `(rowDeviceCount + 1)` to get equal spacing intervals. Place icons at intervals 1 through `rowDeviceCount`.
6. **Compute row y-positions:** the first row sits at the rail's normal vertical center. Each additional row sits below by `rowHeight = iconSize + labelHeight + 4pt` padding.
7. **Re-route cable lines** from each device's new position to the rail trunk (no algorithm change; same compute, new inputs).

Band height adjusts when row count > 1. Total band height = `baseHeight + (rows - 1) * rowHeight` for each rail.

## What changes in code

### `computeRiserModel()` (likely unchanged)

The data model already groups devices by zone. Sorting by x-coordinate within zone may happen here or in the renderer — push to the renderer for simplicity (compute model stays purely data, renderer handles layout).

### `drawRiserBandInterior()` (or equivalent)

The function that lays out devices within a band gets a new spread sub-routine. Replaces the current "render at scaled floor-plan x-coordinate" with the multi-row algorithm above. Calls `drawRiserCamIcon`, `drawRiserAcIcon`, `drawRiserIntercomIcon`, etc. at the computed positions instead of at coordinate-derived ones.

### Cable stub routing

Existing per-device stub-line code stays. The from-y is the rail-trunk y; the to-y is the device's new y (now possibly a different row). The from-x and to-x are the trunk x and the device x respectively — both still correct.

### Band height computation

The band-height computation needs to account for multi-row rails. New formula:
```
bandHeight = headerHeight
           + max(cameraRailRows, 1) * cameraRowHeight
           + max(acRailRows, 1) * acRowHeight
           + padding
```
This means a tall band (e.g., 2 camera rows + 2 AC rows) makes the whole riser page taller. The page-break logic in `drawRiserPage` handles overflow naturally; no change there beyond confirming it still works.

### Constants

New top-level constants for tuning:
```
RISER_MAX_DEVICES_PER_ROW = 15
RISER_RAIL_PADDING = 24
```

## Scope (milestones)

### M1 — Layout algorithm + multi-row rendering

- Implement the sort-and-spread algorithm in `drawRiserBandInterior`
- Implement multi-row wrap when device count > `RISER_MAX_DEVICES_PER_ROW`
- Add `RISER_MAX_DEVICES_PER_ROW` and `RISER_RAIL_PADDING` constants
- Update band-height computation
- Verify cable stub routing follows positions correctly
- Verify both camera rail and AC rail use the same spread logic

### M2 — Visual review + polish

- Visual eyeball pass with test scenarios listed below
- Tune `RISER_MAX_DEVICES_PER_ROW` and `RISER_RAIL_PADDING` based on real renders
- Confirm page-break works correctly when a band grows beyond a single page
- Confirm cable IDs don't overlap label text
- Confirm equipment schedule on the right side of the page still renders correctly (no width invasion from a tall riser)

### M3 — User guide patch (pass-closure step)

- Brief mention in `docs/user-guide.md` Exporting section: "The riser auto-spreads devices evenly within each zone band, wrapping to multiple rows in high-density zones."
- Bump META version (probably 1.4 → 1.5)
- Add Version 1.5 entry to Version History
- Run `node docs/build-guide.js` to regenerate docx
- Commit markdown source + regenerated output

## Constraints

- No new dependencies
- US Letter portrait (existing format)
- Pure JS, vanilla, single-file
- Preserve compatibility with existing riser features: head-end at top, zone bands, mixed-band camera-and-AC split, intercom cable stubs, color identity
- No regression of M9 work (smart-apartment rail extension, equipment schedule, cover summary lines)

## Test cases

1. **Sparse zone** (3 cameras on a single floor): renders identically to before — 3 cameras evenly spaced across the rail, no multi-row needed.
2. **Single-row dense** (12 cameras in one zone): all 12 fit in one row, evenly spaced. Spacing is tighter than the sparse case but still readable.
3. **Two-row wrap** (20 cameras in one zone): 10 in row 1, 10 in row 2. Band height grows by one row height. Cable stubs from row 2 cameras route past row 1 without crossing other devices (or with acceptable crossings — verify).
4. **Three-row wrap** (32 cameras): 11 / 11 / 10 distribution. Three rows. Page height grows accordingly; if it pushes the band past page-bottom, the band breaks across pages cleanly.
5. **Mixed rail wrap** (camera rail wraps but AC rail doesn't, and vice versa): handled independently.
6. **AC rail wrap with mixed devices** (10 readers + 5 intercoms + 3 parcels + 4 mailboxes = 22 AC devices): 2 rows. Order within rail preserved per Pass N+1 M9 spec (readers → controllers → intercoms → parcels → mailboxes), with each category contiguous; the sort-by-x-coordinate happens within each category, not across.
7. **Floor-plan ordering preserved**: 3 cameras placed at x = 100, 300, 50 on the floor plan. After sort: 50, 100, 300. Renders left-to-right on riser as the leftmost-on-plan camera first.
8. **Cable ID labels** (C-01, C-02, etc.) don't overlap or clip when devices are spread evenly.
9. **Equipment schedule width unchanged**: the right-side schedule keeps its width allocation regardless of how tall the riser grows.
10. **Riser-only project** (no BOM toggle, no Take-Off, just Cover + Riser + Plans): riser still works standalone.

## Out of scope

- Cable IDs for intercoms (I-NN)
- Zone subtotals or device counts in band headers
- Band-label clarity improvements (typical-floor badge tweaks, etc.)
- PoE budget callouts
- IDF/MDF intermediate cabinets
- Per-device fiber-vs-Cat6 distinction
- Conduit indicators on the riser (Manual Routing pass)
- Manual cable routing visualization (Manual Routing pass)
- Adding non-equipment items to the riser
