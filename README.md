# Camera Markup Tool

Browser-based tool for security camera placement, DORI coverage analysis, BOM generation, and proposal export. Runs entirely in a web browser — no install, no internet needed after first-time setup.

---

## Quick Start (First Time)

You need to do this **once per folder**. After that, anyone can use the tool just by opening `camera_markup_tool.html`.

### Windows
1. Unzip this folder somewhere — Desktop, Documents, or a shared network drive (e.g. `\\fileserver\security\camera-tool\`)
2. Double-click **`setup-windows.bat`**
3. Wait for the three downloads to finish (about 5 seconds, total ~1.8 MB)
4. Double-click **`camera_markup_tool.html`** to launch the tool

### Mac / Linux
1. Unzip this folder somewhere
2. Open Terminal in that folder and run: `bash setup-mac-linux.sh`
3. Double-click **`camera_markup_tool.html`** to launch

That's it. Setup downloads the supporting libraries from cdnjs.cloudflare.com — these are the standard public versions of PDF.js (Mozilla) and jsPDF used by tens of thousands of websites.

---

## What's in the package

| File | Purpose |
|---|---|
| `camera_markup_tool.html` | The tool itself. Double-click to open. |
| `setup-windows.bat` | Run once on Windows to download support libraries |
| `setup-mac-linux.sh` | Run once on Mac/Linux to download support libraries |
| `README.md` | This file |
| `lib/` *(created by setup)* | Folder holding the three support libraries |

After setup, the `lib/` folder will contain:
- `pdf.min.js` — PDF rendering engine (~340 KB)
- `pdf.worker.min.js` — PDF background processor (~1.1 MB)
- `jspdf.umd.min.js` — PDF generation library for proposal export (~360 KB)

---

## Sharing with your team

The cleanest way to deploy this for a multi-person team:

### Option A — Shared network drive (simplest)
1. Run setup once, on any machine
2. Copy the entire folder (including the `lib/` subfolder created by setup) to a shared drive — e.g. `\\fileserver\Tools\CameraMarkup\`
3. Share the path with your team — they double-click `camera_markup_tool.html` and it just works
4. No installs, no passwords, no logins

### Option B — Internal web server
If your company runs an intranet site, drop the entire folder under your web root and share the URL:
```
https://intranet.yourcompany.com/tools/camera-markup/camera_markup_tool.html
```
Team members just bookmark it.

### Option C — Each person's machine
Email or USB-stick the zip to each team member. They unzip, run setup once, and use it locally. Best privacy because customer floor plans never leave their machine.

---

## Troubleshooting

### "Library files missing" message appears when I open the HTML
The setup script didn't run, or your `lib/` folder isn't in the same directory as the HTML. Run the setup script again, or download the files manually (see below).

### Setup script fails — "could not download"
Your network is blocking cdnjs.cloudflare.com (some corporate firewalls do). Two fixes:

**Manually download from a personal device:**
1. On a phone or home computer, save these three files:
   - https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js
   - https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js
   - https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js
2. Email/transfer the three files to the work machine
3. Place them inside a folder named `lib` next to `camera_markup_tool.html`

**Or ask IT** to whitelist `cdnjs.cloudflare.com` — it's a major public CDN used by countless business apps.

### PDF won't open / nothing happens when I drag a PDF in
Check the browser console (F12 → Console tab). If you see "Setting up fake worker" the worker file isn't loading — check that `lib/pdf.worker.min.js` exists.

### Tool is slow on big PDFs
Expected behavior on first render of pages with lots of text/vectors. Subsequent renders are cached.

---

## Privacy note

This tool runs **entirely in the browser**. Floor plans, camera placements, project info, and BOM data never leave the local machine. There is no cloud sync, no analytics, no telemetry. The Save/Load JSON button writes to your local Downloads folder; loading reads from local disk.

The only network calls happen during the one-time setup, which downloads PDF.js and jsPDF from cdnjs (a public CDN). After setup, the tool is fully offline and works without internet.

---

## Updating

To pull a newer version: replace `camera_markup_tool.html` with the new one. The `lib/` folder doesn't need updating unless instructed.

---

## Version

Camera Markup Tool, packaged 2026.
PDF.js 3.11.174 · jsPDF 2.5.1
