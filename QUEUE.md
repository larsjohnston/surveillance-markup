# QUEUE.md — Smart Building Markup & Quoting Tool

## Shipped (recent)
- PR #28 (feb59df): DHW dashboard relocated to left-pane Tier-1 action tiles (Import Door Schedule = inactive placeholder; Import Hardware Schedule = active, auto-opens wizard on import). #hardware-home overlay show-path retired from setPanelMode. Export RFQ moved into wizard .dhw-header top-right. Add-to-Proposal moved to wizard Save (_dhwSaveAndClose flips proposalSections.hardware). Hardware takeoff import now accepts .xlsx (reuses quote-import SheetJS path).

## Immediate queue
1. **#hardware-home cleanup pass** — now fully orphaned after PR #28. Delete: #hardware-home HTML markup; renderHardwareHome(); _hwHomeRenderTile(); _dhwRefreshHomeIfVisible() + its remaining no-op call sites (closeDoorHardwareModal etc.); the _hwSavedScroll floor-plan-scroll-save/restore mechanism; _HW_TILE_ICON_SVGS if unused elsewhere (grep first). Verify no live caller remains before deleting each.
2. Pricing M2: wire SKU→price-book lookup into computeAutoRows wrapper; _stripOhPrefix + _normalizeBomKey helpers; hoisted single price-book read per compute pass; override-wins ordering.
3. Camera SKU crosswalk (een-* tool keys → EN-* price list keys) — deferred from Pricing M2 v1.
4. Credentials/materials model expansion (Pass 2 pricing).
5. Spec-map slice: Groups B/C/D BOM rows (synthetic spec-rows, catalog-blocked, user-typed custom lines).

## Backlog
- **PDF scale-marker auto-recognition:** user selects scale bar on imported PDF; tool extracts calibration. Open Qs: OCR lib (Tesseract.js?); scale bars vs ratios; graphic-only bars; per-page scales; user-assisted vs full auto.
- **Manual cable routing + conduit:** replace straight-line × multiplier with user-drawn polyline paths; conduit as per-segment flag feeding a BOM conduit auto-row. Open Qs: click-vs-draw UX; wall-snap; conduit catalog; cable tray; multiplier fallback; backwards compat.
