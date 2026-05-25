# Surveillance / Door Hardware Markup Tool — Work Queue

_Canonical manually-maintained queue. Last regenerated after BOM two-tier pass shipped (main `43fdd4a`, tag `bom-two-tier-pass`)._

---

## JUST SHIPPED (on main)

- **BOM two-tier restructure** (`43fdd4a`, tag `bom-two-tier-pass`) — M1–M8 (M5 N/A):
  - Flat 6-section BOM → fixed two-tier hierarchy: 5 majors (Cameras & Surveillance / Access Control & Intercom / Parcel Lockers & Mailboxes / Smart Suites / Door Hardware) + trailing "Other" catch-all. On-screen drawer, proposal PDF, and CSV all consume one `computeBomTree()` source.
  - M1: placed Network switch emits a BOM row + suppresses the camera-derived auto-switch per page.
  - M2: IoT type expansion — gateway / keypad / passageSet added (keypad distinct from smartLock). **Save v18 → v19** + backfill.
  - M3/M4: two-tier on-screen + PDF mirror; SA custom lines route to §4.1 with "(was: Smart Apartment)" prefix.
  - M6: Door Hardware §5 classifier (`dhwClassifyLine` → 5.1 Security / 5.2 Door / 5.3 Key / Unclassified), `SECURITY_HARDWARE_PATTERN` single source; 2-line PDF desc wrap.
  - M7: §2.2 dedup guard (security-hardware tokens can't land in 2.2 → reroute to Other); Unclassified amber accent.
  - M8: CSV gains tier1/tier2 columns; fixed latent `&amp;` → `&` bug in PDF/CSV tier titles.

---

## NEXT UP

_No active next pass in THIS chat. Proposal cover redesign is active on a SEPARATE branch/chat (see below). Otherwise pick from Deferred._

---

## ACTIVE — OTHER BRANCH (proposal-cover chat)

- **Proposal cover redesign** — replace `drawProposalCover()` with SMART-MF-branded title page (angled navy/white geometry as jsPDF vector fills; logo + building photo as base64; Project/Client/Date bottom-right). Renders from new `projectInfo.branding = { logoDataUrl, coverPhotoDataUrl, palette }` (multi-tenant-ready; SMART MF baked default). Scope + summary-counts box relocate to their own page after the cover. Helvetica not courier; `BRAND` palette constant.
  - **Assets:** logo IN (`Blue_Logo_2.png`, stacked lockup — use for cover; `Blue_Logo_1` horizontal for headers later). **Building photo PENDING** — needs a free-license (Unsplash/Pexels) `cover-photo.jpg` dropped in repo; until then placeholder.
  - **No version bump** — use branding backfill-on-load (bom-two-tier owned v19). Rebase onto main `43fdd4a` before merge.

---

## QUEUED PASSES

### 1. Classifier v2 — DHW keyword expansion *(from M8 real-data dump: 28 unclassified on the demo takeoff)*
- Extend `DHW_CLASSIFIER_RULES`: rule 4 (→5.2) add astragal, coordinator, threshold, gasketing, door bottom, door sweep, track, viewer, pocket door lock, latching bolt, mounting plate; rule 3 add fire exit hardware; rule 5 (→5.3) add `cyl` abbrev. Drops unclassified ~28→~5.
- Door-operator components (column actuator, surf. auto operator, power supply, wire harness) → §2.2 — **couples to the deferred door-operator modeling** (§2.2 has no operator support yet).
- "By others" lines (fire-alarm connection, credential-by-Div28, patio door, pocket-door kit, wiring diagrams) are NOT a classifier fix — integrator W7-excludes them at import. **User-guide note, not code.**
- **Ride-along:** add `\b` word boundaries to `SECURITY_HARDWARE_PATTERN` (fixes "REX" matching inside "CORE EXTRACTOR"; affects classifier rule 2 + the §2.2 guard — do it WITH this pass since it changes classification behavior).

### 2. Take-Off Pricing *(the big one)*
Cost columns/totals on Take-Off consuming the Pricing Foundation. Build real `source-data/pricing.json` from vendor books FIRST so cost rendering is verifiable. **Prereq for any real dollar output.**

### 3. Switch Topology *(partially started — Network tile placed/drag/delete/persist exists)*
Two-tier camera→switch→CMVR cabling; multi-switch-per-page array; switch selection + right-panel. Likely merges with Manual Cable Routing + Conduit.

### 4. Manual Cable Routing + Conduit
User-drawn polyline paths replacing straight-line × multiplier; conduit per-segment flag → BOM conduit row.

### 5. Camera Details Panel Redesign
Sliders with two-way canvas sync (reach/angle/mount).

### 6. PDF scale-marker auto-recognition
Select scale bar on PDF → extract calibration. OCR lib TBD.

### 7. Catalog / rules
Rules Page editor; LuxerOne / Doorbird / Hanwha SKU imports.

---

## HOUSEKEEPING

- **Centered BOM modal (CSS-only)** — block prepared (drawer → centered 2/3-screen modal, `66vw × 82vh`, opacity/scale transition). Run on a quick branch off main `43fdd4a`. **NOT yet applied** (was queued behind M6; pass closed before it ran).
- **Centralize `IOT_DEFAULT_FLAGS`** — the 6-key default object is duplicated in `onIotDeviceToggle` + `applyProjectState`; a 7th key would need both. One const.
- **DHW BOM override re-apply hook** — `dhwBomRows()` output isn't re-decorated by `bomAutoOverrides` on reload (DHW unit prices ephemeral). Fix when pricing lands.
- **`\b` word boundaries on `SECURITY_HARDWARE_PATTERN`** — see Classifier v2 ride-along above.
- **Commit-per-milestone discipline** — the BOM pass rode 8 uncommitted milestones on the OneDrive working tree all session (recovered fine via `43fdd4a`, but fragile). Commit after each browser review, not at pass end.
- **Dead-code sweep** — `.lp-breadcrumb`, `computeAutoCableRows()`, no-op list renderers, orphaned PNG assets, etc.
- **`switches`/`headends` don't reset on raw PDF re-import** — stale positions on invalid page indices. Reset in loadPDF.
- **Stray `PASS_DHW_M3_POLISH_BRIEF.md`** — now joined by committed `PASS_BOM_TEMPLATE_BRIEF.md`; decide whether stray briefs stay tracked.
- **Install LibreOffice** on Windows — kills the docs-PDF regen caveat.
- **User guide** — wizard + W7/W8 + Hardware Module + cleanup stretch + BOM two-tier all undocumented.

---

## RESOLVED (removed from deferred)
- ~~BOM two-tier template~~ — shipped `43fdd4a`.
- ~~Placed Network switch in BOM~~ — M1.
- ~~IoT type expansion (gateway/keypad/passageSet)~~ — M2.
- ~~Door Hardware in BOM (§5 classifier)~~ — M6.