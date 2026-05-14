# Pass N: AC Riser & BOM Integration

## Context

AC readers have placement (Pass A.8 / Pass Left-Pane M3), a right-side details panel (Pass A.8), and save/load (v13+). What they DON'T have is any presence in the deliverables: the riser diagram ignores them, the equipment schedule has no ACCESS CONTROL section, and the BOM lists exactly zero AC line items even when readers and controllers are placed.

This pass closes that gap. After this PR, an integrator who places readers and controllers on a floor plan gets a proposal PDF whose riser shows the AC subsystem, whose schedule lists every reader and controller, and whose BOM includes a populated ACCESS CONTROL section. No new device types in this pass — this is "wire up what's already on canvas to the things that ship out."

## What stays the same

- AC placement workflow (left pane category/subcategory drill-down, click to place) — unchanged
- Reader / controller icons on canvas — unchanged
- Right-side details panel for readers — unchanged
- `acDevices[]` data model — no shape change in this pass (no JSON version bump expected; see "Out of scope")
- BRIVO_CATALOG / BRIVO_READERS lookups — unchanged
- The six existing BOM sections — names and order preserved; a 7th section gets added (see M3 decision)
- Cameras-only proposals (a project with zero AC devices) render exactly as they do today

## What changes for the user

**Today:**
1. Place a Brivo reader on Floor 2 → it shows on canvas, in the AC list, in the right panel
2. Open BOM drawer → no reader line, no controller line, no AC anything
3. Export proposal PDF → riser shows cameras only, schedule shows cameras only, BOM shows cameras only
4. Open the PDF on a real proposal and the customer asks "where's the access control we discussed?" → integrator manually adds custom BOM lines

**After this PR:**
1. Place a reader → it shows on canvas (same as today) AND appears in the BOM's new ACCESS CONTROL section, grouped by SKU with quantity reflecting typical-floor multipliers
2. Place a controller → same — appears in BOM under ACCESS CONTROL
3. Open BOM drawer → ACCESS CONTROL section sits below Cabling, above Labor (per M3 decision)
4. Export proposal PDF → riser diagram shows reader clusters next to camera clusters in each floor band; equipment schedule has an ACCESS CONTROL block per floor; BOM page lists every AC SKU
5. Cover summary picks up a READERS count alongside CAMERAS / FLOORS

## Builds on Pass A.7, Pass A.8, Pass Left-Pane M3

- Pass A.7 established the per-page riser band model and bottom-to-top elevation ordering. AC slots into the same bands using the same `getRiserOrder()`.
- Pass A.8 introduced editable reader labels and notes. The schedule reads `dev.label`; if the user renamed `AC-P1-1` to "Lobby Front Door," that name appears in the schedule.
- Pass Left-Pane M3 introduced controllers as a sibling category to readers. Both flow through the same `acDevices[]` array — the BOM section and riser will lump them together visually but tag each row with its category (Reader vs Controller) for the schedule columns.

## Decisions to confirm before implementation

These are the spots where the brief leaves the choice to you. I've put my recommendation first.

### D1. BOM home for AC devices — CONFIRMED A

New 7th section "Access Control" between Cabling and Labor. All AC SKUs (readers + controllers + credentials) live there. Custom-line "+ Add line" works the same as other sections. Single home for AC means the integrator can scan one block. Costs: one new key in `bomCustomLines`, one new auto-row computation, schedule-page renderer needs a 7th section entry.

**Forward-looking scope.** Pass N+1 (Smart Apartment Devices — gateways, thermostats, smart locks, video intercoms, parcel lockers, mailbox banks) also lands in this same ACCESS CONTROL section, not its own section. The section name stays "Access Control" rather than something broader because (a) it's already the home for an established subsystem and (b) smart-apartment gear is functionally adjacent (credentials, locks, in-unit IoT) and the integrator quotes them under the same access-control line of business. Implementation-wise: Pass N's `bomCustomLines.accessControl` array also receives smart-apartment rows when Pass N+1 ships. No second BOM key needed.

### D2. Reader visual placement within a riser band — CONFIRMED A (same-band-two-rails)

**Same-band-two-rails interpretation, not sub-band.** Each riser band remains a single contiguous rectangle for its floor (one floor label on the left margin, one band background). Inside the band, two horizontal rails stack vertically: the existing camera rail on top, a new AC rail directly below it. They share the same floor label and the same trunk connector — visually it's one band, not two.

Visual hierarchy inside a band with both subsystems:
- Head-end cluster (when present): left interior, vertically centered between the two rails
- Trunk: vertical line passing through the band
- Camera rail: right side, upper portion of the band — icons strung along it, C-NN labels above
- AC rail: right side, lower portion of the band — reader/controller icons along it, dev.label below
- Hairline separator (`#e5e7eb`, 0.3pt) between the two rails so they read as distinct lanes without becoming separate bands

**Band height growth when AC exists in the zone.** Bands with cameras + AC grow by approximately 20–30% over cameras-only height to fit the second rail and its labels without crowding. Concretely:
- Cameras-only band: same as today, governed by `RISER_MIN_BAND_PT` (50) / `RISER_MAX_BAND_PT` (120) per A.7
- AC-only band: ~50pt (one rail, equivalent to a low-camera-count band today)
- Cameras + AC band: cameras-only computed height × 1.25, clamped to a new `RISER_MIXED_MAX_BAND_PT` ~150pt
- Empty band (neither cameras nor AC): unchanged at `RISER_EMPTY_BAND_PT` (30)

The 1.25 multiplier and the new max constant get tuned during M2 — exact value lives in code, not the brief. The principle in the brief: "grow modestly to fit a second rail, don't double the band height."

When mixed-band heights push the diagram past the page, A.7's existing spill-to-next-page rule (schedule continues on a second page) applies unchanged.

### D3. Cable runs from reader → controller (or → head-end) — CONFIRMED A (deferred)

The riser shows reader and controller positions inside the band, but doesn't draw cables between them or assign a C-NN style cable ID to reader runs. Cameras-to-NVR cables (existing) continue to render. Rationale: the data isn't there — there's no "reader's controller" link in the model, and inventing one is its own pass.

**This is now documented as a CLAUDE.md pitfall.** Reader-to-controller cable lines are deferred. Don't add them speculatively during this pass or future drive-bys ("hey, it'd be easy to draw a line from each reader to the controller in its band"). The data link to support that drawing — which controller a reader is wired to — doesn't exist in the model, and faking it from spatial proximity produces wrong wiring diagrams. Future pass (Pass N.5) will add the controller-assignment data model + cable runs together.

### D4. What auto-rolls into the BOM vs. what stays manual — CONFIRMED with refinement

The principle is: **per-door accessories** (power supplies, REX buttons, electric strikes, maglocks) are NOT auto-rolled. They vary per door type — a glass storefront needs different hardware than an interior office door — and the tool has no door-type data. The integrator adds these via custom BOM lines.

**What IS auto-rolled** (already-discussed rule, restated for this brief):
- **Readers** — grouped by SKU from `acDevices[]`, qty reflects `pageMultiplier(d.page)`. Implemented in M3.
- **Controllers** — grouped by SKU from `acDevices[]`, same multiplier treatment. Implemented in M3.
- **Credentials** (cards/fobs) — auto-row sized to reader count. Cards aren't placed on canvas, so the row derives from the project's reader total. Implemented in M3 as a single line "Smart Credentials — sized for N reader(s)" with qty = `acReaderCount × CREDENTIAL_MULTIPLIER`. Default multiplier is 1.0 (one credential per reader as a placeholder); user overrides via the standard `bomAutoOverrides` qty edit in the BOM drawer. The 1.0 default is deliberately low so the integrator notices and tunes it rather than mistakenly shipping a quote with phantom 10× counts. **Sub-decision (D4a) — confirm the default multiplier value before implementation.** 1.0 is my recommendation as a "user must touch this" default; 5.0 or 10.0 are reasonable alternatives if you'd rather the placeholder be roughly realistic.

**What is NOT auto-rolled** (manual custom lines only):
- Power supplies (door PSUs, lock power)
- Request-to-exit devices (motion REX, button REX)
- Electric strikes, magnetic locks, electric mortise locks
- Door position switches, gate operators, push-to-exit buttons
- Anything else that varies per-door rather than per-reader

Manual custom-line entry under the new ACCESS CONTROL section handles all of the above.

### D5. Cover summary additions — OVERRIDDEN to two lines

Show **two separate lines** on the proposal cover summary:
- "AC READERS: N" — count of devices in `acDevices[]` whose SKU is in BRIVO_CATALOG category `Readers`, multiplied across typical floors
- "AC CONTROLLERS: N" — count of devices in `acDevices[]` whose SKU is in BRIVO_CATALOG category `Controllers`, multiplied across typical floors

Each line is **hidden when its count is zero**. A project with readers but no controllers shows only "AC READERS"; a controller-only project (unusual but possible) shows only "AC CONTROLLERS"; an all-cameras-no-AC project shows neither.

Matches the existing cover-page per-category style (CAMERAS / FLOORS / SCALE CALIBRATED are each their own line). Loses no information versus a combined line; mirrors how the integrator thinks about the two subsystems.

**Edge case for the ACS100 category quirk** (see BRIVO_CATALOG comment near line 1666–1672): ACS100 SKUs are categorized as `Controllers` in BRIVO_CATALOG but behave like readers on the canvas. For the cover summary, count them as **controllers** (consistent with the catalog category, which is the source of truth for SKU classification — the canvas-rendering quirk is cosmetic). Note this in code with a one-line comment so a future reader doesn't try to "fix" the count.

### D6. Schedule row ordering within a band — CONFIRMED A

Cameras first, then ACCESS CONTROL, then head-end equipment under the same band header. Reads top-to-bottom inside each zone: floor name → cameras on that floor → AC on that floor → recording/network gear if the head-end is on this floor. Single flat `rows[]` array preserved.

## Scope (milestones)

### M1 — Riser data model: attach AC to zones

Extend `computeRiserModel()` so each `zone` carries an `acDevices` array (the subset placed on that page) alongside the existing `cams` array. No data shape change to `acDevices[]` itself; this is a derived per-zone view.

Add a project-wide `acCount` to the returned model (multiplied across typical floors) so the cover summary and BOM auto-row sizing share one source of truth.

Decision in implementation: a single `acDevices` array per zone OR split into `readers` and `controllers` arrays. Whichever — drawing code will partition by `BRIVO_CATALOG` category at render time anyway. One array keeps the data shape symmetric with `cams`.

Pass A.7's sort key (`riserSortKey`) and `getRiserOrder()` are reused unchanged. Empty bands (no cameras AND no AC) still render their floor-name strip per A.7's "every floor visible" rule.

No JSON version bump — the AC array is derived state, not persisted.

### M2 — Riser diagram: AC rail inside each band

Per D2(A): add a second horizontal rail below the existing camera rail in `drawRiserBandInterior`. Reader icons render along this rail, anchored by the trunk on the left and the band's right edge on the right. Controllers render at the band's left edge (just to the right of the floor label, before the trunk) — they belong more to the head-end side visually because they're the brain, not the endpoint.

Band height adjusts based on whether AC exists in the zone:
- Cameras only → same as today (one rail, height per A.7's content-proportional rule)
- AC only → single rail, ~50pt
- Both → two rails stacked, height increases by ~18pt to fit the second rail and its labels

Update `RISER_MIN_BAND_PT` if needed (currently 50) — likely needs a "with AC" minimum of ~68pt. Don't change `RISER_MAX_BAND_PT` (current 120). Bands with very high AC + camera counts already trigger the existing spill-to-next-page rule.

Reader icon on the riser: a small filled rectangle in Brivo blue (`#1d4ed8`), matching the canvas reader. Mullion is taller-than-wide; single-gang is squat; keypad gets a small inner stripe. Match `drawReader` proportions, scaled down. Reader's `dev.label` appears below the icon (e.g., `AC-P1-1` or the renamed "Lobby Front Door" if user renamed). 5.5pt label, same as camera IDs.

Controller icon: small filled square with a dark fill (`#1f2937`, charcoal — distinguishes from blue readers) and a thin "C" inside. Controllers usually number 1-3 per project; don't sweat icon detail.

No cable lines between readers and controllers (D3-A).

### M3 — BOM: ACCESS CONTROL section

Add a 7th section to `computeAutoRows()` returning an `accessControl` key. Auto-rows fall into three groups:

**Group 1 — Readers, grouped by SKU.** Quantity reflects `pageMultiplier(d.page)`.

```javascript
// e.g., 3 single-gang dual-tech readers placed across pages with multipliers
// 1, 1, 15 → BOM row "Brivo Reader Single Gang Dual-Technology (black) — B-BSSF-B  qty: 17  unit: 0"
```

**Group 2 — Controllers, grouped by SKU.** Same multiplier treatment as readers. ACS100 SKUs (catalog category `Controllers`, canvas-behavior reader) count as controllers here, matching the cover summary rule from D5.

**Group 3 — Credentials, single derived row.** One auto-row sized to total reader count across the project:

```javascript
// e.g., 17 readers project-wide → BOM row "Smart Credentials — sized for 17 reader(s)  qty: 17  unit: 0"
//                                            (multiplier default 1.0 — user overrides via qty edit in drawer)
```

Default `CREDENTIAL_MULTIPLIER` is 1.0 per D4a; live as a top-of-file constant so it's easy to tune later. Row key `auto-ac-credentials` so `bomAutoOverrides` can capture user qty edits like any other auto-row. The row appears only when reader count > 0 (controllers alone don't generate credentials).

Description format: `BRIVO_CATALOG[i].name` + ` — ` + sku for readers/controllers. Falls back to the bare SKU + " (custom AC device)" if the device's `dev.model` isn't in the catalog (shouldn't happen, but defensive). No tier filter for AC (cameras have tiers, AC doesn't).

Section order in BOM drawer and proposal PDF:
1. Cameras & Imaging
2. Recording & Storage
3. Network & Power
4. Cabling
5. **Access Control** (new — slot here)
6. Labor
7. Other / Accessories

`bomCustomLines.accessControl = []` added to the initial state literal. `applyProjectState` backfills the key if loading an older save without it (one-line guard, no version bump needed since the empty array is a no-op).

Custom "+ Add line" works the same as other sections. `bomAutoOverrides` keys (`auto-ac-B-BSSF-B` etc.) work the same.

### M4 — Equipment schedule: ACCESS CONTROL rows per band

Extend `buildRiserScheduleRows(model)` to emit AC rows inside each zone after the camera rows. The flat `rows[]` array gets:

```
[section: FLOOR 2]
[cam: CAM-P2-1, Eagle Eye DD08]
[cam: CAM-P2-2, Eagle Eye DD08]
[ac:  AC-P2-1, Brivo Reader Mullion Dual-tech B-BSMF-B]   ← new
[ac:  AC-P2-2, Brivo ACS300 Controller B-ACS300-E-B]      ← new
[equip: NVR-1, 16-Ch NVR]                                  ← still here if head-end on this floor
```

`drawRiserSchedule` doesn't need a structural change — the existing 2-column ID/MODEL layout works for AC rows the same way it does for camera rows. AC rows get the same 9pt body font.

If the row count overflows the right column, the existing "spill to a second schedule page" path handles it — no special-casing.

### M5 — Cover summary + polish

Per D5: add **two separate lines** to the proposal cover summary, each independently visible when its count > 0:
- "AC READERS: N" — count of readers (BRIVO_CATALOG category `Readers`), multiplied across typical floors
- "AC CONTROLLERS: N" — count of controllers (BRIVO_CATALOG category `Controllers`, includes ACS100 per the catalog category), multiplied across typical floors

Each line uses the same row template as CAMERAS / FLOORS (label left, count right, 9pt body). A project with zero readers AND zero controllers shows neither line and the summary box keeps its original vertical rhythm.

BOM-drawer summary box (`#bom-summary`) currently shows "Camera Count" — leave that as-is (cameras are still the primary subsystem). No "AC Count" stat in the drawer header — the ACCESS CONTROL section row count in the body is enough.

Test the empty-AC case carefully: a project with zero readers/controllers must render identically to a pre-Pass-N export (no ACCESS CONTROL header anywhere, no "AC DEVICES 0" line on the cover, no AC rail in any band).

## Out of scope (explicitly)

- AC cable runs (reader-to-controller, controller-to-head-end). Future Pass N.5.
- Auto-suggested support equipment (PSUs, REX, strikes, maglocks). Future "smart BOM" pass.
- Maglocks / electric strikes as placeable devices on canvas (would need their own icon family — out of scope, possibly Pass N+1 territory if grouped with smart-apartment gear).
- New AC manufacturers (still Brivo-only).
- AC tier system (cameras have Essential/Recommended/Premium tiers; AC doesn't — and not adding one here).
- AC mounting height, AC site-survey fields, AC notes-on-riser. Notes live in the right panel only.
- Multi-controller routing logic ("which reader is on which controller").
- Wiring diagram conventions (door numbers, lock side, strike vs maglock). This is a proposal layout tool, not a wiring engineer.

## Constraints

- Don't change the BRIVO_CATALOG schema or BRIVO_READERS lookup
- Don't introduce new dependencies
- Don't break the cameras-only proposal (a project with zero AC devices renders unchanged)
- Don't change the `acDevices[]` data shape (no JSON version bump expected — if implementation discovers one is needed, surface it)
- Preserve existing riser band heights when no AC is on the zone (cameras-only bands look identical to today)
- Match existing PDF aesthetic: charcoal `#1f2937` headers, hairline `#e5e7eb` dividers, Brivo blue `#1d4ed8` only for the reader icons themselves
- Reader labels follow the same name-mangling rule as cameras: truncate to 11 chars with ellipsis if longer (see `drawRiserBandInterior` cam label code, ~line 6677)

## Process

1. Read `camera_markup_tool.html` and `CLAUDE.md` (especially the "Codebase conventions and known pitfalls" section).
2. Re-read PASS_A7_BRIEF.md for the riser layout conventions you're extending.
3. Lay out implementation as a numbered checklist before edits. Confirm with me.
4. Execute in M1 → M5 order. JS syntax check (`node --check`) after each milestone.
5. After each milestone, post a Step Report per the CLAUDE.md format.
6. After M2 specifically: include screenshots-or-equivalent in the step report — describe what the AC rail looks like, the band-height delta with vs without AC, and the controller icon style. The riser is visual; "looks fine" isn't a step report.
7. Tell me what to test in the browser.

## Test cases

### M1 — data plumbing

- Empty project: `computeRiserModel().acCount === 0`; every zone has `zone.acDevices.length === 0`
- 3 readers on page 0, 1 controller on page 1: zone[0].acDevices.length === 3, zone[1].acDevices.length === 1
- Typical floor with 2 readers × ×15 multiplier: `model.acCount === 30`

### M2 — riser diagram

- Project with cameras only: bands look identical to a pre-Pass-N export
- Project with AC only on Floor 2: only Floor 2's band shows the AC rail; other bands compact
- Project with both: Floor 2 band has cameras top, AC bottom, no overlap of labels
- Mullion reader, single-gang reader, keypad reader, ACS300 controller all on one floor: all four icons render distinctly along the AC rail / left edge
- Rename a reader to "Lobby Front Door" → that label appears below its icon on the riser (truncated if >11 chars)
- 8 readers on one floor → AC rail spaces them evenly, no overlap

### M3 — BOM

- Place 3x B-BSSF-B (singlegang dual-tech) readers → BOM ACCESS CONTROL section shows one row "Brivo Reader Single Gang Dual-Technology (black) — B-BSSF-B" qty 3
- Mix readers and controllers → grouped by SKU, controllers and readers in the same section
- Add a custom AC line via "+ Add line" → persists, saves to JSON
- Save project, reload → custom AC line restores
- Load a pre-Pass-N save → no errors, ACCESS CONTROL section appears empty (no custom lines yet), auto-rows populate from acDevices[]
- Set margin 25%, tax 5% → grand total includes AC unit costs (when prices are populated)

### M4 — schedule

- Floor with 2 cameras + 1 reader: schedule shows section header, 2 cam rows, 1 ac row
- Project with 80 cameras + 20 readers: schedule spills to second page; AC rows continue on page 2 without losing their band association
- Renamed reader appears with its new label in the schedule's ID column

### M5 — cover & polish

- Zero AC devices → neither AC READERS nor AC CONTROLLERS line appears (must not show "AC READERS 0" / "AC CONTROLLERS 0")
- Readers only, no controllers → only AC READERS line shows
- Controllers only, no readers → only AC CONTROLLERS line shows (unusual but valid)
- Typical floor with ×15 multiplier and 2 readers on that floor → AC READERS counts them as 30
- Place an ACS100 (canvas-behavior reader, catalog-category controller) → counted as AC CONTROLLERS, not AC READERS (catalog category wins; verify with a code comment at the count site)

### Regression — cameras-only project

- Open a save from before this PR with zero acDevices
- Export proposal PDF → byte-for-byte same layout as before (or as close as practical given any minor band-height tweaks in M2 that should only affect bands with AC)

## What this PR is NOT doing

- Not adding smart-apartment devices (Pass N+1)
- Not making head-end a first-class object (queue item 7)
- Not adding AC cable planning
- Not populating prices
- Not changing how readers are placed on canvas
- Not changing the AC right-side details panel
- Not bumping the JSON version (unless implementation surfaces a reason to — flag it if so)

These are separate passes.
