# Pass D: Auto-Save + Save Indicator

## Context

Users can lose hours of camera placement, calibration, and BOM work if the browser tab crashes, they accidentally close the tab, or their machine restarts. The tool today only saves when the user explicitly clicks Save Project, and there's no visual indicator that work is unsaved.

This PR adds:
1. **Auto-save** to browser `localStorage` every 30 seconds (without the embedded PDF — too large for localStorage)
2. **Recovery prompt** on page load if a recent auto-save exists
3. **Visual save indicator** in the top bar showing dirty/clean state
4. **Passive reminder** after extended unsaved time

This is recovery insurance, not a replacement for Save Project. The full save (with embedded PDF, JSON v10+) remains the canonical "share this with a colleague" file.

## What changes for the user

**Today:**
1. Place 50 cameras over 2 hours
2. Browser tab crashes
3. Lose everything; no recovery

**After this PR:**
1. Place 50 cameras over 2 hours
2. Tool silently auto-saves every 30 seconds; "● Unsaved" indicator visible when dirty
3. Browser tab crashes
4. Reopen tool, drop original PDF
5. Tool detects auto-saved state from <24h ago: "Restore auto-saved work from [timestamp]?"
6. Click Yes → cameras, calibrations, BOM, AC readers all restore

## Architecture

### What auto-save stores

A "lite" version of the project state — same as a v9 save (no embedded PDF). Includes:
- cameras, acDevices, acCounters
- pages metadata (name, typical config)
- calibrations
- headends
- projectInfo (including proposalSections)
- bom (customLines, autoOverrides, config)

Excludes:
- sourceDocument (PDF/image bytes)
- Selection state (selectedId, acSelectedId)

This shape is roughly 5-50 KB depending on project size. Fits in localStorage (~5-10 MB browser limit) for the vast majority of projects.

### localStorage key

```javascript
localStorage['surveillance_autosave'] = JSON.stringify({
  version: 13,           // matches current save format minus sourceDocument
  timestamp: Date.now(),
  data: { /* lite save shape above */ }
});
```

Single key, overwritten on each auto-save. Don't accumulate history (would blow through quota).

### Auto-save trigger

A module-level `isDirty` flag, set `true` on any state change:
- addCamera, deleteCamera, drag-move-end, label/notes/mount/angle/FOV/reach edit
- placeReader, deleteReader, reader label/notes edit
- Tab rename, tab typical-config save, tab delete
- Calibration save (typed or two-point)
- Head-end placement
- BOM custom-line edit, BOM tier filter change, BOM CSV export does NOT count as a state change
- Project Info save
- Camera tier change, page changes via switchPage do NOT count as state changes

A `setInterval` runs every 30 seconds:
1. If `isDirty === true` and `pdfLoaded === true`:
   - Serialize lite save shape
   - Write to localStorage
   - Set `isDirty = false`
   - Update indicator to "✓ Auto-saved [time]"
2. If localStorage write fails (quota exceeded, private browsing, etc.):
   - Catch the error
   - Show one-time toast: "Auto-save unavailable. Use Save Project regularly."
   - Stop attempting auto-save for this session

### Auto-save quiet times

Don't auto-save:
- During PDF load (`loading` flag is true)
- During calibration two-point flow (`calibMode` true) — wait for the flow to commit
- During head-end placement mode
- When `pdfLoaded === false`

These are "in-progress" states where saving would capture inconsistent data.

## Recovery flow

### When recovery is offered

When the user does any of these:
- Drops a PDF on the empty dropzone
- Drops an image on the empty dropzone
- Picks a PDF/image via the file picker

After the source document loads (PDF rendered, pages set up), check localStorage for an auto-save:

```javascript
function checkAutoSaveRecovery() {
  var raw = localStorage.getItem('surveillance_autosave');
  if (!raw) return;
  var parsed;
  try { parsed = JSON.parse(raw); } catch(e) { return; }
  if (!parsed.timestamp || !parsed.data) return;
  var ageMs = Date.now() - parsed.timestamp;
  var ONE_DAY = 24 * 60 * 60 * 1000;
  if (ageMs > ONE_DAY) {
    // Stale; clear it silently
    localStorage.removeItem('surveillance_autosave');
    return;
  }
  promptRecovery(parsed);
}
```

### The recovery prompt

A modal dialog (uses existing `.big-modal` pattern):

```
┌─ Restore Auto-Saved Work? ──────────────────┐
│                                             │
│ Found auto-saved project from [12 min ago]. │
│                                             │
│ Restore? Otherwise the auto-save will be    │
│ discarded.                                   │
│                                             │
│ Project size: 12 cameras, 4 readers,        │
│ 5 pages, 47 BOM lines                        │
│                                             │
│        [ Discard ]    [ Restore ]            │
└─────────────────────────────────────────────┘
```

Buttons:
- **Restore** — apply the saved state to the current PDF/image (which the user just loaded). Calls existing `applyProjectState(parsed.data)` minus the sourceDocument restoration. Then clears the auto-save (it's been recovered).
- **Discard** — clear the localStorage entry, continue with empty state.

If the user closes the prompt without clicking either, treat as "Discard" (don't keep the autosave hanging around forever).

### What if loaded PDF doesn't match the auto-save?

The auto-save doesn't include the PDF, so technically the user could load a different PDF and the auto-save would apply camera positions to it. This is a real edge case but rare in practice (users tend to work on one project at a time).

We can guard against it cheaply by storing a "PDF fingerprint" in the auto-save:
- File name (e.g., "Westmount_Tower_Plans.pdf")
- File size
- Page count

On recovery, compare to the just-loaded PDF. If mismatch, the prompt warns:
> "This auto-save was for a different file (Westmount_Tower_Plans.pdf, 5 pages). The current PDF (Floor_Plan_Sample.pdf, 3 pages) may not match. Restore anyway?"

User can choose to restore (maybe they renamed the file) or discard.

For first iteration: skip the fingerprint check. Just restore and trust the user. Add fingerprint guard if it becomes a problem.

## Visual indicators

### Save status indicator in top bar

A small element in the top bar (next to or near the existing menu items):

**States:**
- **Clean** (`isDirty === false`, has been saved): "✓ Saved [time ago]" — muted text
- **Dirty** (`isDirty === true`): "● Unsaved changes" — slightly emphasized
- **Auto-saving** (during the 30s interval write): briefly "Saving..." then back to "✓ Auto-saved [time]"
- **No PDF loaded**: indicator hidden

Click the indicator → triggers Save Project (existing flow with full embedded PDF).

Style:
- Small text, 11-12px
- Muted color (`#6b7280` or similar)
- Slightly more emphasized when dirty (slightly darker, optional dot prefix)
- No backgrounds, no borders — just text in the top bar
- Positioned near other top-bar items, not in a way that crowds the existing menus

### Passive 10-minute reminder

If `isDirty === true` for more than 10 minutes (single contiguous dirty period), show a passive toast in the bottom-right of the screen:

```
┌─────────────────────────────────────────────┐
│ It's been 10 minutes since you saved.       │
│ Save Project (Ctrl+S) to embed the PDF.     │
│                                       [×]   │
└─────────────────────────────────────────────┘
```

- Auto-dismisses after 30 seconds
- Click × to dismiss immediately
- Doesn't block UI; user keeps working
- After dismissing or auto-dismiss, doesn't show again for at least another 10 minutes (don't nag)

The toast is purely informational. No modal pop-ups, no blocking, no sound.

## Edge cases

### Multiple tabs of the tool

If the user has two tabs open with different projects, both write to the same `surveillance_autosave` key. Last write wins. Recovery on either tab loads whichever was most recent.

This is acceptable — multi-tab use is rare and we don't want the complexity of per-tab namespacing.

### Private/Incognito mode

`localStorage` may throw on write or be capped to 5 MB. The error catch shows the toast and disables auto-save for the session. Manual Save Project still works.

### Project name in indicator

The "Saved [time]" indicator should show relative time:
- "Saved just now"
- "Saved 5 min ago"
- "Saved 1 hour ago"
- "Saved yesterday"

Update the relative time every 60 seconds (cheap setInterval).

### The user explicitly saves (Save Project)

When the user clicks Save Project (which triggers the full v13 save with embedded PDF):
1. Set `isDirty = false`
2. Update indicator to "✓ Saved just now"
3. Clear the auto-save from localStorage (it's redundant with the explicit save)

### The user explicitly opens a different project (Load Project)

When loadProjectFromFile applies a v10+ save:
1. Clear any pending auto-save (it was for the previous project)
2. Set `isDirty = false`
3. The new project starts fresh

## Out of scope

- Auto-save with embedded PDF (would blow through localStorage)
- Cloud auto-save (no backend)
- Versioned history (only "last auto-save" persists)
- Background saves while editing (the 30s interval is enough)
- Undo/redo via auto-save snapshots

## Constraints

- Don't change the v13 save format
- Don't introduce new dependencies
- localStorage failures must degrade silently (toast notification, no errors)
- Auto-save must never block the UI (no synchronous large operations)
- Recovery prompt is the only blocking interaction; everything else is passive

## Process

1. Read camera_markup_tool.html and CLAUDE.md.
2. Lay out implementation as a numbered checklist before edits. Confirm with me.
3. Execute in this order:
   a. Add `isDirty` flag at module scope. Default false.
   b. Add `markDirty()` helper. Call in every state-change site (camera/reader/page/calibration/headend/BOM/projectInfo edits).
   c. Add `setInterval` (30s) that auto-saves when dirty.
   d. Build the lite-save serialization (mirror saveJSON's data shape minus sourceDocument).
   e. Build `loadAutoSave(parsed)` that applies state to current PDF. Reuse applyProjectState's logic where possible.
   f. Build the recovery prompt modal HTML/CSS/JS.
   g. Hook recovery check into loadPDF/loadImage end (after the source loads).
   h. Build the save status indicator in the top bar.
   i. Build the 10-minute reminder toast.
   j. Wire indicator click → Save Project.
   k. On Save Project / Load Project, clear auto-save and reset isDirty.
4. JS syntax check after each step.
5. Tell me what to test.

## Test cases

- Place 5 cameras → wait 30+ seconds → check localStorage in DevTools (`Application → Storage → Local Storage`) → see `surveillance_autosave` key with recent timestamp
- Refresh page → drop original PDF → recovery prompt appears → click Restore → cameras come back
- Refresh again → drop PDF → click Discard → cameras don't come back, localStorage entry cleared
- Click "Save Project" (full save with embedded PDF) → localStorage cleared, indicator shows "Saved just now"
- Make changes → indicator changes to "● Unsaved changes"
- Wait 10+ minutes without saving → toast appears bottom-right
- Auto-save when localStorage is full → toast says auto-save unavailable, manual save still works
- Indicator click → triggers Save Project with full save dialog
- Calibrate a page → triggers markDirty
- Tab rename → triggers markDirty
- BOM custom line edit → triggers markDirty
- Switch pages → does NOT trigger markDirty (read-only navigation)
