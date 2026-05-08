# Pass A.25: JSON-on-Dropzone with Embedded PDF

## Context

Today, opening a saved project requires two steps: load the PDF first, THEN go to File → Load Project to apply the saved camera/calibration data. This is backwards — when a user returns to a project, they want to drop the saved file and have everything restored in one motion.

This PR makes the JSON save format self-contained (embeds the source PDF/image), and lets the user drop or load a JSON file from any state — including the empty dropzone.

## Builds on Pass A

This PR depends on Pass A having shipped. The data model + JSON v9 from Pass A is the foundation. This PR bumps to v10 by adding an embedded source-document field.

## What changes for the user

**Today:**
1. Open tool → empty dropzone showing "PDF, PNG, or JPG"
2. Drop a PDF → tool loads PDF
3. File → Load Project → pick the JSON → camera data appears

**After this PR:**
1. Open tool → empty dropzone showing "PDF, PNG, JPG, or saved Project (JSON)"
2. Drop the JSON → tool restores PDF + cameras + calibration + everything in one motion

The user can email a single JSON file to a teammate and the teammate opens it without needing the original PDF separately.

## Data model — JSON v10

JSON save bumps to version 10. Add a `sourceDocument` field that contains the original imported file as base64:

```javascript
{
  version: 10,
  sourceDocument: {
    type: "pdf"   // or "image"
    mime: "application/pdf"   // or "image/png", "image/jpeg"
    name: "Westmount_Tower_Plans.pdf"   // original filename
    data: "JVBERi0xLjQKJcfsj6IKNSAwIG9iago..."   // base64-encoded file
  },
  // existing fields stay
  cameras: [...],
  acDevices: [...],
  pages: [...],
  calibrations: {...},
  headends: {...},
  projectInfo: {...},
  // ... etc
}
```

### File size implications

A 10-page architectural PDF is typically 5-20 MB. Base64 encoding inflates by ~33%, so saved JSON will be 7-27 MB. This is fine for desktop file workflows (email attachments, Dropbox, network shares). Worth noting in the save flow but not worth optimizing yet.

### Backwards compatibility

Read v9 (Pass A) and earlier saves cleanly:
- v10 file → check for `sourceDocument`, restore PDF/image from base64, then apply camera/calibration data
- v9 or earlier file → no `sourceDocument` field → fall back to "load matching PDF first" flow (the existing behavior). Show a one-time info message: "This is an older save. Load the matching PDF/image first, then load this file again."

Don't ever break old saves. They should always load successfully even if they require an extra step.

## Save flow changes

When the user clicks File → Save Project:

1. Encode the current source document (the PDF or image that's currently loaded) as base64. Store in `sourceDocument`.
2. Build the rest of the JSON as today, but with `version: 10` and the new `sourceDocument` field.
3. Trigger download with filename based on project name + ".json" (existing behavior).

The source document was loaded via `loadPDF()` or `loadImage()` and we have access to the original File or ArrayBuffer. We need to keep a reference to the raw bytes (or re-fetch if we don't already keep them) so saveJSON can include them.

**Implementation note:** the existing PDF.js loader receives a File object via the file-input handler. We need to keep the original bytes accessible. Use a module-level variable:

```javascript
var sourceDocumentBytes = null;
var sourceDocumentName = null;
var sourceDocumentMime = null;
```

Set these when a file is loaded (via dropzone, file picker, or JSON restore). Read them when saving.

## Load flow changes

When the user provides a JSON file (via dropzone, file picker, or File → Load Project):

1. Detect: read the file, check if it's JSON. If yes, parse it.
2. If parsed JSON has `version >= 10` and `sourceDocument`:
   - Decode `sourceDocument.data` from base64 to ArrayBuffer
   - Call `loadPDF(arrayBuffer)` or `loadImage(blob)` based on `sourceDocument.type`
   - After the source document loads, apply the rest of the JSON state (cameras, acDevices, pages, calibrations, headends, projectInfo, etc.)
3. If parsed JSON is older or missing `sourceDocument`:
   - Show info message: "This is an older save format. Please load the matching PDF or image file first, then load this file again."
   - Don't error or break — just guide the user.

## Dropzone changes

The dropzone needs to accept JSON in addition to PDF/PNG/JPG:

### File picker (the "Choose File" button)

The existing `<input type="file">` for the picker has `accept="application/pdf,image/png,image/jpeg"` (or similar). Update to also accept JSON:

```html
<input type="file" id="file-input" accept="application/pdf,image/png,image/jpeg,application/json,.json">
```

Note: the `.json` extension is included as a fallback because some browsers don't recognize `application/json` MIME consistently.

### Drag-and-drop on the dropzone

Today the dropzone accepts PDFs/images via drag-drop. Update the drop handler to also accept JSON:

```javascript
function handleDrop(file) {
  var ext = file.name.toLowerCase().split('.').pop();
  if (ext === 'json' || file.type === 'application/json') {
    loadProjectFromFile(file);
  } else if (file.type === 'application/pdf' || ext === 'pdf') {
    loadPDF(file);
  } else if (file.type.startsWith('image/') || ['png','jpg','jpeg'].includes(ext)) {
    loadImage(file);
  } else {
    alert('Unsupported file type. Please drop a PDF, image, or saved JSON project.');
  }
}
```

### Dropzone label text

Update the dropzone caption to include JSON:

- Current: "PDF, PNG, or JPG · Click below or drag & drop a file here"
- New: "PDF, PNG, JPG, or saved Project (JSON) · Click below or drag & drop a file here"

### Title text

Optionally update the dropzone title from "Import a Floor Plan" to "Import a Floor Plan or Saved Project" — but this is a small judgment call. If the new label is too long visually, consider keeping the title as-is and let the subtitle do the work.

## Drag-and-drop after a PDF is already loaded

When the user drops a JSON file while a PDF/image is already loaded (i.e., they're working on something), we should warn before replacing:

- Show a confirmation modal: "Loading this saved project will replace your current work. Continue?"
- If "Continue" → apply the JSON (which includes loading its embedded source document, replacing the current floor plan)
- If "Cancel" → no change, current work preserved

For images/PDFs (loading a different floor plan while one is open), the existing behavior continues — no PR scope to change that here.

The existing `loadProjectFromFile()` helper added in this PR handles all entry points: dropzone, file picker, File menu → Load Project, drag-drop on canvas wrap when working.

## File → Load Project menu item

Behavior unchanged — opens the file picker. The picker now accepts JSON files (via the updated `accept` attribute), so the menu item still works as before but now is somewhat redundant with the dropzone behavior. Don't remove the menu item — keyboard shortcut (Ctrl+O) and discoverability still matter.

## State management

When a JSON loads its embedded source document and applies state, the order matters:

1. Set `sourceDocumentBytes`, `sourceDocumentName`, `sourceDocumentMime` from the JSON's `sourceDocument` block
2. Call `loadPDF(bytes)` or `loadImage(blob)` — wait for it to complete
3. Apply remaining JSON state (cameras, acDevices, pages, etc.)
4. Run cascade: rebuildTabsDom, redraw, updateList, updateAcList, etc.

`loadPDF` and `loadImage` are async (they wait on PDF.js or image decode). Make sure the rest of the state application waits properly. If PDF.js takes 2 seconds to render and you apply cameras before it's done, cameras may render at wrong positions.

## Out of scope

- Saving JSON without the embedded PDF (small-save toggle) — not in this PR; can add as one-line feature later
- Compression of the source document inside JSON (gzip/deflate) — not in this PR; vanilla base64 is fine
- Streaming load progress for large files — not in this PR; small loading indicator is fine
- Cloud storage integration — not in scope ever
- Auto-save functionality — not in scope for this PR

## Constraints

- Don't change canvas drawing
- Don't introduce dependencies (base64 encoding/decoding is built into JS via btoa/atob, or use FileReader + arrayBuffer for large files)
- Preserve all existing JS-referenced IDs
- Test both v9 and v10 round-trips

## Process

1. Read camera_markup_tool.html and CLAUDE.md.
2. Lay out an implementation plan as a numbered checklist before any edits. Confirm with me before starting.
3. Execute in this order:
   a. Add module-level vars for source document tracking (sourceDocumentBytes, sourceDocumentName, sourceDocumentMime). Wire them up in loadPDF and loadImage.
   b. Update saveJSON to include sourceDocument with base64-encoded bytes. Bump version to 10.
   c. Add loadProjectFromFile() helper that handles JSON loading with embedded source document. Backwards-compatible read of v9 and earlier.
   d. Update dropzone's drag-drop handler and file picker accept list to include JSON.
   e. Update dropzone label text.
   f. Add confirmation modal for "replace current work" when dropping JSON over an active session.
   g. Verify JSON load triggered from File → Load Project still works (should reuse loadProjectFromFile).
4. JS syntax check after each step.
5. Tell me what to test in the browser.
