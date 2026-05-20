# Pass: Cleanup (UI Labels, Icons, Visibility, Accessories)

*Created May 20, 2026. Slots before Pricing Foundation M2 resumption, per integrator request for a small-cleanup sweep before pricing work continues.*

## Context

A batch of small UI/UX/visual issues accumulated across prior passes — the kind that pile up unnoticed (like the BOM divider y-bug caught at the end of the last session). This pass sweeps them in one focused effort before pricing work resumes.

All items are low-risk: label relabels, icon consistency, one functional FOV bug, a new visibility toggle group, and a new (mostly empty) left-pane section. Nothing touches the cabling model, BOM math, pricing, or save format beyond the equipment-labels persistence.

**Two larger items surfaced during item-gathering and were split out** — they are NOT in this pass:
- **Camera Details Panel Redesign** (field reorder, DORI relocation, three sliders with two-way canvas sync) — its own future pass.
- **Switch Topology** (placed switches, two-tier camera→switch→CMVR cabling, BOM/riser rework) — its own future pass, likely merged with Manual Cable Routing + Conduit.

## Items in this pass

### 1. Left-pane section header relabels (all applicable modes)

Replace the dynamic "Selected: X → Y" breadcrumb headers with static section headers following the pattern `<Mode> <Tier-role>`. Apply the pattern to whatever tiers each mode actually has — do not invent a middle tier where none exists.

- **Cameras** (3-tier + new accessories): `Camera Manufacturers` / `Camera Styles` / `Camera Models` / `Camera Accessories`
- **Access Control** (3-tier): `AC Manufacturers` / `AC Devices` / `AC Models`
  - Tier-3 is generic `AC Models` — NOT branch-specific. Whether the user drills into Readers or Controllers, tier-3 reads "AC Models."
- **Intercoms** (2-tier): `Intercom Manufacturers` / `Intercom Models`
- **Parcel Lockers** (2-tier): `Parcel Manufacturers` / `Parcel Models`
- **Mailbox Banks** (2-tier): `Mailbox Manufacturers` / `Mailbox Models` (the cols×rows config UI stays as-is)
- **Suites**: LEFT UNTOUCHED. Suites uses a tile-based layout (Unit Types / IoT Devices), already redesigned in the Suites Polish pass. No manufacturer drill-down to relabel.

The headers become static labels describing the tier's purpose, rather than echoing the current selection. The selection state is already visible from which tile is highlighted; the breadcrumb echo is redundant.

### 2. Left-pane style icons match canvas marker icons

In Cameras mode, the Camera Styles tier (Dome / Bullet / Turret / Fisheye / PTZ / LPR) currently uses one set of glyphs in the left pane, while placed markers on the floor plan use a different visual. Unify them: the left-pane style tiles should use the same icon family as the canvas markers, so a user can map "the dome I picked" to "the dome on the plan" at a glance.

Investigate whether the canvas markers and left-pane tiles draw from the same icon source or different ones. If different, make the left-pane tiles use the canvas marker icon definitions (or a shared definition). Visual parity is the goal — same silhouette, same recognizable shape.

### 3. Fisheye FOV cone fix

The fisheye camera renders no FOV cone on the floor plan, while every other camera type (dome, bullet, turret, PTZ, LPR) projects a colored FOV wedge. Fisheye models are spec'd at "4K · 180°" — they should render a 180° wedge (half-circle), not nothing.

**Investigate root cause first**, then fix. Two likely candidates:
- The fisheye catalog entries are missing an FOV-degrees value, so the cone-rendering math produces a zero/undefined wedge.
- The cone renderer has a special-case that skips fisheye (perhaps an old assumption that fisheye = 360° = "no meaningful cone").

Report the root cause in the step report before applying the fix. The fix should make fisheye render a 180° wedge per its spec. If a fisheye model is genuinely 360°, that would render as a full circle — but the current catalog spec says 180°, so the half-circle wedge is correct for the existing models.

### 4. "Camera Accessories" section + CMVR/NVR relocation

Add a 4th section to the Cameras left pane, below Camera Models: **Camera Accessories**.

- Relocate the existing CMVR/NVR tile from its current position (below the model list) into this new section.
- The section is built to hold more accessory tiles in the future, but ships with ONLY the CMVR/NVR tile for now.
- **The Switch tile is explicitly NOT added in this pass** — it's deferred to the Switch Topology pass, because a placed switch needs real downstream behavior (BOM, riser, cabling) that's out of cleanup scope. Shipping an inert Switch marker would be a confusing half-feature.

The CMVR/NVR tile keeps its existing behavior (whatever head-end placement it currently does) — this item only relocates it into the new section, no behavior change.

### 5. "Equipment Labels" visibility toggle group

In the View menu's Visibility group (the eye icon, top-right), add a tier-1 master toggle **"Equipment Labels"** with six per-family children:

```
Equipment Labels          [tri-state master]
  ├ Camera Labels
  ├ Access Control Labels
  ├ Intercom Labels
  ├ Parcel Labels
  ├ Mailbox Labels
  └ Suite Labels
```

Behavior:
- **Tri-state master**: checked (all children on), unchecked (all children off), indeterminate/dash (some on, some off). Clicking the master sets all children to one state (toggling between all-on and all-off).
- **Children individually toggleable.** Toggling a child updates the master's tri-state.
- **Labels only** — these toggles hide/show the text labels (e.g. `EAG-01-1`, `Unit 101`). FOV cones, device icons, and markers are NOT affected — those are separate concerns.
- **Removes the existing standalone Suites-mode "Hide unit labels / Show unit labels" control.** Suite-label visibility now lives only under Equipment Labels → Suite Labels. No redundant control, no sync-state bugs.
- **State persists** in the project JSON. If a user hides AC labels for a clean camera-focused view, that preference survives save/reload.

Implementation notes:
- The existing suite-label hide/show logic is the reference for how labels get suppressed; generalize it to all six device families.
- Each device family's render path needs to consult its label-visibility flag before drawing the text label.
- The persisted state is a new object in project info, e.g. `projectInfo.labelVisibility = { camera: true, accessControl: true, intercom: true, parcel: true, mailbox: true, suite: true }`. Default all true (all labels visible).

### 6. User guide patch (pass-closure)

- Document the left-pane relabels (brief mention — the section headers now describe their tier).
- Document the Equipment Labels visibility group (new subsection under a Visibility or View-menu area).
- Document the Camera Accessories section (brief mention — CMVR/NVR now lives there).
- Bump version 1.5 → 1.6.
- Add Version 1.6 entry to Version History.
- Run `node docs/build-guide.js` to regenerate docx.

## Scope (milestones)

### M1 — Left-pane header relabels (all modes)
- Replace dynamic breadcrumb headers with static `<Mode> <Tier>` headers across Cameras, AC, Intercoms, Parcel, Mailbox.
- Apply to existing tiers only (3-tier for Cameras/AC, 2-tier for the others).
- Suites untouched.
- AC tier-3 generic "AC Models."

### M2 — Left-pane style icons match canvas markers
- Unify the Camera Styles tier icons with the canvas marker icons.
- Investigate shared-vs-separate icon source; converge on canvas marker visuals.

### M3 — Fisheye FOV cone fix
- Investigate root cause (missing FOV value vs. render special-case).
- Report root cause, then fix so fisheye renders its 180° wedge.

### M4 — Camera Accessories section + CMVR/NVR relocation
- Add the 4th Cameras left-pane section.
- Relocate CMVR/NVR tile into it.
- Switch tile NOT added (deferred).

### M5 — Equipment Labels visibility group
- Tri-state master + 6 children in View → Visibility.
- Labels-only suppression generalized across all 6 device families.
- Remove standalone Suites "Hide unit labels" control.
- Persist `projectInfo.labelVisibility` in project JSON.

### M6 — User guide patch (pass-closure)
- Document relabels, equipment-labels group, accessories section.
- Version 1.6 + Version History entry.
- Regenerate docx.

## Constraints

- No new dependencies
- Vanilla JS, single HTML file, `var` declarations, existing conventions
- No cabling-model changes, no BOM math changes, no pricing changes
- No save-format changes beyond the additive `projectInfo.labelVisibility` object
- Per the recent "no compat needed yet" decision: backfill `labelVisibility` to all-true on load for older saves, but don't over-engineer migration
- Suites mode left pane untouched (already redesigned in Suites Polish)

## Test cases

1. **Header relabels:** Each mode's left pane shows static section headers (`Camera Manufacturers` etc.), not "Selected: X → Y" breadcrumbs. Drill into a manufacturer → the tier-2 header stays static, doesn't echo the selection.
2. **AC tier-3 generic:** Drill into AC → Readers → tier-3 header reads "AC Models." Drill into AC → Controllers → tier-3 still reads "AC Models" (not "Readers" or "Controllers").
3. **Suites untouched:** Suites mode left pane looks identical to its post-Suites-Polish state. No relabel.
4. **Style icon parity:** Place a dome, bullet, turret, fisheye, PTZ, LPR on the floor plan. Each placed marker's icon matches the corresponding left-pane Camera Styles tile icon.
5. **Fisheye FOV:** Place a fisheye camera. It renders a 180° FOV wedge (half-circle), colored like other camera cones. Root cause documented in step report.
6. **Camera Accessories section:** Cameras left pane has a 4th section "Camera Accessories" below Camera Models. The CMVR/NVR tile lives there. No Switch tile present.
7. **CMVR/NVR behavior unchanged:** Clicking CMVR/NVR in its new location does exactly what it did before (head-end placement).
8. **Equipment Labels master — all on:** Open View → Visibility. "Equipment Labels" master checked, all 6 children checked. All device text labels visible on the floor plan.
9. **Equipment Labels master — toggle off:** Click master → all 6 children uncheck → all device text labels hidden on the floor plan (icons + cones still visible).
10. **Equipment Labels child toggle:** Uncheck only "Camera Labels." Camera labels (EAG-01-N) hidden; AC/intercom/parcel/mailbox/suite labels still visible. Master shows indeterminate/dash state.
11. **Equipment Labels persistence:** Hide AC labels, save project, reload. AC labels stay hidden; the toggle reflects the saved state.
12. **Suite-label control removed:** Suites mode left pane no longer has a "Hide unit labels / Show unit labels" button. Suite-label visibility controlled only via Equipment Labels → Suite Labels.
13. **Legacy save load:** Open a project saved before this pass (no `labelVisibility` key). All labels default to visible; the toggle group shows all-checked.

## Out of scope (split to own passes)

- Camera Details Panel Redesign (field reorder, DORI relocation, Reach/Mount/Angle sliders with two-way canvas sync) — own pass
- Switch Topology (placed switch tile with real behavior, two-tier camera→switch→CMVR cabling, BOM replacement of auto-derived switches, riser intermediate tier) — own pass, likely merged with Manual Cable Routing + Conduit
- FOV-cone visibility toggles (this pass only toggles text labels, not cones)
- Any cabling, BOM, pricing, or riser logic changes
