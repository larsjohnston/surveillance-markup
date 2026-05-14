# Pass N+1: Smart Apartment Devices

## Context

Multi-family residential proposals routinely include a category of devices that aren't cameras and aren't traditional access control. The integrator quotes them under "smart apartment" or "smart amenity" lines: lobby video intercoms, parcel lockers, and mailbox banks. They're physical fixtures placed at specific points on the floor plan (the lobby panel goes at the front entrance; the parcel locker sits in the package room; the mailbox bank occupies a wall in the mail room), so they're natural candidates for canvas placement alongside cameras and readers.

This pass adds three new placeable device types to the tool: **video intercoms**, **parcel lockers**, and **mailbox banks**. Each gets an icon family, canvas placement, a right-side details panel, and BOM presence. They share the ACCESS CONTROL BOM section established in Pass N (per Pass N's D1 forward-looking scope), so this pass adds device types rather than a new top-level subsystem.

Pass N must ship first. This brief assumes the ACCESS CONTROL BOM section, the AC rail on the riser, and the cover-summary AC lines are all in place.

## What stays the same

- Cameras mode and Access Control mode — both unchanged
- The two existing top-level mode toggles (Cameras / Access Control)
- Right-side details panel — extended to handle smart-apartment devices but otherwise unchanged
- AC riser rail and ACCESS CONTROL BOM section from Pass N — extended to host smart-apartment rows
- Cover summary — extended with optional smart-apartment counts but the existing lines untouched
- Save/load — extended with the new device array but reads older saves cleanly

## What changes for the user

**Today (after Pass N):**
1. The integrator places cameras and AC readers on the floor plan
2. Riser shows both subsystems; BOM has six camera sections + one ACCESS CONTROL section
3. For a residential proposal that includes mailboxes/lockers/intercoms, the integrator adds custom BOM lines manually and notes their positions in a separate document

**After this PR:**
1. The integrator opens Access Control mode (or whichever mode hosts these per D0 below)
2. Picks "Video Intercom" from the left pane, clicks the canvas at the lobby entrance → intercom icon appears, gets a label like `INT-P1-1`, opens in the right panel
3. Picks "Parcel Locker", clicks the package room → locker icon, label `PL-P1-1`
4. Picks "Mailbox Bank", clicks the mail room → mailbox icon, label `MB-P1-1`
5. Riser diagram: each placed device appears on the AC rail of its floor's band (alongside readers and controllers from Pass N)
6. BOM ACCESS CONTROL section: each device shows up as a SKU-grouped auto-row
7. Cover summary: two new optional lines, "INTERCOMS" and "PARCEL/MAIL" (combined; see D5), hidden when zero

## Builds on Pass N

- Pass N established the ACCESS CONTROL BOM section as the home for non-camera devices that aren't head-end equipment. Smart-apartment rows slot into the same `bomCustomLines.accessControl` array and the same auto-row computation pipeline.
- Pass N established the AC rail inside each riser band, sized to grow modestly when AC devices exist on a floor. Smart-apartment devices ride the same rail (no separate third rail).
- Pass N's right-side details panel split (camera fields vs reader fields, from Pass A.8 + Left-Pane M4) is the precedent for adding smart-apartment field variants without forking the panel structure.
- Pass N's no-cable-line rule for AC carries forward: smart-apartment devices don't draw cables to anywhere on the riser either. Same data-doesn't-exist reason.

## Decisions (confirmed)

### D0. UI placement — CONFIRMED sub-grouping under Access Control

No third top-level mode. Smart Apartment Devices live as a **Tier 2 category** under Brivo in the existing AC drill-down, alongside Readers and Controllers. The AC top-level rail in the blue sidebar contains all access-control-adjacent equipment, including smart apartment. Per an earlier-session architectural decision the queue framing in the kickoff was implicitly questioning — explicitly resolved now: **sub-grouping under AC, not third mode**.

Left-pane drill-down after this pass:

```
AC mode
  └─ Brivo
       ├─ Readers          (Mullion / Single / Keypad)
       ├─ Controllers      (ACS6100 / ACS300 / SDC / ACS100)
       └─ Smart Apartment  ← NEW Tier 2 sibling
              ├─ Video Intercoms
              ├─ Parcel Lockers
              └─ Mailbox Banks
```

**Manufacturer-under-Brivo caveat.** The placeholder SKUs in M4 are NOT actual Brivo products (Brivo doesn't sell intercoms or mailboxes). They live under the "Brivo" Tier 1 column purely as a UI simplification — adding a second Tier 1 manufacturer column would force a more invasive left-pane redesign that this pass isn't doing. The SKU `brand` field can still say "Generic" (or eventually "Comelit", "Aiphone", etc.) — that's what shows in the right panel and BOM. The left-pane column header staying as Brivo is a UX shortcut documented here so a future contributor doesn't get confused. When a future pass adds real multi-manufacturer support for AC, smart-apartment SKUs migrate to their actual manufacturer columns.

**BOM home unchanged.** Pass N's ACCESS CONTROL BOM section is still the single home for both subsystems (per Pass N D1). UI hierarchy and BOM section share the same boundary now — no inconsistency to manage.

**Selection state.** Add `smartAptSelectedId` paralleling `acSelectedId`. The unified `closeRightPanel()` (Pass A.8) clears all three (selectedId, acSelectedId, smartAptSelectedId). Setting one clears the others. Pattern carries forward without surprise.

### D1. Device data shape — CONFIRMED single array with type discriminator

Three new top-level arrays mirroring `cameras[]` and `acDevices[]`:

```javascript
var intercoms = [];   // [{id, page, x, y, model, label, notes}]
var parcelLockers = []; // [{id, page, x, y, model, label, notes}]
var mailboxBanks = []; // [{id, page, x, y, model, label, notes}]
```

OR a single `smartApartment[]` array with a `type` discriminator:

```javascript
var smartApartment = [];  // [{id, page, x, y, type:'intercom'|'parcel'|'mailbox', model, label, notes}]
```

**Confirmed: single `smartApartment[]` array.** One save/load path, one BOM iteration, one `selectSmartApt(id)` handler. Filter-by-type at usage sites is the minor cost.

Counters mirror `acCounters` from Pass A.8: `smartAptCounters = { intercom: N, parcel: N, mailbox: N }` per page for label generation (`INT-P1-1`, `PL-P1-2`, `MB-P2-1`).

JSON v15 (or whatever the current version is when this pass starts) bumps to add the new array. `applyProjectState` reads older saves cleanly (no `smartApartment` field → defaults to `[]`).

### D2. Device catalogs — CONFIRMED placeholder catalogs

Each type ships with 1–2 generic SKUs as placeholders:
- Video Intercom: "Generic IP Video Intercom — Lobby Panel" / "Generic IP Video Intercom — Unit Panel"
- Parcel Locker: "Generic Parcel Locker — Single Bank (24-bay)"
- Mailbox Bank: "Generic Cluster Mailbox — 16-unit"

The integrator overrides via custom BOM lines or via the right-panel model field. "Ship the placement and BOM plumbing, populate the catalog later" — same pattern the tool ships today with empty camera pricing. Real SKUs (Comelit, 2N, Aiphone, Parcel Pending, Luxer, USPS-approved cluster boxes) come in a separate catalog-curation pass.

Three SKUs total across three device types. Live in three small JS objects mirroring `CAMERA_DB` / `BRIVO_CATALOG`.

### D3. Right-side panel field variants — CONFIRMED three new field blocks

Each device type has a slightly different read-only attributes section:

- **Video Intercom**: label (editable), manufacturer + model (read-only or "Custom"), panel type ("Lobby" vs "Unit" — read-only), notes (editable)
- **Parcel Locker**: label, manufacturer + model, bay count (read-only, sourced from catalog), notes
- **Mailbox Bank**: label, manufacturer + model, unit count (read-only, sourced from catalog), notes

Reuse the existing `rp-camera-fields` / `rp-reader-fields` block pattern from Pass A.8. Add `rp-intercom-fields`, `rp-parcel-fields`, `rp-mailbox-fields` — three new blocks, only one visible at a time. The header text adjusts:
- Camera selected → "Camera Details"
- Reader selected → "Access Control Reader"
- Controller selected → "Access Control Controller" (added in Left-Pane M4)
- Intercom selected → "Video Intercom"
- Parcel locker selected → "Parcel Locker"
- Mailbox bank selected → "Mailbox Bank"

The unified `closeRightPanel()` from Pass A.8 handles all of these — no change needed beyond adding the new field block visibility.

### D4. Riser presence — CONFIRMED on AC rail after readers and controllers

Smart-apartment devices ride the AC rail (the second rail inside each floor band, from Pass N M2). They render as small distinct-shape icons:

- **Intercom**: small rounded rectangle with a "video screen" inset (Brivo blue or a separate color — see D6)
- **Parcel Locker**: small grid pattern (3×2 cells) suggesting locker bays
- **Mailbox Bank**: small grid pattern (4×2 cells) suggesting mailbox slots — visually distinct from the parcel grid (different aspect ratio)

Devices appear after AC readers on the rail, ordered: readers → controllers → intercoms → parcel lockers → mailbox banks. Per-band sort key: ('R', 'C', 'I', 'P', 'M') — alphabetically natural enough that a future contributor doesn't need to look it up.

If a band has cameras + multiple smart-apartment types, the AC rail gets crowded. The existing band-height-growth rule from Pass N D2 already accounts for "AC rail with content" — the rail width is fixed (trunk to right edge); icons share that width via the same even-distribution math as cameras. If too many devices, icon size shrinks per existing rules. No special-casing.

No cable lines from smart-apartment devices to anywhere on the riser, per the carried-forward Pass N no-AC-cable rule.

### D5. Cover summary additions — OVERRIDDEN to three separate lines

Three separate lines on the proposal cover summary, each hidden when its count is zero:
- "INTERCOMS: N" — multiplied across typical floors
- "PARCEL LOCKERS: N" — multiplied across typical floors
- "MAILBOX BANKS: N" — multiplied across typical floors

Matches the cover-page per-category style (cameras already get multiple lines per category) and the two-line AC override pattern from Pass N D5 (AC READERS / AC CONTROLLERS). A residential proposal with the full mix will show five AC-ish lines on the cover (readers, controllers, intercoms, lockers, mailboxes) — that's the accepted shape; each line is information-dense and not redundant.

A camera-only or AC-only project shows zero of these three lines; the cover summary keeps its original vertical rhythm.

### D6. Icon colors on canvas and riser — LOCKED to magenta `#db2777`

**PTZ-purple collision verified before brief lock.** The codebase has `--ptz:#7c3aed` in the CSS root (`camera_markup_tool.html:19`) and `TYPE_COLORS = { ..., ptz:'#7c3aed', ... }` (`camera_markup_tool.html:1562`). The initial recommendation of `#7c3aed` for smart-apartment was an exact collision with PTZ. Rejected.

**Confirmed palette census** (so the implementer can sanity-check against this list, not against guesswork):
- dome `#c8202c` (camera red)
- bullet `#2563eb` (camera blue)
- turret `#0891b2` (camera cyan)
- fisheye `#16a34a` (camera green)
- ptz `#7c3aed` (camera purple) ← would have collided
- lpr `#d97706` (camera amber/orange)
- AC reader body `#1d4ed8` (Brivo blue — very near bullet but in a different mode/context)
- head-end box `#1e3a8a` (dark navy)

**Locked color: magenta `#db2777`.** Distinct from all six camera type colors, distinct from Brivo blue, distinct from head-end navy. Reads well at small icon sizes and on white PDF backgrounds. Slot it as a new top-level constant `SMART_APT_COLOR = '#db2777'` near `TYPE_COLORS` so future contributors can find it.

All three smart-apartment types share the magenta; icon shape distinguishes them from each other (intercom = rounded rect with screen inset; parcel locker = 3×2 grid; mailbox bank = 4×2 grid). No per-type color sub-shades — that path tested as "is that the same color or not?" friction.

If the riser ever places a PTZ camera and a smart-apartment device in adjacent positions on the same band, verify visually during M5 testing that magenta and PTZ-purple don't read as the same color at riser-icon scale (~10–13pt). If they do, the brief's color picks gets re-opened — but the palette census above suggests this is fine.

## Scope (milestones)

Roughly 6 milestones — larger than Pass N because three device types each need their own canvas drawing, right-panel block, and catalog entry.

### M1 — Left-pane category + data plumbing

Per D0 (sub-grouping under AC): NO new top-level mode. The existing AC mode's left-pane drill-down gets a third Tier 2 sibling alongside Readers and Controllers — "Smart Apartment" — which expands to three Tier 3 subcategories (Video Intercoms, Parcel Lockers, Mailbox Banks). Top bar mode buttons unchanged.

Data plumbing:
- Add the `smartApartment[]` array (per D1, single array with `type` discriminator: `'intercom' | 'parcel' | 'mailbox'`)
- Add `smartAptCounters` per page for label generation (`INT-P1-1`, `PL-P1-2`, `MB-P2-1`)
- Add `smartAptSelectedId` selection state, paralleling `selectedId` (cameras) and `acSelectedId` (readers/controllers)
- Selection mutual-exclusion: setting any one of the three clears the other two; `closeRightPanel()` clears all three
- JSON version bumps. `applyProjectState` reads older saves cleanly (no `smartApartment` field → `[]`; no `smartAptCounters` → `{}`)

Left-pane structural addition: the existing AC drill-down render (Pass Left-Pane M3) gets the Smart Apartment Tier 2 entry. Tier 3 sub-sections expand on click, matching the existing Readers/Controllers expand behavior. Tile clicks ARM placement (per the `armModel` vs `pickModel` distinction documented in CLAUDE.md Drill-down pitfall) — don't retroactively mutate any selected device.

No mode-switch cascade because there's no new mode. Switching FROM AC mode to Cameras still clears `acSelectedId` AND now also `smartAptSelectedId` (one extra line in the existing clear cascade).

### M2 — Canvas placement + canvas drawing

Three new placement actions, one per device type, mirroring `acDevices` placement from Pass Left-Pane M3. Placement happens while in AC mode (per D0) — no mode change required:
- `armSmartApt('intercom')` / `armSmartApt('parcel')` / `armSmartApt('mailbox')` — arming-only state changes (per CLAUDE.md Drill-down pitfall: arm-only, never mutate a selected device)
- Click on canvas in armed state → place device, generate label per type (`INT-P1-N`, `PL-P1-N`, `MB-P1-N`)
- `selectSmartApt(id)` → set selection state, open right panel, redraw

Three new canvas-render functions: `drawIntercom(c, dev, vs, isSelected)`, `drawParcelLocker(...)`, `drawMailboxBank(...)`. Each draws the icon in magenta `#db2777` (per D6, via the new `SMART_APT_COLOR` constant) with shape per the description above. Selection adds the yellow `#fbbf24` outline ring like other devices.

Hit-test functions: `intercomAt(x, y)`, `parcelLockerAt(x, y)`, `mailboxBankAt(x, y)` — match icon bounds.

Drag-to-move support: same as readers/cameras. Existing drag pipeline keys off `dragging.id` against a unified hit-test that now needs to consider smart-apartment devices.

### M3 — Right-side panel field blocks

Per D3: add `rp-intercom-fields`, `rp-parcel-fields`, `rp-mailbox-fields` blocks inside the right panel body. Each has its appropriate fields. Panel header text adjusts per the table in D3.

Three new functions paralleling `updateRightPanelDisplayForReader`:
- `updateRightPanelDisplayForIntercom(dev)`
- `updateRightPanelDisplayForParcel(dev)`
- `updateRightPanelDisplayForMailbox(dev)`

Three open functions (`openRightPanelForIntercom(dev)` etc.) wired into `selectSmartApt(id)`.

`closeRightPanel()` (unified from Pass A.8) clears smart-apartment selection too. The function generalizes — clear all three selection states, hide all five field blocks, slide out. Add the smart-apartment clear and field-hide to the existing function body.

### M4 — Device catalogs (starter SKUs)

Per D2(A): three small JS objects with placeholder SKUs.

```javascript
var INTERCOM_DB = {
  'GENERIC-INT-LOBBY': { brand:'Generic', model:'INT-LOBBY', desc:'IP Video Intercom — Lobby Panel', panelType:'lobby' },
  'GENERIC-INT-UNIT':  { brand:'Generic', model:'INT-UNIT',  desc:'IP Video Intercom — Unit Panel',  panelType:'unit'  }
};

var PARCEL_DB = {
  'GENERIC-PL-24': { brand:'Generic', model:'PL-24', desc:'Parcel Locker — 24-bay Single Bank', bays:24 }
};

var MAILBOX_DB = {
  'GENERIC-MB-16': { brand:'Generic', model:'MB-16', desc:'Cluster Mailbox — 16-unit USPS approved', units:16 }
};
```

These live at module scope near `CAMERA_DB` and `BRIVO_CATALOG`. Read-only at runtime; user populates real SKUs in a future catalog pass.

Left pane shows them in three sections: VIDEO INTERCOMS / PARCEL LOCKERS / MAILBOX BANKS. Each section lists its catalog entries as clickable tiles that arm the next placement (mirroring the camera tile model from Left-Pane M3).

### M5 — Riser + BOM integration

Riser AC rail (from Pass N M2): smart-apartment devices render along it after readers and controllers per the D4 ordering rule. Icon-draw functions for the riser are slim PDF variants of the canvas-draw functions in M2 — paralleling `drawRiserCamIcon` (slim) vs `drawCam` (rich) from Pass A.7.

Schedule rows (from Pass N M4 `buildRiserScheduleRows`): smart-apartment rows appear inside each zone after the AC rows, before head-end equipment. Same 2-column ID/MODEL format.

BOM `computeAutoRows().accessControl` (from Pass N M3): extended to include three more groups after the credentials row:
- Group 4: intercoms grouped by SKU
- Group 5: parcel lockers grouped by SKU
- Group 6: mailbox banks grouped by SKU

Description format: `{DB}[model].brand + ' ' + {DB}[model].model + ' — ' + {DB}[model].desc`. Falls back to "Custom Smart Apartment Device" if model isn't in any DB.

### M6 — Cover summary + save/load + polish

Cover summary per D5 (overridden to three lines): three separate lines, each independently hidden when its count is zero:
- "INTERCOMS: N" — count of `smartApartment[]` entries where `type === 'intercom'`, multiplied across typical floors
- "PARCEL LOCKERS: N" — count where `type === 'parcel'`, multiplied
- "MAILBOX BANKS: N" — count where `type === 'mailbox'`, multiplied

Each uses the same row template as CAMERAS / FLOORS / AC READERS / AC CONTROLLERS. A residential proposal with all three populated adds three lines below Pass N's AC lines, totaling up to five AC-ish rows on the cover. Layout-wise the summary box already grows vertically when content demands — no fixed-height regression risk.

JSON v(N) save:
```javascript
{
  // ... existing fields ...
  smartApartment: smartApartment,
  smartAptCounters: smartAptCounters
}
```

JSON load: read older saves cleanly (no `smartApartment` field → `[]`). `applyProjectState` initializes the two new fields.

Auto-save / `markDirty()` discipline (per CLAUDE.md): every state change to smart-apartment data calls `markDirty()` — placement, deletion, drag-end, label edit, notes edit, model change.

Esc / click-empty-canvas / × in panel: all wired to the unified `closeRightPanel()` already from Pass A.8 — verify the smart-apartment selection clears alongside camera + AC selection.

## Out of scope (explicitly)

- Smart locks at unit doors (Z-Wave / Zigbee / Bluetooth) — these are a different device class with their own complications (one per unit door, hundreds in a tower); deferred to a separate pass
- Smart thermostats — same reasoning as locks; per-unit IoT count is a different problem
- Smart-hub / gateway devices (Z-Wave bridges, building-wide IoT controllers) — deferred until smart-locks/thermostats land
- Real SKU population for the placeholder catalogs (separate catalog-research pass)
- Cable runs / wiring diagrams for any smart-apartment device (no data link, per Pass N D3 rule carried forward)
- Tier system for smart-apartment (cameras have tiers, AC doesn't, smart-apartment doesn't get them either)
- Site survey fields for smart-apartment devices (notes-only, like AC)
- Per-unit accounting (the tool doesn't know how many units a tower has; mailbox banks and parcel lockers are placed *per bank*, not per unit — the integrator picks a 16-unit mailbox cluster, not 16 individual mailboxes)
- Floor-plan-level intercom call routing or unit assignment
- Compatibility checks (e.g., "does this intercom integrate with this AC controller?") — out of scope; the integrator handles compatibility outside the tool

## Constraints

- Don't change the camera or AC subsystems beyond extending the right-panel close path and the ACCESS CONTROL BOM section
- Don't add cable rendering for smart-apartment devices (Pass N pitfall in CLAUDE.md applies)
- Don't introduce new dependencies
- Don't break a project loaded from before this pass (no smartApartment field → empty array, everything still works)
- Match existing aesthetic: same icon style language as cameras and readers (small, flat, semantic color), same right-panel layout, same canvas drag behavior
- The three placeholder SKUs are MARKED as placeholders in their catalog desc strings (e.g., "Generic IP Video Intercom — Lobby Panel — placeholder, replace with distributor SKU"). Mistaking them for real products in a customer quote is a failure mode worth one cheap line of defensive labeling.

## Process

1. Read `camera_markup_tool.html`, `CLAUDE.md`, and `PASS_N_BRIEF.md`. The Pass N brief explains the ACCESS CONTROL BOM section and AC-rail riser additions that this pass extends.
2. Confirm D0–D6 with the user before starting. D0 (mode placement) is the load-bearing decision — get it right.
3. Lay out implementation as a numbered checklist. Confirm with me.
4. Execute M1 → M6 in order. JS syntax check after each milestone. Step Report per CLAUDE.md format.
5. After M2 specifically: include canvas-icon screenshots-or-equivalent. Three new icon shapes is a visual change that "looks fine" doesn't cover.
6. After M5: include riser screenshots showing the AC rail with mixed reader + smart-apartment devices in one band.
7. Tell me what to test in the browser at each milestone end.

## Test cases

### M1 — left-pane category + plumbing

- Top bar still shows two modes only: Cameras / Access Control (no third button added)
- Enter AC mode → left pane shows Brivo > [Readers / Controllers / Smart Apartment]
- Expand Smart Apartment → three Tier 3 subcategories appear: Video Intercoms / Parcel Lockers / Mailbox Banks
- Switching from AC mode to Cameras mode → all three of selectedId / acSelectedId / smartAptSelectedId clear; panel closes
- Save project, reload → smartApartment[] array round-trips, smartAptCounters round-trips
- Load a pre-this-pass save → smartApartment defaults to [], smartAptCounters defaults to {}, no errors

### M2 — placement and canvas

- Arm intercom, click canvas → intercom icon at click point, label INT-P1-1, right panel opens with intercom fields
- Arm parcel locker, click → PL-P1-1, distinct grid-pattern icon
- Arm mailbox bank, click → MB-P1-1, different grid-pattern icon
- Drag any of the three around the canvas → moves smoothly, hit-test follows
- Delete (× in list or Esc with selection) → device removed, list updates
- Place intercom + reader on same page → both visible, distinct shapes, neither obscures the other
- Selection outline (yellow ring) appears on the active device only

### M3 — right panel

- Click intercom → panel header "Video Intercom", fields show panel type
- Click parcel locker → header "Parcel Locker", bay count visible
- Click mailbox bank → header "Mailbox Bank", unit count visible
- Edit label on any device → blur commits, list updates, autosave fires
- Edit notes → same
- Click camera while smart-apartment device is selected → panel swaps to camera fields cleanly
- × in panel header → unified close clears smart-apartment selection along with others
- Esc with smart-apartment device selected → same

### M4 — catalog

- Left pane in Smart Apartment mode shows three sections: VIDEO INTERCOMS, PARCEL LOCKERS, MAILBOX BANKS
- Each section lists its placeholder SKUs
- Click a tile → next click on canvas places that SKU (arming, not retroactive)
- Catalog desc strings include "placeholder" / "replace with distributor SKU" wording

### M5 — riser + BOM

- Place an intercom on Floor 2 → riser Floor 2 band shows the intercom icon on the AC rail
- Place reader + controller + intercom + parcel locker on Floor 2 → all four appear on the AC rail in the documented order (readers, controllers, intercoms, parcel, mailbox)
- Schedule rows for Floor 2 list all four devices after the camera rows
- BOM ACCESS CONTROL section: readers grouped, controllers grouped, credentials sized to reader count (Pass N), intercoms grouped, parcel grouped, mailbox grouped
- Multiple intercoms with the same SKU → grouped into one BOM row with combined qty
- Typical floor multiplier ×15 with 1 intercom on that floor → BOM row qty 15

### M6 — cover + save

- Cover summary shows three lines: "INTERCOMS: 2", "PARCEL LOCKERS: 2", "MAILBOX BANKS: 1" when 2 intercoms + 2 lockers + 1 mailbox bank placed
- Each line hides independently when its count = 0 (intercoms only → only INTERCOMS line shows)
- Typical floor with ×15 multiplier and 1 intercom on that floor → INTERCOMS line counts as 15
- All three lines absent on a camera-only or pure-AC-no-smart-apartment project — summary keeps its original vertical rhythm
- Save project, reload → all smart-apartment devices, labels, notes restore
- Load a Pass N-era save (smartApartment-less) → loads cleanly, smart-apartment data defaults to empty

### Regression

- A camera-only project still exports identically
- A camera + AC project (Pass N-era) still exports identically except for any minor cover-summary spacing tweaks
- Mode switching repeatedly between Cameras and Access Control doesn't leak selection state or stale panel content, even with smart-apartment devices selected at switch time

## What this PR is NOT doing

- Smart locks, thermostats, gateways — three additional smart-apartment device families that came up in discussion. Defer to a follow-up pass once placement/BOM patterns are battle-tested with the easier three.
- Curated SKU catalogs (Comelit, 2N, Parcel Pending, etc.) — separate catalog research pass.
- Cable runs or wiring diagrams for smart-apartment devices
- Per-unit accounting (a 200-unit tower with 200 smart locks would require per-unit data we don't have)
- Compatibility / integration checks between manufacturers
- Mobile-credential issuance, intercom unit-directory configuration, mailbox numbering schemes
- Head-end first-class object (still queue item 7)

These are separate passes.
