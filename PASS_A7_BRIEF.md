# Pass A.7: Riser Diagram Redesign

## Context

The current riser diagram (shipped earlier) has several layout issues:

1. Head-end (NVR + Switch + UPS) sits at the top, while real building risers show ground-level equipment at the bottom
2. Floors stack top-down (Floor 1 highest), opposite of building elevation convention
3. Empty floors get omitted, even though they're part of the building
4. Equipment schedule takes ~40% of the page, leaving the diagram itself cramped and disproportionate
5. Vast unused vertical whitespace between head-end and cameras

This PR rebuilds the riser layout to match how riser diagrams are conventionally drawn in the AEC industry: lower floors at the bottom, upper floors at the top, head-end appearing in whichever floor band the user placed it on, every floor visible.

## What stays the same

- The riser is auto-generated from existing project data (no separate riser editor)
- Cameras shown as flat icons (no labels, no model details — just the icon + ID below)
- Cable IDs sequential project-wide (`C-01`, `C-02`...)
- Cable length labels with dual units (`38 ft (11.6 m)`)
- Typical-page multiplier suffix (`C-08: 38 ft (11.6 m) · ×15 floors` — Pass A.5 work)
- Equipment schedule on the right, grouped by section (head-end first, then cameras grouped by floor)
- Riser appears in the proposal PDF after the BOM (export order unchanged)
- "Click drag to edit" prompt that explains the riser is auto-generated
- One band per page (typical pages still show one band, not N bands)

## What changes

### 1. Vertical orientation flips

**Before:** Top of page = Floor 1; bottom of page = upper floors / cameras
**After:** Top of page = upper floors / roof; bottom of page = Floor 1 / parkade / head-end

This matches building elevation. An elevator panel goes from L (bottom) to top floor. The riser should match.

### 2. Head-end appears in its floor's band

**Before:** Head-end sits in a dedicated row at the top of the diagram
**After:** Head-end (NVR + Switch + UPS) appears inside the floor band of whichever page the user placed it on

If the user places the head-end on the "Parkade" tab, the head-end icons appear inside the Parkade band. If they place it on "Floor 1," it appears in the Floor 1 band.

Visual treatment within the band:
- Head-end equipment (NVR, Switch, UPS) sits on the left side of the band
- Cameras for that floor appear on the right side
- A short horizontal connector line links the head-end to the floor's camera trunk
- Cables from cameras on OTHER floors route DOWN through their floors' bands to reach the head-end's band, terminating at the head-end (matching physical Cat6 runs from camera to NVR rack)

If multiple head-ends exist (different pages each have their own), each appears in its own floor band. The riser doesn't try to unify them into one logical head-end.

If no head-end is placed at all, the diagram still renders with floor bands and cameras. No fake head-end is drawn. Cables show with no destination (or hide them — see #3 below).

### 3. Empty floor bands always appear

Every page (= every floor) gets a band on the riser, even if the page has zero cameras and zero AC devices. The band displays only the floor name on the left margin and an empty interior. Cleaner than skipping it.

Typical pages get one band labeled with the multiplier suffix: `Tower Typical · F3-17` (matching Pass A.5 tab badge format).

### 4. Floor ordering — smart parsing + manual override

The riser sorts floor bands top-to-bottom by elevation. Use this priority:

**A) User-set order (highest priority).** If the user dragged tabs to reorder them, that order takes precedence. The riser uses the tab strip's order, treating the leftmost tab as the bottom-most floor.

**B) Smart parsing (when user has not manually reordered).** Parse tab names to infer elevation:

- Tabs containing "Parkade", "Garage", "Basement", "Cellar", "P1", "P2", "P3" → below Floor 1
- Tabs containing "Lobby", "Ground", "Main" → at or just above parkade
- Tabs containing a number ("Floor 1", "Floor 2", "Level 5", "L7") → ordered by that number
- Tabs containing "Penthouse", "PH" → above numbered floors
- Tabs containing "Roof", "Rooftop", "Mech Penthouse", "MPH" → highest

Lowercase comparison, partial match. A tab named "Floor 3 Amenity" matches the numbered-floor rule on "3."

**C) Fallback** (when neither user nor parser can decide): tab strip order.

The smart parser is good-enough heuristics. Edge cases like "Mezzanine" or "M1" or "Sub-basement" might not parse perfectly — that's fine. The user can drag-reorder tabs if they disagree with the auto-parse.

### 5. Drag-to-reorder tabs (new sub-feature)

Tabs in the tab strip become drag-reorderable. Click and hold a tab's main area (not the × button), drag it to a new position, drop. The tabs reorder.

**State:**
- Add a `tabOrder` array to project state, default `null` (auto-parse)
- When user drags a tab, set `tabOrder` to the explicit order (array of page indices)
- The riser checks `tabOrder` first; if non-null, uses it; if null, falls back to smart parsing

**Persistence:**
- `tabOrder` saves into the JSON v12 format (this PR bumps the version)
- Read v11 (no `tabOrder`) cleanly: defaults to null

**Visual:**
- During drag, the dragged tab gets `opacity: 0.5` and shows as the cursor follows
- Other tabs slide aside to show the drop position
- Drop commits the new order, calls `rebuildTabsDom()`, redraws

**Implementation note:**
- HTML5 drag-and-drop API is the standard approach (`draggable="true"` on tabs, `dragstart`, `dragover`, `drop`, `dragend` event handlers)
- Keep the implementation simple — no fancy animations, just basic drag-drop with opacity feedback
- Don't break the existing tab click-to-switch or double-click-to-edit behaviors

### 6. Schedule footprint reduction

**Before:** Schedule takes ~40% of page width, diagram ~60%
**After:** Schedule takes ~30% of page width, diagram ~70%

Schedule typography:
- Font drops from current ~10pt to **9pt** for body rows
- Header rows stay slightly larger (10pt) for readability
- Column padding tightens by ~25%
- Floor name in the "Floor" column shows the typical badge format if applicable: `F3-17` not the full "Tower Typical · F3-17"

Schedule overflow rule (existing) is preserved: if rows don't fit on one page, continue onto a second riser page that contains only the remaining schedule rows (no second copy of the diagram).

### 7. Vertical packing

Bands should size proportionally to their contents. A typical floor with 8 cameras needs more vertical space than an empty parkade. Don't force all bands to be the same height.

Minimum band height: enough to fit the floor name + a single device row + reasonable padding. ~50pt at the current PDF rendering scale.

Maximum band height: based on content. If a floor has many cameras stacked, the band grows to fit them.

Total vertical space available: page height minus header/footer/margins. Allocate proportionally to band content. If the project is large enough that bands would be cramped, the existing "spill onto a second page" rule kicks in (with the schedule continuation pattern).

### 8. Connector lines

Cables route from each camera DOWN through floor bands to the head-end's band. Lines should:
- Travel vertically through floor bands (not jump across them)
- Pass through empty floors as straight lines
- Terminate at the head-end's connector point in the head-end's band
- Show their `C-NN` ID at a consistent vertical position (near the camera or near the head-end — pick one consistently)

If multiple head-ends exist (multiple pages with head-ends placed), each head-end serves the cameras on its own page. Cables don't cross floor bands to reach a different head-end.

### 9. Visual styling

Stay consistent with the rest of the proposal PDF aesthetic:
- Charcoal `#1f2937` for primary lines and section headers (Pass A redesign palette)
- Dark gray `#374151` for accents
- Hairline `#e5e7eb` for band dividers
- White fills with thin borders for equipment boxes
- Camera type colors as in the editor (red dome, blue bullet, etc.) — these are semantic and should NOT be charcoal-ified

The horizontal divider between bands should be subtle, not heavy. Floor name on the left margin, vertical alignment center-of-band.

## Out of scope (still)

- IDF / MDF intermediate cabinets
- PoE budget visualization
- Fiber-vs-Cat6 distinction
- IP address fields
- Port number assignments
- AC devices on the riser (still deferred — Pass A.5 prepared the multiplier infrastructure but readers don't appear in the riser yet)

## Constraints

- Don't change the riser data model. `computeRiserModel` continues to produce the same shape; only its sort order and band-content rules change.
- Don't change the BOM, cover summary, or schedule data — those compute correctly already.
- Don't introduce new dependencies.
- The drag-to-reorder uses HTML5 native drag-and-drop API. No external library.
- JSON format bumps to v12 (adds `tabOrder` field). Read v11 cleanly (no `tabOrder` → defaults to null → smart parse).

## Process

1. Read camera_markup_tool.html and CLAUDE.md.
2. Lay out the implementation plan as a numbered checklist before any edits. Confirm with me before starting.
3. Execute in this order:
   a. Add `tabOrder` to project state and JSON v12 (save/load with backward compat).
   b. Add `compareForRiser(pageIdx, pageIdx)` smart-parse comparator function. Standalone, testable.
   c. Add `getRiserOrder()` returning array of page indices in vertical order: tabOrder if set, else smart-sorted, else tab strip order as fallback.
   d. Modify the riser rendering to use `getRiserOrder()`. Floors render bottom-to-top per the new orientation.
   e. Modify the riser to render empty bands when a page has no cameras/AC.
   f. Modify the riser to render head-end equipment INSIDE the band of the page where it was placed (not in a top row).
   g. Adjust the page-layout proportions: schedule from ~40% → ~30%, diagram from ~60% → ~70%.
   h. Reduce schedule font/padding as specified.
   i. Implement HTML5 drag-and-drop on tab strip. On drop, save to `tabOrder`, redraw tabs, redraw riser if visible.
4. JS syntax check after each step.
5. Tell me what to test in the browser.

## Test cases the comparator must handle

These are inputs to `compareForRiser` (returning negative if A goes below B in the riser):

- "Parkade" vs "Floor 1" → Parkade below
- "P1" vs "Lobby" → P1 below
- "Floor 1" vs "Floor 2" → Floor 1 below
- "Floor 3 Amenity" vs "Floor 17" → Floor 3 below
- "Floor 17" vs "Roof" → Roof above
- "Penthouse" vs "Floor 17" → Penthouse above
- "MPH" (Mech Penthouse) vs "Roof" → ambiguous; either order is acceptable
- "Tower Typical · F3-17" — typical pages: use the lowest floor in the range (3) as the sort key
- Two pages with no recognizable order ("Site Plan" vs "Notes") → fallback to tab strip order

## Test cases for the visual

After this PR ships, manually verify against a sample project:

- Project: Parkade + Lobby + Floor 2 (empty) + Tower Typical (F3-17) + Penthouse + Roof
- Riser should show 6 bands stacked top-to-bottom: Roof, Penthouse, Tower Typical · F3-17, Floor 2 (empty), Lobby, Parkade
- If user placed head-end on Parkade, NVR/Switch/UPS appear inside the Parkade band
- Cables route from cameras on each floor DOWN through other bands to reach the head-end in Parkade
- Empty Floor 2 band shows just the floor name with no devices and a straight cable pass-through
- Equipment schedule on the right is ~30% of page width with 9pt font

## What this PR is NOT doing

- Allowing users to relabel/move equipment (still auto-generated, drag-to-edit shows the existing "must edit on floor plan" modal)
- Changing the head-end placement workflow itself
- Adding AC devices to the riser
- Auto-detecting head-end placement (still manually placed by user via Tools menu)

These would be future iterations.
