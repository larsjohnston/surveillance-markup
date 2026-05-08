# Feature Spec: Riser Diagram (System One-Line)

## Context
This is the next major feature for the Surveillance Markup Tool. Add an auto-generated system riser diagram (a.k.a. one-line / single-line diagram) that documents how cameras, switches, and the NVR connect as a system. The riser is a standard deliverable in every professional security camera proposal alongside the marked-up floor plan and BOM.

The riser is **not** a floor plan. Don't try to preserve geographic layout. Strip out distance and exact location. Show *connection topology and what equipment lives where* — that's the entire purpose.

## Where it lives in the proposal

The PDF export already has a fixed page order. Update it to:

1. Cover page
2. Bill of Materials
3. **Riser Diagram** ← new
4. Floor plan markups (one per page of the imported PDF)

Each of these four sections gets a toggle in **Project Settings → Proposal Sections**. Default all four ON. If a user toggles off the BOM, page numbering and the cover-page summary still work correctly.

When the riser section toggle is OFF, no riser page generates. When ON, exactly one riser page covers the entire project (not one per floor plan page).

## Source of truth

The riser is **fully auto-generated** from existing project data. There is no separate riser editor. Whenever the user adds, removes, or moves a camera on any floor plan page, the riser regenerates. No persisted riser layout.

If the user clicks/drags any element on the riser, show a small modal:
> "The riser diagram is generated from your floor plan layout. To make changes, edit the camera on the floor plan and the riser will update automatically."
> [OK button]

## Layout direction

Strict top-to-bottom flow. From top of page to bottom:

1. **Head-end row** — NVR + PoE switch(es) + UPS, horizontally arranged
2. **Trunk lines** — vertical lines descending from the switches into the floors below
3. **Zone bands** — one horizontal band per zone, stacked vertically (see Zone grouping below)
4. **Cameras** — laid out within each zone band, connected back up to the switch via cable lines

Floor 1 / parkade / lower zones go at the bottom. Upper floors / roof go at the top of the bands area (just below the head-end). This mirrors physical building elevation — feels intuitive when reviewing.

## Zone grouping

Each camera gets a `zone` field. New camera UI panel needs a "Zone" text input near the existing Tier and Mount Height fields. It's a free-text field with autocomplete that suggests existing zone names already in use on the project (so users naturally cluster onto consistent names).

Suggested defaults the autocomplete should offer when the field is empty: `Floor 1`, `Floor 2`, `Floor 3`, `Parkade`, `Roof`, `Exterior`, `Lobby`, `Loading Dock`. These are starting suggestions only — the user types whatever they want.

If a camera has no zone set, it falls into a band labeled "Unassigned" at the very bottom of the riser. Default zone for new cameras is empty (no auto-fill) — the user picks.

## Visual language

Keep the same six flat-icon camera styles already in the tool (Dome / Bullet / Turret / Fisheye / PTZ / LPR), same colors, same SVG icons. The riser uses these for individual camera nodes — **icon only**, no text labels next to icons, no model number, no PoE class, no IP address, nothing else. Just the icon.

The camera ID label appears underneath each icon (the existing label, e.g. `CAM-1.1`).

Other equipment symbols needed (new SVG icons in same flat style as cameras):
- **NVR** — rectangular rack-server icon, labeled "NVR" + channel count callout (`16ch`, `32ch`, etc.)
- **PoE Switch** — rectangle with port-array dots along the bottom edge, labeled "PoE Switch" + port count (`8-port`, `24-port`)
- **UPS** — battery icon with the "UPS" callout

Keep the styling consistent with the rest of the tool: Courier New font, dark navy borders, white fills with colored accents.

## Cable labels

Every cable run on the riser gets labeled. Format: `C-NN` where NN is a two-digit number, sequential project-wide. So a project with 23 cameras has cables C-01 through C-23.

Each cable also shows length in **both units** in brackets:
- If page was calibrated in feet: `C-04: 38 ft (11.6 m)`
- If page was calibrated in meters: `C-04: 11.6 m (38 ft)`
- If the camera's page is uncalibrated: `C-04: —` (no length, but cable still labeled)

Length comes from the existing cable run length already calculated in the floor plan view (camera position to head-end position, with the existing routing overhead multiplier).

Cable lines are thin solid lines connecting the switch to each camera. Don't draw 23 separate lines from the switch — use a vertical trunk line per zone with branches. Looks much cleaner.

## Equipment Schedule

Put the equipment schedule directly on the same page as the riser, not on its own separate page. Place it on the right-hand side of the page, with the riser drawing taking the left ~60% of the page width.

The schedule is a single table with these columns:
- ID
- Type (NVR / Switch / Camera / UPS)
- Model
- Zone (cameras only)
- Cable ID (cameras only)
- Cable length

Rows are grouped: head-end equipment first (NVR, switches, UPS), then cameras grouped by zone with subheaders for each zone.

Page is US Letter portrait. If the schedule overflows, continue it onto a second riser page that contains only the remaining schedule rows (no second copy of the diagram).

## What to skip for now

Per user request, the following are **explicitly out of scope** for this iteration. Do not add them; do not add config knobs that hint at them; just leave them out:

- IDF / MDF intermediate cabinets (head-end only, all cameras hang off main switch)
- PoE budget visualization (no wattage callouts on switch)
- Fiber-vs-Cat6 distinction on long runs (everything drawn as Cat6)
- IP address fields per camera
- Port number assignments on the switch
- PoE class per camera

These will likely come back in a future iteration; don't paint into a corner that prevents adding them later.

## Switch sizing logic

Use the same logic the BOM auto-row already uses for sizing the PoE switch:

```
ports = 8 if cameras ≤ 8
      = 16 if cameras ≤ 16
      = 24 if cameras ≤ 24
      = 48 if cameras ≤ 48
switchCount = ceil(cameras / ports)
```

If two switches are needed, draw two side-by-side. If three+, stack into a 2-row arrangement.

## Project settings additions

The existing Project Info modal needs a new section: **Proposal Sections**. Four checkboxes (all default ON):

- ☑ Cover page
- ☑ Bill of Materials
- ☑ Riser Diagram
- ☑ Floor plan pages

Saving the modal updates `projectInfo.proposalSections` (a new object). PDF export reads this and skips disabled sections. Persist with rest of project info in the saved JSON.

## Implementation hints

- Keep all the riser code in its own clearly-named function or section in the script block (e.g. `// ─── Riser Diagram ───`). Don't tangle it with the floor-plan rendering.
- Riser rendering happens on a fresh canvas during PDF export only — it does not need a live preview in the main UI for this iteration. (If implementation gets straightforward, add a "Preview Riser" button to project settings, but don't build a full editor.)
- Use jsPDF's vector primitives where possible for the riser (lines, rectangles, text) rather than rasterizing — keeps the proposal PDF crisp at any zoom.
- Follow existing code conventions: vanilla JS, `var` declarations, single HTML file, no new dependencies.
- After implementing, do a JS syntax check and open the HTML in a browser to verify nothing else broke.

## Acceptance criteria

The feature is done when:

1. ☑ Cameras can be assigned a zone via the camera panel; zones autocomplete from existing project zones; default suggestions appear when field is empty.
2. ☑ Project settings has the four proposal-section toggles with the right defaults.
3. ☑ Exporting a proposal PDF produces pages in the order: Cover → BOM → Riser → Floor plans.
4. ☑ Toggling any section off correctly omits that section without breaking page numbers or cross-references.
5. ☑ The riser page shows: NVR + switch(es) + UPS at top; horizontal zone bands stacked top-to-bottom (upper floors high, lower floors low); cameras as flat icons within their zone band; cable lines from each camera back to a switch with `C-NN` labels and dual-unit length in brackets.
6. ☑ The equipment schedule appears on the right-hand 40% of the riser page, with grouped rows: head-end first, then cameras grouped by zone.
7. ☑ Clicking/dragging on the rendered riser triggers a "must edit on floor plan" modal.
8. ☑ Adding a camera on the floor plan, exporting again, shows the new camera in the riser without any other action.
9. ☑ Cameras with no zone fall into an "Unassigned" band at the bottom.
10. ☑ Two-switch projects (>16 cameras) draw two switches with cameras distributed between them; the cable IDs are still sequential project-wide.

## Out of scope for this PR — clearly state to the user during build

If during implementation you discover something underspecified, ask the user before improvising. Do not silently add features. Specifically: don't add fiber detection, IP address fields, port mapping, IDF/MDF support, PoE budget calculations, or per-camera survey-detail callouts on the riser unless the user explicitly asks for them.

## Test data

The CLAUDE.md project uses a Westmount Apartments PDF as the test fixture. Place ~6-8 cameras across multiple zones (e.g. Floor 1 lobby, Parkade, Exterior) and verify the riser groups them correctly.
