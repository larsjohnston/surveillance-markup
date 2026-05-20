# Surveillance Markup Tool — User Guide

%META
title: Surveillance Markup Tool
subtitle: User Guide
tagline: Plan, mark up, and quote security and smart-apartment systems
version: 1.6
date: May 2026
org: Calgary Lock and Safe — Smart MF
%ENDMETA

%TOC
1. Welcome
2. Getting Started
3. The Six Modes
4. Cameras Mode
5. Other Device Modes
    Access Control · Intercoms · Parcel Lockers · Mailbox Banks
6. Suites Mode
7. Smart Apartment Setup
8. Bill of Materials
9. Exporting the Proposal
10. The Take-Off Page
11. Saving and Reloading Projects
12. Tips, Shortcuts, and Troubleshooting
13. Version History
%ENDTOC

%H1 Welcome

The Surveillance Markup Tool helps you plan a security and smart-apartment system on top of your customer's floor plans, then export a professional proposal package — bill of materials, riser diagram, and marked-up plans — in a single PDF.

It runs entirely in your browser. There's nothing to install. Drop in a PDF of the floor plans, place devices on the canvas, and the tool keeps the bill of materials in sync as you work.

%H2 What you can plan with it

- **Cameras** — domes, bullets, turrets, fisheyes, PTZs, and LPRs
- **Access control** — readers and controllers (Brivo catalog)
- **Intercoms** — lobby and entry video intercoms (Doorbird catalog)
- **Parcel lockers** — package management hardware
- **Mailbox banks** — by brand and configuration
- **Suites** — track unit count and unit types for per-suite device calculations
- **In-unit IoT** — smart locks, thermostats, water sensors (one toggle, rolled out across all suites)

%H2 What it produces

- A marked-up version of every floor plan page, showing each device in place
- A bill of materials grouped by section, with line-item quantities and labor
- A system riser diagram with smart-apartment equipment on the rail and a per-floor equipment schedule
- A cover summary with device counts and per-bedroom-type unit counts
- CSV export of the BOM for your accounting or procurement tools
- A saved project file you can reopen and continue editing

%PAGEBREAK

%H1 Getting Started

%H2 Open the tool

The tool is a single HTML file. Double-click it or open the published URL in any modern browser (Chrome, Edge, Firefox, or Safari). Nothing installs locally.

%H2 Import a floor plan

**Drag and drop** a PDF of the floor plans onto the canvas, or use **File → Open PDF**. The tool reads every page of the PDF as its own floor plan — if the PDF has 5 pages, you'll see 5 page tabs along the top of the canvas.

%CALLOUT Tip
Use the architect's PDF whenever possible. Make sure you have the floor plan pages, not just the cover or title sheet — the tool can't measure scale from a title sheet.
%ENDCALLOUT

%H2 Set the scale

Every floor plan needs a scale so the tool can calculate cable runs and distances. To calibrate a page:

%NUMLIST scale
1. Click the scale calibration tool in the canvas toolbar.
2. Click **two points** on the floor plan whose real-world distance you know (e.g., a labeled dimension line, or the corners of a known wall).
3. Enter the **real-world distance** between those two points (e.g., "30 ft" or "9.5 m"). Pick the unit; the tool stores both.
4. Save. The page is now calibrated; cable runs and BOM lengths will be accurate.
%ENDNUMLIST

*Each page is calibrated independently.* Site plans and floor plans often use different scales in the same PDF — calibrate each page that has devices on it.

%H2 Fill in project info

Open **Project Info** from the top menu. Fill in the project name, customer, address, and any other fields shown. This information appears on the cover page of the exported proposal.

%PAGEBREAK

%H1 The Six Modes

The left pane shows a vertical rail with six modes. Click a mode to switch into it. Each mode is for placing one family of device on the floor plan.

%TABLE
Mode | What you place
Cameras | Security cameras of any style. Tier, mount height, and notes per camera.
Access Control | Door readers and controllers (Brivo SKUs).
Intercoms | Lobby/entry video intercoms (Doorbird catalog).
Parcel Lockers | Package management hardware.
Mailbox Banks | Mailboxes by brand and column × row configuration.
Suites | Unit markers — one per dwelling unit. Drives per-suite IoT calculations.
%ENDTABLE

%H2 Working in a mode

Each mode follows the same pattern:

%NUMLIST working
1. **Pick a device** from the catalog panel on the left. Each section is labelled by tier — for cameras that's Camera Manufacturers, Camera Styles, and Camera Models; other modes follow the same pattern (e.g., AC Manufacturers / AC Devices / AC Models).
2. **Click anywhere on the floor plan** to place a marker for that device.
3. **Click the placed marker** to open the right panel and edit its properties (label, tier, notes, etc.).
4. **Drag a placed marker** to move it. Drag the device anywhere on the canvas.
5. **Press Delete** or click the × in the right panel header to remove a placed device.
%ENDNUMLIST

%H2 Universal click and drag

You don't have to switch modes to interact with a device. If you're in Cameras mode and click on a placed Suite, the tool switches to Suites mode automatically and selects that suite. Drag works the same way.

*Behind the scenes: the topmost device under your cursor wins. So if two devices visually overlap, the one drawn on top is the one that responds.*

%PAGEBREAK

%H1 Cameras Mode

Cameras is the original mode and the most feature-rich. Use it to place every CCTV camera in the project.

%H2 Pick a camera

The left pane has three labelled sections that walk you from brand to specific model: **Camera Manufacturers**, **Camera Styles**, and **Camera Models**. Pick a manufacturer, then a style, then a specific model. Once selected, your next canvas click places that camera.

**Six camera styles are supported:** Dome, Bullet, Turret, Fisheye, PTZ, and LPR (license-plate-recognition). The Camera Styles tile icons match the markers drawn on the floor plan, so you can tell at a glance which marker corresponds to which style. Fisheye cameras render a 180° coverage wedge on the floor plan.

%H2 Per-camera fields

Click a placed camera to open the right panel. You can set:

- **Label** — the camera's unique ID, e.g., CAM-1.1. Auto-generated by floor; you can edit it.
- **Tier** — the camera's quality/feature tier in the project. Used to group cameras of similar capability on the BOM.
- **Mount height** — the height above the floor (or grade) where the camera will be installed.
- **Notes** — free-text scratchpad. Survey detail, hardware quirks, mounting concerns.

%H2 Head-end placement

The **Camera Accessories** section at the bottom of the Cameras left pane houses the CMVR/NVR tile. Click it and then click on the floor plan to place the head-end location for the current page (typically the NVR/IT room). This is the same action as Tools → Place Head-End.

%H2 Cable runs

Once a head-end location is set on the page, the tool measures each camera's cable run distance from the camera to the head-end and applies a routing-overhead multiplier. The result feeds the riser diagram and the Take-Off page; cabling is not on the BOM (the BOM is equipment-only as of v1.3).

*Cable runs are recalculated automatically when you move a camera.*

%PAGEBREAK

%H1 Other Device Modes

%H2 Access Control

Place readers and controllers from the Brivo catalog. Pick a SKU in the drill-down, click the canvas to place it. The right panel exposes label, notes, and (for readers) which door they serve.

The BOM auto-row counts readers and controllers separately and rolls them into the **ACCESS CONTROL** section.

%H2 Intercoms

Place lobby and entry video intercoms from the Doorbird catalog (currently 6 curated SKUs covering the most common entry-system configurations). The catalog includes single-button and multi-button models.

Intercoms feed the **SMART APARTMENT** BOM section, grouped by SKU. On the riser, intercoms appear on the head-end rail with a connecting line (intercoms are IP-connected back to the head-end). Their inventory shows on each floor's equipment schedule.

%H2 Parcel Lockers

Place package-management hardware. The right panel exposes the locker SKU and any per-location notes.

Parcel lockers feed the **SMART APARTMENT** BOM section and appear on the riser without a cable line (they don't run back to the head-end in the same way).

%H2 Mailbox Banks

Place mailbox banks by brand and configuration. The right panel lets you set columns and rows (e.g., 4 columns × 6 rows = 24 mailboxes in the bank). The BOM groups identical bank configurations together.

%CALLOUT Click-to-select-all
Click into any number field in the mailbox bank size editor — and the entire value highlights. You can immediately type a replacement without selecting first.
%ENDCALLOUT

%PAGEBREAK

%H1 Suites Mode

Suites mode tracks the dwelling units in the building. Each suite is a marker placed at (or near) the unit on the floor plan, tagged with a unit type. The total suite count and breakdown by unit type drive per-suite calculations elsewhere in the proposal.

%H2 Step 1 — Define unit types

Before placing suites, define the unit types that exist in the building. Click the **Unit Types** tile in the Suites left pane.

Each unit type has three fields:

- **Bedrooms** — number of bedrooms (whole number 0–10).
- **Bathrooms** — number of bathrooms (0.5–10 in 0.5 steps; e.g., 1.5 for a 1-bedroom 1.5-bath).
- **Label** — the display name. Auto-fills as you type bedrooms and bathrooms (e.g., "2BR / 1.5BA"), but you can override with whatever name you prefer ("Penthouse", "Corner Unit", "1BR/1BA Standard").

*Once you type your own label, the tool stops auto-filling that row — your custom label is preserved even if you change bedrooms or bathrooms later.*

*Each unit type label must be unique within the project. Saving a duplicate label produces an inline error that identifies the conflicting rows.*

When IoT devices are selected in the IoT Devices modal, additional columns appear in the Unit Types modal — one per selected device. Enter the per-suite count for each unit type (e.g., a Penthouse might have 2 smart locks; a Studio might have 1). The BOM and Take-Off page automatically apply these counts when calculating totals across the building.

%H2 Step 2 — Place suites

With at least one unit type defined, click the floor plan to drop a suite marker. A small modal opens asking you to:

- Confirm the label (auto-suggested as "Unit 101", "Unit 102", etc. by floor)
- Pick the unit type from your defined catalog
- Add notes if relevant

Click Place. The suite marker appears at your click point as a green pill showing the unit label.

%CALLOUT First-suite shortcut
If you click the floor plan in Suites mode *before* defining any unit types, the Unit Types editor opens automatically. Add your types, save, and the Place Suite dialog opens at your original click point. One smooth flow.
%ENDCALLOUT

%H2 Step 3 — Edit and manage

Click any placed suite to open the right panel. Edit the label, change the unit type, add notes, or delete it via the × button.

%H2 Hide suite labels

For a cleaner view of the floor plan, hide suite text labels via **View → Equipment Labels → Suite Labels**. Suite pill markers stay visible (as small empty pills) so you can still click to select them. The Equipment Labels group also lets you hide labels on the other five device families. See *Equipment Labels visibility* in the Tips section.

%PAGEBREAK

%H1 Smart Apartment Setup

The Smart Apartment section of the BOM captures three things together: intercoms, parcel lockers, mailbox banks (all placed on the floor plan), and **in-unit IoT devices** — smart locks, thermostats, water sensors that go in every dwelling unit.

Place intercoms, parcel lockers, and mailbox banks the usual way (their modes in the left rail).

For **in-unit IoT**, you don't place anything on the floor plan. Instead, you tell the tool which IoT devices apply to every suite, and the BOM calculates the count from your suite total.

%H2 IoT Devices modal

In Suites mode, click the **IoT Devices** tile in the left pane. A modal opens with three checkboxes — Smart Lock, Thermostat, and Water Sensor — for selecting which IoT devices are available in this project. Check the devices you want to configure per unit type. The selected devices appear as columns on the Unit Types modal, where you set the per-suite count for each unit type.

%H2 What appears on the cover page

When at least one smart-apartment device is placed (intercom, parcel, mailbox) or an IoT flag is on, the proposal cover page shows:

- **INTERCOMS:** total count
- **PARCEL LOCKERS:** total count
- **MAILBOX BANKS:** total count

Plus one line per unit type you've defined, with the suite count for that type:

- **1BR / 1BA:** 80
- **2BR / 2BA:** 40
- **PENTHOUSE:** 4

Lines with a zero count are omitted entirely. The order matches the order you defined unit types in the Unit Types modal.

The BOM drawer header mirrors these counts as stat tiles next to the existing camera/access-control tiles.

%PAGEBREAK

%H1 Bill of Materials

The BOM updates automatically as you place, move, and edit devices on the floor plans. Open it from the menu or the BOM drawer along the side of the canvas.

%H2 Sections

The BOM is organized into six sections, in the order they appear on the proposal:

- **CAMERAS** — every placed camera
- **RECORDING** — NVR and storage
- **NETWORK** — switches and head-end network gear
- **ACCESS CONTROL** — readers, controllers, and related hardware
- **SMART APARTMENT** — intercoms, parcel lockers, mailbox banks, and in-unit IoT devices
- **OTHER** — catch-all for anything that doesn't fit a named section

The BOM is an equipment-only procurement list. Cabling and labor are tracked separately on the Take-Off page (estimator's document) and the Quote page when pricing is loaded — these don't appear on the BOM.

%H2 Auto-rows vs. custom lines

**Auto-rows** are generated from your floor-plan markups. Each placed device contributes to a line. Auto-rows recalculate whenever you change the markup. You can't directly edit an auto-row — change the floor plan and the row updates.

**Custom lines** are rows you add yourself for items the auto-rows can't infer — site-specific extras, custom labor, hardware that doesn't have a placement counterpart. Add them inside the section where they belong.

%H2 Typical-floor multiplier

If a page is configured as a typical floor (e.g., "Floor 3-12, typical = ×10"), every placed device on that page contributes its quantity × the multiplier. This applies uniformly to cameras, access control, smart apartment devices, and in-unit IoT — so the BOM totals reflect the real device count across the whole building.

The riser diagram's per-floor equipment schedule still shows the per-floor count (the floor band heading shows the multiplier). The BOM and cover summary apply the multiplier.

%H2 CSV export

Export the BOM as a CSV from **File → Export BOM (CSV)**. The CSV preserves the section structure and is ready for use in spreadsheet tools or procurement software.

%PAGEBREAK

%H1 Exporting the Proposal

When the project is ready, choose **Proposal → Export PDF**. The tool generates a complete proposal package as a single PDF file.

%H2 What's in the proposal PDF

%NUMLIST export
1. **Cover page** — project name, customer, address, your contact info, and a summary that includes device counts plus per-bedroom-type unit counts.
2. **Bill of Materials** — every section with auto-rows and custom lines, formatted as a clean table.
3. **Riser Diagram** — a one-line drawing showing the system topology (head-end equipment, switches, UPS, cameras grouped by zone with cable IDs and lengths, and smart-apartment devices on the rail).
4. **Floor Plan Markups** — one page per floor plan, with every device shown in its placed location.
%ENDNUMLIST

%H2 Choosing what to include

In **Project Info → Proposal Sections**, you can toggle off any of the four sections (cover, BOM, riser, floor plans). Useful when you only need a portion of the package, e.g., a BOM-only export for accounting review.

%H2 Riser diagram basics

The riser is generated automatically from your floor-plan markups. It shows:

- Head-end equipment (NVR, PoE switches, UPS) at the top
- A horizontal band for each zone (e.g., Floor 1, Parkade, Roof), stacked top-to-bottom
- Cameras as icons in the upper sub-region of each band, with cable lines back to the switch
- Access control (readers, controllers), intercoms, parcel lockers, and mailbox banks on the rail in the lower sub-region of each band
- Cable IDs (C-01, C-02, ...) and dual-unit lengths next to each cable line
- An equipment schedule on the right side of the page listing every device per floor (grouped by SKU where applicable) with model, zone, and qty

Devices in each zone band are sorted left-to-right by their floor-plan position and distributed evenly across the rail. In high-density zones (15+ devices per rail), the layout wraps to a second row to keep icons readable.

*You can't edit the riser directly — it's generated from your floor plans. To change what's on it, edit the camera (or other device) on the floor plan and the riser updates automatically.*

%PAGEBREAK

%H1 The Take-Off Page

The take-off page is the estimator's working document — a tabular "schedule of quantities" that lists every device on the floor plans, plus cabling and labor summaries. It's distinct from the BOM (which is procurement-focused, equipment-only) and from the floor plan markups (which show device placement, not detail).

The take-off automatically appears in the exported proposal PDF between the BOM and the Riser, when there's content to show. It can be toggled off in the Export modal under Proposal Sections.

%H2 What the take-off shows

The take-off is organized into seven subsections:

- **Cameras** — one row per placed camera with model, brand, mount height, FOV, reach
- **Access Control** — one row per placed reader / controller with subcategory and variant
- **Smart Apartment: Placed Devices** — intercoms, parcel lockers, mailbox banks
- **Smart Apartment: In-Unit (IoT)** — Smart Lock / Thermostat / Water Sensor with per-suite count and total
- **Suites** — one row per dwelling unit with type and BR/BA
- **Head-End Equipment** — NVR, switches, UPS rolled up by model
- **Cabling Summary** — total runs, total length, average run, and the routing overhead multiplier in use
- **Labor Summary** — install hours by category (camera, reader, intercom, etc.) plus head-end bench-up, cabling, and commissioning

All quantities reflect typical-floor multipliers — a camera on a page configured as "3 typical floors" contributes 3× to the cabling and labor totals (the placed-device rows still show one marker per placement, since rows are markers, not units).

%H2 What the take-off does NOT show

- Prices or costs (those come from the Quote, when pricing is loaded — a future release)
- Profit margin, tax, or grand total
- Customer-facing prose

The take-off is for the estimator's bidding workflow. The BOM is for procurement once the job is awarded.

%H2 Section 3b: IoT Per-Suite Quantities

The IoT subsection shows the per-suite count for each selected IoT device. When all unit types specify the same count for a device, the column reads the integer (e.g., "1"). When unit types differ — for example, Penthouses get 2 smart locks but 1BRs get 1 — the column shows the weighted average (e.g., "1.2 (avg)") so the estimator can see at a glance that the count varies. The "Total Qty" column always shows the true total across all suites.

%H2 Toggling the page off

In the export modal under Proposal Sections, uncheck "Take-Off Page" to skip it. The PDF goes directly from BOM to Riser. Useful when you only need a quick BOM-only export for procurement review.

%PAGEBREAK

%H1 Saving and Reloading Projects

%H2 Auto-save

The tool auto-saves your work as you go. A small indicator in the top bar shows the auto-save state:

- **"Auto-saved N min ago"** — your work is committed to the browser's local storage.
- **Amber dirty indicator** — there are unsaved changes that will save shortly.

%H2 Manual save

Use **File → Save Project** to download a JSON file of your entire project — floor plan PDF reference, all device markups, BOM custom lines, project info, and settings. Keep this file in your project folder as a portable backup.

%H2 Loading a project

Use **File → Open Project** to load a saved project JSON. The tool restores everything: floor plan, devices, BOM, project info.

%CALLOUT Backwards compatibility
Older project files (saved before a new feature shipped) load cleanly. Any fields that didn't exist when the file was saved default to safe values, and you can save again to upgrade the file format.
%ENDCALLOUT

%PAGEBREAK

%H1 Tips, Shortcuts, and Troubleshooting

%H2 Keyboard shortcuts

%TABLE
Key | Action
Delete | Remove the currently selected device
Esc | Close the open modal or right panel
1–6 | Switch between the six modes (Cameras, AC, Intercoms, Parcel, Mailbox, Suites)
%ENDTABLE

%H2 Equipment Labels visibility

The View menu's **Equipment Labels** group controls the text labels shown next to each device on the floor plan. The master toggle hides or shows all device labels at once; the six children (Camera, Access Control, Intercom, Parcel, Mailbox, and Suite Labels) toggle each family independently.

Hiding labels affects only the text — device markers and camera FOV cones remain visible. The master toggle shows a checkmark when all six children are on, a dash when some are on and some off (indeterminate), and is unchecked when all six are off.

Label-visibility preferences are saved with the project, so a clean-view configuration carries over between sessions.

%H2 Working tips

- **Calibrate every page that has devices.** Uncalibrated pages show cable lengths as "—" on the BOM and riser.
- **Use consistent zone names.** When defining zones for the riser, type the same name for related cameras ("Floor 1", not a mix of "Floor 1" and "1st Floor"). The autocomplete will help you converge.
- **Click empty space to deselect.** Easy way to close the right panel without dismissing modals.
- **Save often, even with auto-save on.** Auto-save is in browser local storage — clearing your browser data will lose it. A manual save downloads a portable JSON file.
- **Bedroom/bathroom labels auto-fill.** In the Unit Types modal, leave the Label blank and set BR/BA — the label fills in as "2BR / 1.5BA" automatically. Override the label any time and your text sticks.

%H2 Common questions

%H3 Can I undo a delete?

Not currently. Be careful with the Delete key. If you delete the wrong device, you'll need to place it again.

%H3 Can I edit the riser diagram by hand?

No. The riser is generated from your floor-plan markups. To change what's on it, change the floor plan and re-export.

%H3 Why is my cable length showing as "—"?

The page that camera is on hasn't been calibrated. Run the scale calibration tool on that page and the length will appear.

%H3 Can different unit types get different IoT devices?

Yes — as of v1.2. Check the devices you want in the IoT Devices modal, then go to the Unit Types modal. Each selected device appears as a column. Enter the per-suite count for each unit type (e.g., 2 locks for a Penthouse, 1 for a Studio). The BOM and Take-Off automatically use those counts when computing totals across the building.

%H3 Can two people work on the same project at once?

Not currently. The tool is a single-user, single-browser session. To hand off a project, save the JSON and send it to the next person.

%H3 Can I import an existing BOM from a spreadsheet?

Not currently. Custom lines have to be entered through the BOM editor.

%PAGEBREAK

%H1 Version History

This guide is updated with each major release of the tool.

%H2 Version 1.6 — May 2026

Cleanup pass. UI clarity and consistency improvements across the device-picker panes, plus a new Equipment Labels visibility control.

- Left-pane section headers now use clear static labels (Camera Manufacturers / Camera Styles / Camera Models, and the parallel for each mode)
- Camera Styles tile icons now match the markers drawn on the floor plan
- Fisheye cameras now render their FOV coverage wedge
- New Camera Accessories section in the Cameras pane (houses the CMVR/NVR head-end placement)
- New Equipment Labels visibility group in the View menu — master toggle plus per-family controls for hiding/showing device text labels; preferences saved with the project
- Removed the standalone Suites-mode "Hide unit labels" control (suite-label visibility now lives only under Equipment Labels → Suite Labels)

%H2 Version 1.5 — May 2026

Riser Layout pass. Devices on the riser now auto-spread evenly within each zone band, with multi-row wrap for high-density zones (15+ devices per rail).

- Devices in each rail are sorted left-to-right by floor-plan position
- Rails wrap to multiple rows when device count exceeds 15
- Camera rail and AC rail wrap independently
- AC category ordering preserved across rows (readers → controllers → intercoms → parcels → mailboxes)
- Cable lines re-route automatically with new device positions

%H2 Version 1.4 — May 2026

Take-Off Page pass. New tabular schedule-of-quantities page in the proposal PDF between BOM and Riser. Equipment per-device detail, cabling totals, labor hours by category. Toggleable from the export modal.

- New Take-Off Page rendered in the proposal PDF between BOM and Riser
- Seven subsections: cameras, AC, smart apartment placed, smart apartment IoT, suites, head-end equipment, cabling summary, labor summary
- Section 3b shows IoT per-suite counts; weighted-average suffix "(avg)" appears when unit types specify different counts
- Page is toggleable from the Export modal (Proposal Sections → Take-Off Page)
- Auto-paginates with continuation headers + footers for large projects
- LABOR_RATES table in the codebase is consumed by the Take-Off; future Pricing pass adds dollar values

%H2 Version 1.3 — May 2026

BOM Restructure pass. BOM is now an equipment-only procurement list.

- Cabling and Labor sections removed from the BOM
- GRAND TOTAL on the cover page now reflects equipment-only totals
- Cabling and labor data computed separately; will surface on the Take-Off page (next pass) and the Quote page (future pass) when pricing is loaded
- BOM drawer labor-rate / labor-hours inputs removed (no longer had any compute effect after the restructure)
- Custom lines previously in the Cabling or Labor sections of older saves are now preserved in the OTHER section with a "(was: Cabling)" or "(was: Labor)" prefix on load

%H2 Version 1.2 — May 2026

Suites Polish pass. The IoT Devices modal now selects which devices are available for per-unit-type configuration. Unit types gain dynamic columns for setting per-suite IoT counts. BOM and Take-Off automatically apply these counts when computing totals across the building.

- IoT Devices modal: 3 checkboxes now mean "available for per-unit-type configuration" rather than "every suite gets this"
- Unit Types modal: dynamic columns appear per selected IoT device, letting integrators set per-suite counts per unit type
- Duplicate unit-type labels now flagged with an inline error
- Suites mode left pane: Unit Types and IoT Devices entry tiles redesigned to match the Tier-1 tile aesthetic used in other modes
- Mode color identity: every top-rail mode tab and Tier-1 tile in all modes now uses a consistent mode-color palette (Cameras=red, Access=blue, Intercoms=green, Parcel=orange, Mailbox=pink, Suites=purple) for selected and hover states
- Intercom tile color shifted from teal to green (canvas marker teal preserved); Suite mode color shifted from green to purple

%H2 Version 1.1 — May 2026

Pass N+1 complete. Adds smart-apartment device families and IoT integration on top of the v1.0 surface.

- New **IoT Devices** modal in Suites mode (Smart Lock, Thermostat, Water Sensor)
- New **SMART APARTMENT** BOM section grouping intercoms, parcel lockers, mailbox banks, and in-unit IoT
- Cover summary now shows INTERCOMS / PARCEL LOCKERS / MAILBOX BANKS counts and per-unit-type suite counts
- BOM drawer header mirrors the new counts as stat tiles
- Riser diagram extended: smart-apartment devices appear on the head-end rail; per-floor equipment schedule includes grouped smart-apartment rows
- All counts respect typical-floor multipliers
- Intercom color shifted from teal-600 to teal-700 (`#0f766e`) to better distinguish from turret cameras at small riser scale

%H2 Version 1.0 — May 2026

Initial user guide release. Covers all features shipped through Pass N+1 milestones M5, M6, and M7 plus subsequent polish.

- Six device modes (Cameras, Access Control, Intercoms, Parcel Lockers, Mailbox Banks, Suites)
- Unit Types management with auto-filled labels from bedrooms/bathrooms
- Suite placement, right-panel editing, and hide-labels toggle
- Cross-mode click and drag (top-most device wins)
- Auto-generated bill of materials with custom-line support
- Auto-generated riser diagram
- PDF proposal export with toggleable sections
- Project JSON save and load with backwards-compatible loading

*This document supersedes any earlier user-facing documentation. Last updated: May 20, 2026.*
