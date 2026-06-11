# Commercialization Audit — Performance, Postgres Prep, SaaS Roadmap

- **Date:** 2026-06-11
- **Scope:** Full audit of `camera_markup_tool.html` (~24,800 lines, ~800 KB JS/CSS + 3 MB libs) toward: faster/smoother tool, Postgres-backed storage, commercial multi-tenant web app with login + payments.
- **Status:** Findings + open questions. No code changed by this audit.

---

## 1. Performance & smoothness findings (current tool)

Prioritized; P1 = felt by users today, P2 = scales badly with big projects, P3 = hygiene.

| # | Finding | Where | Priority | Fix |
|---|---------|-------|----------|-----|
| 1 | `recalcBom()` rebuilds the entire BOM table via innerHTML on **every keystroke** of margin/tax/labour inputs (~22 call sites) | ~line 22074 | P1 | Debounce 300 ms; or update changed cells via textContent |
| 2 | `redraw()` does a **full canvas re-render on every mousemove** with no requestAnimationFrame cap | ~line 13697 | P1 | rAF-batch redraws (dirty flag, one render per frame) |
| 3 | `updateList()`/`updateAcList()` re-create DOM nodes and **re-bind a listener per item** on every update | ~16647, ~14172 | P1 | Event delegation: one root listener + `data-id` |
| 4 | Left-pane drill-downs rebuild full tier-2/tier-3 grids per click (inline `onclick` strings re-parsed) | ~10229 | P1–P2 | Cache fragments; toggle classes; delegate clicks |
| 5 | Autosave serializes the **entire project to localStorage every 30 s** (blocking, quota risk) | ~16832 | P2 | Dirty-field tracking; serialize changed arrays only |
| 6 | Floorplan PDFs embedded **base64 in the save JSON** (~80 % of file size; 1.6 MB typical, can hit tens of MB) | ~17032 | P2 | Store source docs separately (solved by move to object storage) |
| 7 | Hover hit-testing runs 8–9 linear scans per mousemove (no spatial index) | ~13710 | P2 | Grid/quadtree index per redraw |
| 8 | Blocking `confirm()`/`alert()` dialogs in load/export/delete paths | 17699, 18080, 11459 | P1 UX | Replace with the app's own modal pattern |
| 9 | 244 inline `onclick=` handlers; 662 functions in one file | global | P3 | Delegation + eventual modularization |

**Do-first five:** debounce recalcBom → rAF redraw → list event delegation → drill-down caching → incremental autosave. Estimated ~70 % reduction in felt latency on large projects.

---

## 2. Postgres preparation — data-model inventory

Save format is **v34**; serializer at ~17039 (`saveJSON`), loader/migrations at ~17127 (`applyProjectState`).

### Entities → tables
| Table | Source | Notes |
|-------|--------|-------|
| `projects` | top-level + `projectInfo` basics | name, ref, client, address, sales, scope, timestamps |
| `pages` | `pages[]` + `calibrations` | **Replace array-index keying with stable UUIDs** (indices corrupt on reorder/delete) |
| `cameras` | `cameras[]` (~50–200/project) | x, y, angle, fov, model, tier, mount, power, environ, conduit, notes |
| `ac_devices` | `acDevices[]` | sku, category/subcategory/variant, overheadDoor flag, `secHw` as JSONB |
| `smart_apartment_devices` | `smartApartment[]` | discriminated by `type` (intercom/parcel/mailbox) |
| `suites` | `suites[]` | references `unitTypes` by id |
| `headends`, `switches` | arrays | CMVR recorders, network switches |
| `bom_lines` | `bom.customLines` + `bom.autoOverrides` | custom rows + per-SKU overrides |

### JSONB candidates (read/written as a unit)
`projectInfo` (credentials, elevatorControl, acHardwareConfig, unitTypes, iotDevices, proposalSections, subscription settings, labelVisibility), `doorHardware` (entire module state), `secHw`, `bomAutoOverrides`, per-page calibration.

### Reference tables (admin-managed, not per-project)
`camera_db` (~40), `cmvr_catalog` (~28), `brivo_catalog` (~15), `brivo_cred_catalog` (~8), `intercom_db`, `parcel_db`, `mailbox_db`, `labor_rates`, and `pricing_items` (~3,000 SKUs from `pricingBook.json`: unit_cost / msrp / notes, CAD).

### Object storage (NOT Postgres)
- `sourceDocument` (floorplan PDF/image, base64 today) → S3/Supabase Storage/Azure Blob; DB keeps url/mime/name/size.
- `doorScheduleRef` PDFs likewise.

### Derived — do NOT store
Auto BOM rows (`computeAutoRows`), controller plan (`acControllerPlan`), subscription rows, riser/cable runs, `__`-prefixed transient camera fields, `camera.floor` snapshots.

### Keying issues to fix during migration
1. Device ids are `Date.now()+random` → use UUID/ULID server-side.
2. Page references are array indices → stable page ids.
3. `tabOrder` stores indices → ids.
4. The v10→v34 migration chain in `applyProjectState` is the import path for existing saves — port it to a one-time importer.

---

## 3. Commercialization blockers (ranked)

1. **Cost pricing ships to the browser.** `pricingBook.json` exposes wholesale `unit_cost` (your margins) to anyone with dev tools. Pricing must move server-side; clients receive sell prices only (role-dependent).
2. **No multi-tenancy.** No auth, no user model, no API; single-company assumptions throughout.
3. **Offline/local-file data model.** Save = download JSON; autosave = localStorage. SaaS needs server persistence, version history, conflict handling (or an explicit online-only decision).
4. **Hard-coded branding/locale.** SMART logo + cover art in `branding.js` (461 KB), GST label, CAD, section nomenclature — must become per-tenant config; check stock-photo/logo redistribution rights.
5. **Vendor data licensing.** Brivo/Eagle Eye/Hanwha/DoorBird/Luxer pricing redistribution to third parties is likely restricted — legal check required before any external tenant sees it.

### Security posture (good news)
- `escapeHtml` applied consistently at render sites; no `eval`/`new Function`.
- Gaps: project-file `JSON.parse` lacks schema validation (server must validate), inline onclick id-injection (internally generated ids only today), no telemetry/error reporting.

### Libraries
jsPDF 2.5.1 (MIT, outdated → upgrade), PDF.js 3.11 (Apache-2.0, OK), SheetJS xlsx (check SaaS licensing terms), branding.js (rights unverified).

### Natural API boundary
Pure-logic functions (BOM compute, controller plan, pricing lookups, subscription packing) port cleanly server-side; DOM/canvas code stays client. Suggested first endpoints: `GET/POST /projects/:id`, `GET /catalogs/*`, `GET /pricing/:sku` (sell-only), `POST /projects/:id/export-pdf`.

---

## 4. Suggested build order (pending answers below)

1. **Quick wins now** (perf P1 fixes in the current tool — keeps daily users happy during the rebuild).
2. **Backend foundation**: Postgres schema + auth + project CRUD; importer for existing v34 JSON saves.
3. **Pricing service**: price book ingestion (Excel→DB), server-side cost handling, role-based price visibility.
4. **Front-end migration**: current HTML talks to the API (login, cloud save/load, asset upload) — incremental, not big-bang rewrite.
5. **Tenancy + billing**: org/tenant model, per-tenant branding, Stripe subscriptions.
6. **Hardening**: server PDF rendering (optional), telemetry, undo/redo, version history.
