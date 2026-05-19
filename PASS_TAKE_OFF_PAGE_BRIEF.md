# Pass: Take-Off Page (PDF Export Section)

*Last refreshed: May 19, 2026 — post-Pass-N+1. Supersedes earlier draft.*

## Context

A take-off (or "schedule of quantities") is a standard deliverable in commercial bid documents. It's a tabular page that summarizes every device, length, and labor item proposed for a project — used by competing integrators, project managers, and procurement teams to verify bid completeness and compare across vendors.

Today's proposal PDF has 4 page types: Cover / BOM / Riser / Floor Plan Markups. The take-off page is a 5th type, slotted between BOM and Riser.

The **BOM is customer-facing** ("here's what it costs"). The **take-off is integrator-facing** ("here's what's being installed"). Different audience, different content, different formatting.

The Take-Off page deliberately includes some content that also appears on the riser equipment schedule (notably head-end gear). The riser shows equipment positioned within zone topology; the Take-Off shows the same gear as a flat procurement list. Different views of the same underlying data — both useful for different downstream consumers.

## What the take-off shows

A tabular page (or multi-page if quantities are large) with these sections, in order. All quantity figures use `pageMultiplier`-aware totals to match the BOM and cover-summary accounting; a single intercom on a 3-typical-floor page contributes qty=3 here just as it does in the BOM.

### Section 1 — Cameras

| Floor | Label | Brand | Model | Type | Mount | Resolution | FOV | Reach (m) |

One row per placed camera, sorted by floor then label. Cameras on typical floors emit one row per page (the page multiplier shows up in Section 6 cable totals and the BOM, not as duplicated rows here).

### Section 2 — Access Control

| Floor | Label | Brand | Model | Type | Subcategory | Variant |

One row per placed reader / controller, sorted by floor then label.

### Section 3a — Smart Apartment: Placed Devices

| Floor | Label | Type | Brand | Model | Config |

One row per placed intercom / parcel locker / mailbox bank. `Type` is one of `Intercom` / `Parcel` / `Mailbox`. `Config` holds the SKU-specific variant for intercoms and parcels; for mailboxes it shows `<cols>×<rows>` (e.g. `4×4`).

### Section 3b — Smart Apartment: In-Unit (IoT)

| Device | Per-Suite Qty | Total Qty |

One row per IoT flag set true in `projectInfo.iotDevices` (Smart Lock / Thermostat / Water Sensor). For v1, **Per-Suite Qty is always 1** (per-bedroom-type rules ship later via the Rules Page editor). Total Qty = sum of suites × pageMultiplier across all suite pages.

If no IoT flags are checked AND no suites are placed, this subsection is omitted entirely.

### Section 4 — Suites

| Floor | Label | Unit Type | Bedrooms | Bathrooms |

One row per placed suite, sorted by floor then label. The Unit Type column shows the label from the Unit Types modal — auto-filled `1BR / 1BA` for the default cases, or whatever custom override the user typed ("Penthouse", "Corner Unit").

### Section 5 — Head-End Equipment

| Label | Type | Brand | Model | Qty |

Project-wide flat list of NVR(s), PoE switch(es), UPS. No Floor column (head-end is single-room; multi-head-end deployments not in scope this pass). This deliberately duplicates riser-schedule data in a different format — riser shows equipment positioned in zone bands; this section shows it as a procurement list.

### Section 6 — Cabling Summary

- Total camera cable runs: N
- Total cable length (current units): X
- Average run length: Y
- Routing overhead multiplier in use: M

**Implementation note (not rendered in PDF):** Section 6 reads from the existing straight-line × routing-overhead-multiplier model. When the queued Manual Cable Routing + Conduit pass ships, swap this section to sum user-drawn polyline segment lengths and add a row for Conduit totals.

### Section 7 — Labor Summary

One row per non-zero labor category, qty × rate × total format. Categories:

- Camera install
- Reader install
- Controller install
- Intercom install
- Parcel install
- Mailbox install
- IoT per suite
- Head-end base (flat per project)
- Cabling per meter
- Commissioning (flat per project)

Final row: total labor hours.

Rates live in a new top-level JS constant `LABOR_RATES`. Starter values (placeholders, integrator will tune to reality over time):

```
LABOR_RATES = {
  cameraInstall: 1.5,        // hours per camera
  readerInstall: 2.0,        // hours per reader
  controllerInstall: 1.0,    // hours per controller
  intercomInstall: 2.0,      // hours per intercom
  parcelInstall: 4.0,        // hours per parcel locker
  mailboxInstall: 1.0,       // hours per mailbox bank
  iotPerSuite: 0.25,         // hours per IoT device per suite
  headEndBase: 4.0,          // hours flat for NVR/switch/UPS bench-up
  cablingPerMeter: 0.1,      // hours per meter of pulled cable
  commissioning: 4.0,        // hours flat
}
```

These are intentionally rough. Integrator may patch the constant between releases until the Rules Page editor pass moves rates into a `projectInfo.laborRates` per-project persisted object.

Device counts feeding Section 7 use `pageMultiplier` consistently — same accounting as everywhere else.

## What the take-off does NOT show

- Prices (those are on the BOM)
- Manufacturer wholesale cost
- Project margin / taxes
- Customer-facing prose ("our team will...")

## Format

- US Letter portrait (matching existing PDF pages)
- Tabular: monospace font (`Courier New` to match existing aesthetic), thin borders, alternating row shading
- Header row in dark navy with white text (matching existing schedule header style)
- Subsection headers in red accent (matching cover summary GRAND TOTAL color)
- Page break: automatic when content exceeds page height; multi-page take-off gets "Page N of M" footer

## Export integration

- New entry `'takeOff'` added to `projectInfo.proposalSections` (default ON)
- New toggle in the export modal: ☑ Take-Off Page (default ON)
- PDF export section order: Cover → BOM → **Take-Off** → Riser → Floor Plans
- Toggle off → page entirely skipped; page numbering and cross-references stay consistent
- Empty project gate: if all device families are empty AND no suites placed, Take-Off page is omitted automatically (matches existing per-section empty-gate logic)

## Scope (milestones)

### M1 — Data extraction helpers

- New `buildTakeOffData()` function: returns structured data for each of the 7 sections (counting 3a + 3b as a single section in code, two subsections in render)
- Reuses existing `computeRiserModel()` for zone iteration where useful, but emits flat sorted lists instead of per-zone groupings
- Pulls camera fields: brand, model, type, mount height, resolution, FOV, reach
- Pulls AC fields: subcategory, variant, sku, label
- Pulls smart apartment fields: type, model, variant/config (with mailbox cols×rows special case)
- Pulls IoT flags from `projectInfo.iotDevices` and computes per-suite totals
- Pulls suite fields: unit type label, bedrooms, bathrooms
- Pulls head-end fields: NVR / Switch / UPS labels and models, with qty rollup
- Pulls cable run totals from existing cable-routing computation, including the routing overhead multiplier value in use
- Computes labor section by multiplying device counts × `LABOR_RATES` entries

### M2 — Take-off page draw

- New `drawTakeOffPage(doc)` function
- Title header (matching cover/BOM/riser style)
- Seven subsections (3a and 3b render as separate subsections under one "Smart Apartment" parent label)
- Row rendering with column-aligned data
- Page break logic when content overflows
- Footer with page numbering
- Empty-section handling: each subsection emits "None placed" italic note when empty rather than disappearing — except 3b which omits entirely when both IoT and suites are zero

### M3 — Export integration

- Add `'takeOff'` to `projectInfo.proposalSections` defaults (default ON)
- Update export modal HTML to include the new toggle
- Update PDF generation flow to insert take-off page between BOM and Riser
- Update Pass A.6 first-used logic to acknowledge take-off as a content-bearing section
- Update export-empty alert to consider take-off content too

### M4 — Visual review + polish

- Verify table column widths fit largest expected values without truncation
- Verify multi-page behavior with a project containing 100+ devices
- Verify alignment looks correct alongside the cover, BOM, and riser pages
- Add take-off page to the existing visual regression spot-checks
- Add `LABOR_RATES` constant comment block documenting the placeholder-status of starter values

### M5 — User guide patch (pass-closure step, not a code milestone)

- Add a new top-level section to `docs/user-guide.md`: "The Take-Off Page" with brief content summary + screenshot reference
- Add a bullet to the Version History section bumping the doc version
- Run `node docs/build-guide.js` to regenerate `docs/output/*.docx` and `*.pdf`
- Commit markdown source + regenerated output together with the M1-M4 implementation commits

## Constraints

- No new dependencies
- US Letter portrait only (matching existing PDF format)
- Monospace font + flat aesthetic, no decorative graphics
- Take-off must work for any project state — cameras only, AC only, smart apartment only, suites only, or any combination
- Take-off section must be skippable via the export modal toggle
- All counts use `pageMultiplier` consistently — must match BOM and cover-summary totals exactly

## Test cases

- Project with cameras only → take-off shows Cameras section + Labor Summary (camera install + cabling + commissioning + head-end); other sections show "None placed"
- Project with mixed cameras + AC + smart apartment + suites → all sections populated, labor summary aggregates across all categories
- Project with 100+ devices → take-off paginates correctly with "Page N of M" footer
- Empty project → take-off page skipped (matches Pass N export-gate logic)
- Toggle off in export modal → no take-off page in resulting PDF
- Subsection ordering: cameras → AC → smart apt placed → smart apt IoT → suites → head-end → cabling → labor
- Typical-floor multiplier sanity: place 2 cameras on a 3-typical page. Camera section shows 2 rows (one per placed marker). Cabling Summary total length = (run1 + run2) × 3. Labor Summary camera-install hours = 2 × 3 × 1.5 = 9.
- IoT-only edge case: zero placed devices, 5 suites, Smart Lock checked. Section 3b shows one row (Smart Lock, per-suite=1, total=5). Sections 1, 2, 3a, 5 all show "None placed". Section 6 shows total cable length = 0. Section 7 shows IoT install + commissioning + head-end-base = some total.

## Out of scope

- Take-off as a separate exportable file (Excel, CSV) — future enhancement if requested
- Take-off translation / multi-language support
- Take-off with embedded thumbnails of camera FOV cones
- Per-floor take-off rollups (the BOM already does counts by category)
- Custom row ordering beyond the documented section order
- Per-project labor rate overrides (Rules Page editor pass)
- Per-bedroom-type IoT counts (Rules Page editor pass)
- Conduit row in Section 6 (Manual Cable Routing + Conduit pass)
