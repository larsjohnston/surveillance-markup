# Pass A.6: Move proposal-section toggles to the Export modal

## Context

The four "Proposal Sections" toggles (Cover page / BOM / Riser / Floor plans) currently live inside the Project Info modal. That's the wrong home. They're an export-time decision ("what should THIS proposal contain"), not a project-level setting ("set this once and forget").

This PR moves them into a new Export modal that appears when the user clicks Proposal → Export Proposal PDF. The modal also becomes the home for future per-export options (filename overrides, filters, output preferences).

## Builds on Pass A.5

This PR comes after Pass A.5 (typical-floor multiplier) ships. The data structure for `projectInfo.proposalSections` already exists. We're moving where it's edited, not changing the schema.

## What changes for the user

**Today:**
1. Click Proposal → Project Info → scroll to "Proposal Sections" → toggle checkboxes → save
2. Click Proposal → Export Proposal PDF → PDF generates with whatever was set

**After this PR:**
1. Click Proposal → Export Proposal PDF
2. Export modal opens with section checkboxes (showing the project's last-used settings)
3. Adjust checkboxes for this export → click Export PDF
4. PDF generates → modal closes
5. The project's `proposalSections` is updated so next time the modal opens for this project, it remembers

The Project Info modal no longer contains the section toggles at all. One source of truth.

## Modal structure

The new modal is `#export-modal`, follows the existing `.big-modal` pattern, centered, with a clear two-section structure that anticipates future options:

```
┌─ Export Proposal PDF ──────────────────── [×] ─┐
│                                                │
│ ── Sections to Include ──                      │
│                                                │
│   ☑ Cover Page                                 │
│   ☑ Bill of Materials                          │
│   ☑ Riser Diagram                              │
│   ☑ Floor Plan Pages                           │
│                                                │
│ ── Options ──                                  │
│                                                │
│   (Empty for now — leave room for future       │
│    options like output filename, filters, etc.) │
│                                                │
│                                                │
│              [ Cancel ]   [ Export PDF ]       │
└────────────────────────────────────────────────┘
```

The "Options" section is empty for now but visually present (styled as a section header with a placeholder hint or just whitespace). When future options ship, they slot in here without restructuring the modal.

### Section header styling

Use the same section header pattern that exists elsewhere in the tool — small uppercase text, muted color, `letter-spacing: .08em`, with a hairline divider below or above.

```html
<div class="export-section-hdr">SECTIONS TO INCLUDE</div>
```

### Checkbox layout

Vertical list, each row is checkbox + label. Reasonable padding (8-12px between rows). Match the existing checkbox styling from Project Info today (visually consistent with the rest of the tool).

### Modal width

About 420px wide (similar to the tab-edit modal from Pass A.5). Don't oversize it; the content is sparse for now.

## Initial state

When the modal opens, populate the checkboxes from `projectInfo.proposalSections`:

```javascript
function openExportModal(){
  var sections = projectInfo.proposalSections || {};
  document.getElementById('export-cover').checked = sections.cover !== false;     // default true
  document.getElementById('export-bom').checked = sections.bom !== false;
  document.getElementById('export-riser').checked = sections.riser !== false;
  document.getElementById('export-floors').checked = sections.floors !== false;
  document.getElementById('export-modal').classList.add('show');
}
```

The `!== false` pattern is important: if the field is missing entirely (legacy projects, brand-new sessions), default to true. Only an explicit `false` setting unchecks the box.

## Save behavior on Export click

When the user clicks "Export PDF":

1. Read the checkbox states
2. Update `projectInfo.proposalSections`:
   ```javascript
   projectInfo.proposalSections = {
     cover: document.getElementById('export-cover').checked,
     bom: document.getElementById('export-bom').checked,
     riser: document.getElementById('export-riser').checked,
     floors: document.getElementById('export-floors').checked
   };
   ```
3. Close the modal
4. Trigger the existing PDF export flow with these settings

The settings persist in `projectInfo`, so next time the user opens the same project and clicks Export, the checkboxes show the previous selection. Different projects each have their own settings (because `projectInfo` is per-project).

## Cancel behavior

Click Cancel or the × button or press Esc → close modal, do nothing. Don't update `projectInfo.proposalSections`. The user might just be exploring the dialog without intending to change anything.

## Wiring the menu item

The existing Proposal → Export Proposal PDF menu item currently calls the export function directly. Change it to call `openExportModal()` instead. The export function itself doesn't change behavior — it still reads `projectInfo.proposalSections` to decide what to include. We're just inserting the modal between the menu click and the PDF generation.

## Removing the toggles from Project Info

Find the "Proposal Sections" block inside the Project Info modal and remove it entirely:
- The section header
- The four checkboxes
- Any helper text describing them
- The save logic that writes to `projectInfo.proposalSections` from those checkboxes

Don't accidentally remove anything else from the Project Info modal. Just the proposal-sections block.

The `projectInfo.proposalSections` data field stays — it's still the source of truth, just edited from a different place now.

## Edge cases

- **No PDF loaded:** the Export menu item is already disabled in this state (existing behavior). No change.
- **Empty project (no cameras):** Export still works. The user gets a mostly-empty PDF, which is the existing behavior. The modal doesn't need to validate "you have cameras."
- **All four checkboxes unchecked:** the user gets... what? Today, Project Info doesn't prevent unchecking everything. Resulting PDF would have only the page numbers / headers but no content. That's the user's choice. Don't add validation — just generate whatever they asked for. Maybe add a subtle warning text below the checkboxes ("Uncheck everything to generate an empty proposal") if you want, but not required.
- **Project loaded from JSON without proposalSections:** the `!== false` defaults handle this. All four show as checked. User clicks Export → first export sets the field, future exports remember.

## Future-proofing

The "Options" section is intentionally empty for now. When future export options ship (like "Include site survey details", "Output filename override", "Include only typical floors"), they slot into this section without redesigning the modal.

To make this easy:
- Use a clear `#export-options-section` div as the container for future options
- Section header is hidden when empty (so we don't show an empty "OPTIONS" label) — show it only when at least one option exists. Easiest CSS rule: `.export-options-section:empty { display: none; }` plus a header that's also conditionally shown.

Don't build any of those options now. Just structure the modal to receive them.

## Constraints

- Don't change the PDF export logic itself — only what's wrapped around it
- Don't change `projectInfo.proposalSections` schema (still `{ cover, bom, riser, floors }` booleans)
- Don't introduce new dependencies
- Match existing modal styling (centered, .big-modal class, .modal-box, .modal-actions for the button row)
- Esc closes the modal — wire into the existing Esc cascade

## Process

1. Read camera_markup_tool.html and CLAUDE.md.
2. Lay out implementation as a numbered checklist. Confirm with me before edits.
3. Execute in this order:
   a. Add the new `#export-modal` HTML next to other big modals.
   b. Add CSS for any new classes (section headers, checkbox spacing).
   c. Add `openExportModal()` and `closeExportModal()` functions.
   d. Add a `confirmExport()` (or similar) function that reads checkboxes, updates `projectInfo.proposalSections`, closes modal, calls the existing export function.
   e. Wire the Proposal → Export Proposal PDF menu item to call `openExportModal()` instead of the direct export.
   f. Remove the "Proposal Sections" block from the Project Info modal HTML.
   g. Remove any save logic in Project Info that wrote to `proposalSections` from those toggles.
   h. Add Esc handler in the existing keydown cascade to close the export modal.
4. JS syntax check after each step.
5. Tell me what to test in the browser.

## Test cases

- Open Project Info — proposal section toggles are gone
- Click Proposal → Export Proposal PDF — new export modal opens
- All four checkboxes default to checked (or whatever was last saved for this project)
- Uncheck Riser → click Export PDF → PDF generates without riser page
- Open Export modal again → Riser checkbox is unchecked (remembers last state)
- Save the project → reload → re-open Export modal → Riser still unchecked (persists in JSON)
- Click Cancel or press Esc → modal closes without changing settings
- Backwards compat: load an OLD save file from before this PR — Export modal opens with all four checked (defaults applied)
