# PASS — Pricing vendor expansion (DoorBird + Luxer One)

Slot: after **M4 (SUMMARY xlsx table)**, before **M5 (persistence)**.

Rationale: M5 persists the per-section pricing rules + labour state. Better to land multi-vendor pricing **before** M5 so the loaded book is realistic when persistence math is exercised. Also unblocks the SQ Materials Cost/List columns for every non-camera class (intercoms, parcel, AC) — they currently render `$0.00` cost because their SKUs aren't in the EE-only book.

## Goal

Extend the pricing-book pipeline to merge **3 vendors** into one `pricingBook.json`:
- **Eagle Eye** (cameras / CMVR / switches) — already wired.
- **DoorBird** (intercoms) — new.
- **Luxer One** (parcel lockers) — new.
- **Brivo** (access control) — new. (Already in `BRIVO_CATALOG`; book has been uploaded earlier in the project as `27_3_Brivo_Price_List_NA1_Reseller_L3_CDN_20260401.xlsx`. Recommend folding in here so the access-control rows price correctly alongside intercom + parcel.)

## Scope

- Stage each vendor's source price book under `source-data/` (gitignored).
- Refactor `build_pricing_json.py` into a **per-vendor adapter** pattern. Each adapter reads one vendor's source file and emits the canonical `{<sku>: {unit_cost, msrp, notes}}` shape. Main script merges all adapters into a single `items` dict + writes `pricingBook.json`.
- Per-vendor subscription / setup row filtering (each vendor has its own pattern — EE's was `-(1|12|36|60)$` suffix; DoorBird + Luxer + Brivo need their own filters identified during recon).
- Catalog SKU audit: enumerate every SKU in `DOORBIRD_CATALOG` (or wherever intercoms catalog), `LUXER_CATALOG` (parcel), `BRIVO_CATALOG` (AC) and cross-reference against the vendor source. Fix mismatches in the catalog (the book is the source of truth for SKU keys).
- Acceptance: load merged `pricingBook.json` in the tool, walk a real project with cameras + intercoms + parcel + readers placed, confirm **every auto-row's Cost + List cells populate** (no `$0.00` / `—` except on the families that genuinely have no SKU — mailbox / IoT / AC credentials).

## Non-goals

- No UI changes to the load-pricing flow (still File menu → Load Pricing → JSON).
- No PDF auto-extraction in the converter — manual xlsx/CSV intermediates per vendor are fine.
- No price-update automation. Vendor refreshes stay a manual process.
- No catalog rewrites — only minimal SKU corrections where catalog ≠ book.

## Recon points (to report before edit)

1. **Existing converter shape**: argparse signature of `build_pricing_json.py`; current file-path assumptions; output path convention.
2. **Vendor source-data audit**: which files are present under `source-data/` today? Format of each (xlsx / CSV / PDF)? Last-modified date.
3. **DoorBird PDF**: column layout. Identify which column = SKU, which = list price, which = reseller / dealer price (if both exist). Currency stamp (CAD already, per the file name).
4. **Luxer One PDF**: same audit.
5. **Brivo xlsx**: same audit (this one's already xlsx, easier).
6. **Catalog SKU enumeration**: every entry in `DOORBIRD_CATALOG`, `LUXER_CATALOG` (or whatever the parcel catalog is named), `BRIVO_CATALOG`. Compare against vendor source SKUs.
7. **Subscription/setup row patterns** per vendor — what to filter out.
8. **Currency**: confirm all three vendor books are CAD (Eagle Eye is CAD already). Flag if any mix USD/CAD.

## Implementation phases (one commit each)

- **P1 — Source extraction (manual).** Hand-extract each vendor's PDF to xlsx or CSV. Stage in `source-data/`. The user does this step; the brief just specifies the column shape each adapter expects.
- **P2 — Converter refactor.** `build_pricing_json.py` becomes:
  - `def parse_eagle_eye(path) -> dict` (existing logic, factored out)
  - `def parse_doorbird(path) -> dict`
  - `def parse_luxer(path) -> dict`
  - `def parse_brivo(path) -> dict`
  - main: load each, merge into one items dict, write `pricingBook.json`. SKU collisions across vendors logged as warnings (shouldn't happen — SKU namespaces are vendor-prefixed).
- **P3 — Subscription/setup row filters** per vendor (apply inside each adapter).
- **P4 — Catalog SKU audit + fixup.** Walk every catalog, compare to merged book, fix mismatches in the catalog (not the book). Report any SKUs in catalog that have no book match — those are either typos or genuinely-unpriced items.
- **P5 — Browser verification.** Load merged book, walk a real project, confirm every priced-class auto row carries Cost + List.

## Open questions (recommendations included)

- **Include Brivo this pass, or scope to DoorBird + Luxer only?** → **Recommend include Brivo.** It's already an xlsx (easier source), uses the same adapter pattern, and the same access-control rows we're trying to price are unprice-able without it. One pass = one merged book.
- **PDF extraction: manual or scripted?** → **Recommend manual.** Vendor PDFs are static reference docs and Python PDF table-extraction libs (tabula-py, camelot) are fragile and add deps. A 10-minute manual extract per vendor is faster than a hardened scripted pipeline and the result is auditable.
- **Output shape: one merged `pricingBook.json` or per-vendor books with a JS merger?** → **Recommend one merged book.** The tool already loads one file; the converter is the natural merge point; no JS changes needed. (Vendor source files stay separate under `source-data/`.)
- **What to do with catalog entries whose SKU doesn't appear in the book?** → **Recommend: catalog row keeps rendering, Cost + List render as `$0.00` + `—`, with a console warning at load time naming the unmatched SKUs.** Better than silent gaps. M2's wrapper already handles missing SKUs gracefully.

## Acceptance criteria

- `pricingBook.json` is rebuildable from `source-data/` via one `python build_pricing_json.py` invocation.
- A reference project (≥2 cameras, ≥1 CMVR, ≥1 switch, ≥1 intercom, ≥1 parcel locker, ≥1 reader) shows real Cost + List on every priced auto row in SQ Materials.
- Mailbox / IoT / AC-credentials still render `—` (no SKU, expected).
- No SKU collisions across vendors at merge time (warning if any).
- `node --check` on the HTML script block PASSES (no JS changes expected, but defensive).

## Notes / open follow-ups for later

- Currency switching (CAD ↔ USD) is a separate, larger pass — out of scope here.
- Per-region / per-tier price variants (e.g. EE's "Reseller L1 / L2 / L3") — out of scope; we keep one cost tier per SKU.
- The customer-facing PDF + CSV exports should automatically benefit once Cost + List populate; no export changes needed in this pass.
