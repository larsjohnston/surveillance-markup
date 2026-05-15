# Pass N+1: Smart Apartment Devices + Suites + Multi-Mode Architecture

## Context

Multi-family residential proposals routinely include device families that aren't cameras and aren't traditional access control. The integrator quotes them under "smart apartment" or "smart amenity" lines: lobby video intercoms, parcel lockers, mailbox banks, and IoT in-unit devices (smart locks, thermostats, water sensors). They also need to enumerate the units themselves — count of 1BR vs 2BR vs penthouses — for both the proposal narrative and per-unit IoT device computation.

This pass adds four new placeable device families plus a unit (suite) tracking system. The tool's mode structure expands from 2 top-level modes (Cameras, Access Control) to 6:

1. Cameras (existing)
2. Access Control (existing)
3. Intercoms (new)
4. Parcel Lockers (new)
5. Mailbox Banks (new)
6. Suites (new)

Pass N must ship first. This brief assumes the ACCESS CONTROL BOM section, the AC rail on the riser, and the cover-summary AC lines are all in place. Pass N+1 BUILDS on Pass N's groundwork but expands the mode model significantly.

## What stays the same

- Cameras mode and Access Control mode — both unchanged in their core behavior
- Right-side details panel pattern — extended to handle four new device families
- AC riser rail from Pass N — extended to host intercom, parcel, and mailbox icons
- Pass N's ACCESS CONTROL BOM section — extended OR split (see D2 below)
- Save/load — extended with new arrays; reads older saves cleanly
- The drill-down pattern (Tier 1 / Tier 2 / Tier 3) for catalogs

## What changes for the user

**Today (after Pass N):**
- Blue sidebar has 2 modes: Cameras, Access Control
- Mode switch via top bar or hotkey
- Each mode has its own left-pane drill-down

**After this PR:**
- Blue sidebar has 6 modes: Cameras, Access Control, Intercoms, Parcel Lockers, Mailbox Banks, Suites
- Each new mode has its own drill-down + right panel + canvas placement behavior
- Suites mode introduces a project-level concept (unit types) with two modals
- BOM gains a new SMART APARTMENT section (separate from ACCESS CONTROL)
- Cover summary gains lines for intercoms, parcel lockers, mailbox banks, and per-bedroom-type unit counts

## Decisions (confirmed)

### D0. Mode architecture — CONFIRMED 6 top-level modes

Override of original D0 (sub-grouping under AC). Each new device family gets its own top-level mode in the blue sidebar, with its own icon, drill-down, and right panel.

Rationale: clearer mental model (blue rail = device family), no manufacturer-mismatch ("Brivo intercoms" doesn't exist), simpler drill-down per mode, parallel structure across all six modes.

Cost: 4 new modes added in one pass. Each needs its own:
- Blue rail icon (flat SVG matching existing style)
- Left-pane drill-down (catalog of available SKUs)
- Canvas placement + drawing functions
- Right-panel field block
- Selection state variable
- Mode-switch cascade entry

### D1. Selection state — CONFIRMED separate vars per mode

Six separate selection states, one per mode:
- `selectedId` (cameras, existing)
- `acSelectedId` (readers + controllers, existing)
- `intercomSelectedId` (new)
- `parcelSelectedId` (new)
- `mailboxSelectedId` (new)
- `suiteSelectedId` (new)

Mutual exclusion: setting any one clears the other five. `closeRightPanel()` clears all six.

Rationale: mirrors existing pattern, no refactoring of existing camera/AC code.

### D2. BOM section structure — CONFIRMED two sections (split from Pass N)

ACCESS CONTROL section (from Pass N) keeps:
- Readers (auto-rolled by SKU)
- Controllers (auto-rolled by SKU)
- Credentials (auto-rolled, sized to reader count)
- Custom lines for door accessories (PSUs, REX, strikes)

NEW SMART APARTMENT section adds:
- Intercoms (auto-rolled by SKU)
- Parcel lockers (auto-rolled by SKU)
- Mailbox banks (auto-rolled by SKU)
- In-unit IoT devices (auto-rolled from suite counts × default ruleset — see D7)

Section order in BOM: cameras → recording → network → cabling → ACCESS CONTROL → SMART APARTMENT → labor → other (8 sections total).

Suites do NOT have their own BOM section. They drive the in-unit IoT device counts in SMART APARTMENT.

### D3. Single smartApartment[] array — CONFIRMED with type discriminator

```javascript
var smartApartment = [];  // [{id, page, x, y, type:'intercom'|'parcel'|'mailbox', model, label, notes}]
```

One save/load path, one BOM iteration. Three selection state vars filter the array by `type`.

`smartAptCounters = { intercom: N, parcel: N, mailbox: N }` per page for label generation.

Suites get their own array: `suites = [{id, page, x, y, label, unitType, hidden}]`. Different data shape (unit type metadata, hidden toggle) justifies separation.

### D4. Riser presence — CONFIRMED on AC rail after readers and controllers

Intercoms, parcel lockers, and mailbox banks ride the AC rail (from Pass N M2). Ordering: readers → controllers → intercoms → parcel → mailbox. Suites do NOT appear on the riser (they're not equipment).

Icon shapes:
- **Intercom**: small rounded rectangle with horizontal "video screen" inset
- **Parcel Locker**: 3×2 grid pattern
- **Mailbox Bank**: 4×2 grid pattern (visually distinct from parcel via aspect ratio)

No cable lines from any smart apartment device, carrying forward Pass N D3 rule.

### D5. Cover summary — CONFIRMED 7+ new lines, each hidden when zero

Existing cover summary lines (from Pass N): CAMERAS / FLOORS / SCALE CALIBRATED / AC READERS / AC CONTROLLERS / GRAND TOTAL.

New lines for Pass N+1, each hidden when its count is zero:
- INTERCOMS: N
- PARCEL LOCKERS: N
- MAILBOX BANKS: N
- Per-bedroom-type lines (one per defined unit type): e.g.,
  - 1BR/1BA: 80
  - 2BR/2BA: 40
  - 3BR/2BA PENTHOUSE: 5

All multiplied across typical floors. Empty/zero categories hide their line.

Cover summary box height grows dynamically per Pass N M5 pattern.

### D6. Icon colors — separate per device family

Each new device family gets its own color, distinct from existing palette and from each other:

- **Intercoms**: teal `#0d9488` (distinct from camera turret `#0891b2` — slightly darker, less saturated)
- **Parcel Lockers**: amber `#d97706` collision with LPR → use orange `#ea580c` (more saturated, distinct from LPR amber)
- **Mailbox Banks**: rose `#e11d48` (distinct from camera dome red `#c8202c` — pinker, less brick)
- **Suites**: green `#15803d` (distinct from camera fisheye green `#16a34a` — darker, more forest-toned)

Each color stored as a top-level constant near `TYPE_COLORS`:
```javascript
var INTERCOM_COLOR    = '#0d9488';
var PARCEL_COLOR      = '#ea580c';
var MAILBOX_COLOR     = '#e11d48';
var SUITE_COLOR       = '#15803d';
```

Visual sanity-check during M9 testing: confirm these four colors plus the existing palette don't visually collide at riser-icon scale (~10-13pt) or canvas-icon scale (~17-24pt).

### D7. Suites — CONFIRMED upfront modal + per-click modal + hidden toggle

**Project-level unit-type catalog** (project metadata):

```javascript
projectInfo.unitTypes = [
  { id: 'ut-1', label: '1BR/1BA Standard', bedrooms: 1, bathrooms: 1 },
  { id: 'ut-2', label: '2BR/2BA Corner',  bedrooms: 2, bathrooms: 2 },
  ...
];
```

**Modal #1 — Unit types catalog (upfront)**:
- Triggers on first entry to Suites mode (if `projectInfo.unitTypes` is empty)
- Also reopenable via "Manage Unit Types" button in Suites mode left pane
- Modal contents: list of unit types with fields (label, bedrooms, bathrooms). Add Row / Remove Row. Skip option (saves empty array, closes modal — user can revisit later).
- Saves to `projectInfo.unitTypes`. markDirty on save.

**Modal #2 — Per-suite placement**:
- Triggers when user clicks empty canvas in Suites mode
- Auto-populates suggested label: `Unit ${floor}${nextNumber}` (e.g., Unit 101 on Floor 1, Unit 201 on Floor 2). Sequential per floor.
- Dropdown: pick unit type from `projectInfo.unitTypes`
- Confirm → create suite at click point, modal closes, right panel opens
- Cancel → no suite placed, modal closes

**Suite marker on canvas**:
- Default visualization: the unit label text (e.g., "Unit 101") drawn in suite green at the click point
- Draggable
- Right-click or × in panel → delete

**Hide toggle**:
- Per-floor or project-wide toggle (default: show all)
- When hidden: labels disappear, replaced with a small dot/icon at each suite's position. Clicking the icon opens that suite's details panel.

**Right panel for a suite**:
- Label (editable, dragged labels can be renamed)
- Unit Type (dropdown, defaults to current type, changing it recomputes BOM IoT counts)
- Notes (editable)
- Position info: floor name + click point coords

**In-unit IoT devices — hardcoded ruleset for Pass N+1**:
- Modal #3 (separate, triggered from Suites mode or Project Info): "Select IoT devices applied to all units"
- Checkboxes for: Smart Lock / Thermostat / Water Sensor / (extensible)
- Saves to `projectInfo.iotDevices = { smartLock: true, thermostat: true, waterSensor: false }`
- BOM SMART APARTMENT section auto-computes:
  - For each selected IoT device type, qty = total suite count × typical-floor multiplier
- This is a temporary hardcoded ruleset. The future Rules Page editor (parked) will let the integrator set per-unit-type rules (1BR = 1 lock, 2BR = 2 locks, etc.). For Pass N+1, every unit gets the same device set.

**Parked items (out of scope for Pass N+1)**:
- Rules Page editor (per-unit-type IoT device rules)
- Take-Off Page on PDF export (separate brief later)
- Canvas FOV toggle (turn camera cones on/off — separate brief later)

## Scope (milestones)

**9 milestones — significantly larger than Pass N.** Six new modes, two new BOM sections, suite tracking system, three modals.

### M1 — Blue rail expansion + mode framework

- Add 4 new blue rail icons (Intercom, Parcel, Mailbox, Suite) — flat SVG, matching existing style
- Extend mode switching to handle 6 modes
- New mode state variables: `mode === 'intercom' | 'parcel' | 'mailbox' | 'suite'` join `'cameras' | 'access'`
- New selection state vars: `intercomSelectedId`, `parcelSelectedId`, `mailboxSelectedId`, `suiteSelectedId`
- `closeRightPanel()` clears all six selection states
- Mode-switch cascade: switching to any new mode clears the others' selections
- JSON version bump to v16 (additive only, no destructive migration). Older saves load with `smartApartment = []`, `suites = []`, `projectInfo.unitTypes = []`, `projectInfo.iotDevices = {}`.

### M2 — Smart apartment data plumbing

- Add `smartApartment[]` array with type discriminator (per D3)
- Add `smartAptCounters = { intercom: N, parcel: N, mailbox: N }` per page
- Add three placeholder catalogs:
  - `INTERCOM_DB` — 2 SKUs (Lobby Panel, Unit Panel)
  - `PARCEL_DB` — 1 SKU (24-bay Single Bank)
  - `MAILBOX_DB` — 1 SKU (16-unit Cluster)
- Each SKU has: `{brand, model, desc, [type-specific metadata: panelType / bays / units]}`
- Catalogs labeled "placeholder" in their desc strings to prevent accidental customer-facing leakage

### M3 — Smart apartment placement + canvas drawing

- Three new drill-down renders (one per mode), each shows the placeholder catalog as Tier 1 tiles
- Click tile → arms placement (per `armModel` vs `pickModel` distinction in CLAUDE.md)
- Click canvas in armed state → place device, generate label (`INT-P1-N`, `PL-P1-N`, `MB-P1-N`)
- Three new canvas-draw functions: `drawIntercom`, `drawParcelLocker`, `drawMailboxBank`
- Three new hit-test functions
- Drag-to-move support
- Selection ring (yellow `#fbbf24`) on selected device, matching cameras/AC pattern

### M4 — Smart apartment right-panel field blocks

- Three new field blocks: `rp-intercom-fields`, `rp-parcel-fields`, `rp-mailbox-fields`
- Each shows label (editable), brand + model (read-only), type-specific metadata (panelType / bays / units), notes (editable)
- Three new display functions paralleling `updateRightPanelDisplayForReader`
- Three new open functions wired into selection
- `closeRightPanel()` extended to hide all new field blocks

### M5 — Suites data plumbing + Modal #1 (unit types)

- Add `suites[]` array
- Add `projectInfo.unitTypes[]` (project metadata)
- Implement Modal #1: unit types catalog
  - Triggers on first entry to Suites mode (when `projectInfo.unitTypes.length === 0`)
  - Manual reopen via "Manage Unit Types" button in Suites mode left pane
  - Add Row / Remove Row / Skip / Save buttons
- Save to `projectInfo.unitTypes`, markDirty
- JSON shape: `unitTypes: [{id, label, bedrooms, bathrooms}, ...]`

### M6 — Suites placement + Modal #2 (per-suite placement)

- Click in Suites mode → Modal #2 triggers
- Auto-suggest label (sequential per floor: Unit 101, 102, 201, etc.)
- Dropdown shows `projectInfo.unitTypes`
- Confirm → create suite, place marker at click point, open right panel
- Cancel → no suite placed
- Canvas marker: unit label text in green, draggable
- Hit-test: bounding box around label text

### M7 — Suites right panel + hide toggle

- Right panel for suite: label, unit type dropdown, notes, position info
- Hide toggle: button in Suites mode left pane (or canvas toolbar) toggles `suitesHidden` state
- When hidden: replace labels with small green dot/icon at each suite's position; clicking dot opens panel
- Per-suite delete via × in panel header

### M8 — Modal #3 (IoT devices) + BOM SMART APARTMENT section

- Implement Modal #3: IoT device selection
  - Triggered from Suites mode or Project Info
  - Checkboxes: Smart Lock, Thermostat, Water Sensor
  - Save to `projectInfo.iotDevices = { smartLock: bool, thermostat: bool, waterSensor: bool }`
- BOM SMART APARTMENT section:
  - Inserted between ACCESS CONTROL and Labor
  - Auto-rows: intercoms (grouped by SKU), parcel lockers (grouped), mailbox banks (grouped)
  - Auto-rows: in-unit IoT devices, computed as `suites.length × typical-floor-multiplier × selectedIotDevicesCount`
  - Custom lines allowed
- Update all five hard-coded section-key arrays from Pass N (bomCustomLines, recalcBom, drawProposalBOM, exportBomCSV, cover subtotal loop) to include `smartApartment` key

### M9 — Riser + Cover summary integration + Polish

- Riser AC rail: extend Pass N M2 to render intercom + parcel + mailbox icons after readers/controllers
- Equipment schedule rows: add smart apartment rows in each band after AC rows
- Cover summary: add INTERCOMS / PARCEL LOCKERS / MAILBOX BANKS lines (per-bedroom-type lines from suite counts)
- BOM drawer header: add three smart apartment count tiles + per-bedroom-type tiles (mirror cover)
- Visual color collision check at all icon scales

### Acceptance walk

- Full regression: cameras-only project renders identically to Pass N
- All six modes accessible, drill-down works, placement works
- Save/load round-trip preserves all 4 new arrays + project-level unitTypes + iotDevices
- Older Pass-N saves load with empty new arrays
- Cover summary lines hide independently when zero
- BOM has 8 sections; SMART APARTMENT shows correct IoT counts based on suite count × selected devices

## Implementation hints

- Follow the same pattern as Pass N for each new mode: arm → place → select → right panel → drag → delete
- Three modals follow existing modal patterns in the codebase (search for `openModal` / `closeModal` or equivalent — Pass A.6 export modal is a good reference)
- Color constants live near `TYPE_COLORS`. Don't shadow CSS variables.
- Section ordering in BOM matters — five hard-coded arrays need `smartApartment` inserted between `accessControl` and `labor`
- Each new mode's drill-down render reuses the Pass Left-Pane M3 pattern (Tier 1 tiles + click handler)
- Suite labels use a different counter pattern (per-floor sequential rather than `<MFR>-<FLOOR>-<NUM>`)

## Constraints

- Don't change cameras or AC subsystems beyond extending close cascade and BOM section ordering
- Don't add cable rendering (carries Pass N D3 rule)
- Don't introduce new dependencies
- Don't break Pass N-era saves (additive only)
- JSON v15 → v16, no migration banner (additive shape change)
- Match existing aesthetic: flat icons, same right-panel layout, same canvas drag behavior
- Placeholder SKUs marked clearly to prevent customer-facing leakage
- IoT device list is hardcoded for this pass; Rules Page editor is a separate future pass

## What this PR is NOT doing

- Rules Page editor (per-unit-type IoT device rules) — separate future pass
- Take-Off Page on PDF export — separate future pass
- Canvas FOV toggle (turn camera cones on/off) — separate future pass
- Smart locks, thermostats, water sensors as canvas-placeable devices (they're BOM-only via IoT computation)
- Z-Wave / Zigbee / Bluetooth gateway devices
- Real curated SKU catalogs (Comelit, Aiphone, Parcel Pending, Luxer, USPS-approved cluster boxes)
- Cable runs / wiring diagrams for any smart apartment device
- Per-suite IoT device overrides (penthouse gets 2 locks, etc.) — Rules Page does this
- Compatibility checks between manufacturers
- Mobile-credential issuance, intercom unit-directory configuration

## Process

1. Read `camera_markup_tool.html`, `CLAUDE.md`, `PASS_N_BRIEF.md`. Pass N context is foundational.
2. Confirm all decisions with user. D0 (6 modes vs sub-grouping) is the load-bearing decision.
3. Lay out implementation as a numbered checklist before writing code. Confirm with user.
4. Execute M1 → M9 in order. Syntax check after each milestone. Step Report per CLAUDE.md format.
5. After M3 specifically: include canvas-icon visual verification — three new icon shapes is a visual change that "looks fine" doesn't cover.
6. After M9: include riser + cover summary visual verification with a project that has all 6 device families populated.
7. Tell user what to test in the browser at each milestone end.

## Test cases per milestone

(Same test-case format as Pass N — placement, drill-down, save/load, BOM, cover. Full test list expanded in M1 step report.)

## Out of scope (explicitly)

- Rules Page editor (parked)
- Take-Off Page on PDF export (parked)
- Canvas FOV toggle (parked)
- Real SKU catalogs for any of the four new device families
- Per-suite IoT overrides
- Smart locks / thermostats / water sensors as canvas-placeable devices
- Building-wide IoT gateways or hub devices
- Compatibility checks between devices
- Unit-directory / mobile-credential / mailbox-numbering configuration
- Floor-plan-level intercom call routing
