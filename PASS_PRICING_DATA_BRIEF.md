# Pass: Pricing Data Foundation

*Created May 19, 2026. Slots between Suites Polish (current pass) and Take-Off M2 resumption.*

## Context

The integrator has vendor price books (LuxerOne, Doorbird, eventually Brivo + Hanwha + others) sitting in the `source-data/` folder of the repo. The folder is gitignored — vendor pricing should not appear in git history regardless of repo visibility, as good practice.

This pass adds the data-layer foundation for using that pricing in the app: a pricing JSON file (gitignored, hand-curated from the vendor books), a file-picker entry that loads it into the app's localStorage, a degraded-mode banner when pricing is absent, and read helpers for downstream consumers.

**This pass does not render prices anywhere yet.** No cost columns in the BOM, no totals in the Take-Off, no Grand Total on the cover. That's the future **Pricing pass** (queue item #5), which will pick up this foundation and wire it through the rendering surfaces. Splitting these passes keeps the foundation testable in isolation and lets the rendering pass focus purely on UX.

## What this pass adds

1. **Schema** for `pricing.json` — single source of truth for all pricing data.
2. **localStorage persistence** under a known key (`'pricingBook'`).
3. **File menu entry** "Load Pricing…" that opens a file picker, validates the JSON, writes to localStorage.
4. **File menu entry** "Clear Pricing" that removes the localStorage key.
5. **Status indicator** in the menubar showing whether pricing is loaded (subtle, not intrusive).
6. **Banner** in the BOM drawer area when pricing isn't loaded, explaining quoting features are disabled.
7. **Read helpers** — `getPricingBook()`, `getUnitPrice(sku)`, `isPricingLoaded()` — for the future Pricing pass to consume.

## What this pass does NOT add

- Cost columns in the BOM drawer
- Cost columns in the proposal PDF (BOM, Take-Off, cover)
- Grand-total calculations
- Tax / margin / discount math
- Quote-specific PDF page (separate from the Take-Off)
- Per-project pricing overrides
- Multi-currency support beyond the schema currency field
- Pricing editor UI in the app (pricing is edited externally and reloaded)

All deferred to the future Pricing pass.

## Why localStorage and not bundled

The tool runs as a single HTML file via `file://` (double-click open). Chrome blocks local `<script src>` imports under `file://`, so we can't auto-load a sibling `pricing.json` next to the HTML at startup. The file picker + localStorage pattern is the standard workaround:

- Pricing data lives in localStorage on the user's machine
- Loaded once via file picker; survives until browser data is cleared
- Schema-versioned for future migration if needed
- Plain-text readable in DevTools (acceptable for case (c) — private repo, integrator-only access)
- Fresh machines / new browser profiles re-load once and they're good

## Schema

```json
{
  "schema_version": 1,
  "currency": "CAD",
  "updated": "2026-05-19",
  "notes": "Optional integrator notes — e.g. 'Reflects Q2 2026 LuxerOne MSAA pricing'",
  "labor_rate_per_hour": 95.00,
  "items": {
    "<SKU>": {
      "unit_cost": <number>,
      "msrp": <number>,
      "notes": "<optional string>"
    }
  }
}
```

### Field notes

- **`schema_version`** — bump if shape changes. v1 is the launch shape.
- **`currency`** — ISO 4217 code. Display only; no conversion math.
- **`updated`** — ISO date string. Surfaced in the status indicator so the user knows their pricing freshness.
- **`notes`** — free-text. Shown when user inspects loaded pricing.
- **`labor_rate_per_hour`** — composes with the existing top-level `LABOR_RATES` constant (which is hours-per-task). Example: a camera install costs `LABOR_RATES.cameraInstall × labor_rate_per_hour` dollars. The two stay separate because hours-per-task is intrinsic to the work, while $/hour is regional / vendor-influenced and updates more often.
- **`items`** — object keyed by SKU. SKU strings must match what the existing catalog constants (`BRIVO_CATALOG`, `INTERCOM_DB`, etc.) use. `unit_cost` is what the integrator pays vendor; `msrp` is the list price (used for margin display in the future Pricing pass). Both optional individually but at least one required per SKU.

### Validation rules (M1)

When loading a pricing.json file, validate:

- Top-level is an object.
- `schema_version === 1`.
- `currency` is a non-empty string.
- `labor_rate_per_hour` is a positive number.
- `items` is an object.
- Each item is an object with at least one of `unit_cost` / `msrp` as a non-negative number.

On validation failure: show error in a small modal, do NOT write to localStorage, do NOT clear existing pricing. User can fix the file and try again.

## File layout

```
source-data/                         (gitignored)
├── luxer-pricebook.pdf              (vendor source)
├── doorbird-pricebook.pdf           (vendor source)
├── brivo-pricebook.pdf              (when available)
├── pricing.json                     (the file users load into the app)
└── pricing-template.json            (committed — see below)
```

Two exceptions to the gitignore:

- **`source-data/pricing-template.json`** — committed to the repo. Contains the schema with placeholder/example values (no real prices). Lets anyone cloning the repo see the expected shape. Should be in the `.gitignore` exception list: `!source-data/pricing-template.json`.
- **`source-data/README.md`** — also committed. Explains the curation flow: "Pricing JSON files are hand-curated from vendor PDFs and loaded into the app via File → Load Pricing…. See pricing-template.json for the schema."

## UI changes

### Menu

Add to the **File** menu (or **Tools** menu if File feels crowded):

- **Load Pricing…** — opens file picker filtered to `.json`. Reads file, validates, writes to localStorage. Shows toast / banner on success or failure.
- **Clear Pricing** — confirms with user, then removes the `pricingBook` localStorage key. Banner reappears.

### Status indicator

Small text in the menubar (right side, near the auto-save indicator):

- **Pricing loaded:** `Pricing · CAD · 2026-05-19` (subtle, gray text)
- **Pricing not loaded:** `Pricing · not loaded` (slightly amber to suggest attention without alarming)

Click → opens the Load Pricing flow.

### Banner

When pricing is not loaded, show a non-intrusive banner at the top of the BOM drawer:

> *Pricing data not loaded. Load a pricing file (File → Load Pricing) to enable quote totals on BOM and Take-Off pages.*

Banner has a "Load Now" button → opens the file picker.

When pricing is loaded, banner is hidden entirely.

### Pricing loaded confirmation

After successful load, show a brief toast/notification:
> "Pricing loaded: 142 items, CAD, updated 2026-05-19."

(Itemcount derived from `Object.keys(items).length`.)

## Scope (milestones)

### M1 — Schema + localStorage helpers + banner UI

- Define the schema (just JSDoc comments — no JSON schema validator dependency)
- New top-level constants:
  - `PRICING_STORAGE_KEY = 'pricingBook'`
  - `PRICING_SCHEMA_VERSION = 1`
- New helper functions:
  - `getPricingBook()` — reads localStorage, parses, returns object or null
  - `setPricingBook(book)` — validates + writes to localStorage. Returns true/false on success
  - `clearPricingBook()` — removes from localStorage
  - `isPricingLoaded()` — boolean
  - `getUnitPrice(sku, field='unit_cost')` — returns the value or null
  - `validatePricingBook(obj)` — returns `{valid: bool, errors: [...]}` per the validation rules
- New banner element in the BOM drawer (HTML + CSS only — toggle visibility based on `isPricingLoaded()`)
- New status indicator element in the menubar (same pattern)
- No file picker yet — that's M2. Test M1 via DevTools by manually setting/clearing the localStorage key.
- No BOM math changes. No Take-Off changes.

### M2 — File picker + menu integration

- Add **File → Load Pricing…** menu entry
- Add **File → Clear Pricing** menu entry
- Implement FileReader-based file picker:
  - Open native `<input type="file" accept=".json">` (hidden, triggered programmatically)
  - Read file as text
  - Parse JSON
  - Validate via `validatePricingBook()`
  - On success: write to localStorage, update banner + status indicator, show toast
  - On failure: small error modal listing validation errors, no localStorage write
- Implement Clear Pricing flow:
  - Confirm dialog
  - `clearPricingBook()`
  - Refresh banner + status indicator
  - Optional toast: "Pricing data cleared."
- Wire banner's "Load Now" button to the same file picker

### M3 — Source-data folder + template + README (pass-closure step)

- Create `source-data/pricing-template.json` with schema example (placeholder values)
- Create `source-data/README.md` explaining the curation flow
- Update root `.gitignore`:
  - Confirm `source-data/` is gitignored
  - Add exception: `!source-data/pricing-template.json`
  - Add exception: `!source-data/README.md`
- Commit the template + README in their own commit
- User-side: copy `pricing-template.json` to `pricing.json` and hand-fill with real prices from vendor PDFs

### M4 — User guide patch (pass-closure step)

- Add a new section to `docs/user-guide.md` documenting:
  - That pricing is loaded externally, not embedded
  - The Load Pricing / Clear Pricing menu actions
  - The status indicator
  - That quoting features are disabled until pricing is loaded
  - Where to keep `pricing.json` on the user's machine
- Bump `version:` to `1.3` in META
- Add a Version 1.3 entry in Version History
- Run `node docs/build-guide.js` to regenerate docx + PDF

## Constraints

- No new dependencies
- All pricing data accessed via the helper functions — no direct localStorage reads scattered through the file
- Pricing data is treated as transient — the file is the source of truth, localStorage is a cache. Re-loads always overwrite, no merging.
- Status indicator and banner are read-only views into `isPricingLoaded()` — they never own state
- No git-tracked file ever contains real prices

## Test cases

1. **Cold start, no pricing:** Open app fresh. Banner visible in BOM drawer. Status indicator shows "Pricing · not loaded". `isPricingLoaded() === false`. `getUnitPrice('any-sku') === null`.
2. **Load valid pricing:** File → Load Pricing → pick a valid `pricing.json`. Banner hides. Status updates to show currency + date. `isPricingLoaded() === true`. `getUnitPrice('<known-sku>')` returns the unit_cost.
3. **Load invalid pricing — bad JSON:** Pick a file with invalid JSON. Error modal lists parse error. localStorage unchanged.
4. **Load invalid pricing — schema fail:** Pick valid JSON missing required fields. Error modal lists validation errors. localStorage unchanged.
5. **Load valid pricing twice:** Load file A. Then load file B. File B's data replaces A's. Status indicator updates to B's date.
6. **Clear pricing:** File → Clear Pricing → confirm. Banner reappears. Status indicator reverts. `isPricingLoaded() === false`.
7. **Persistence across reload:** Load pricing. Hard-reload the page. Status indicator still shows pricing loaded. `getUnitPrice('<sku>')` still works.
8. **Banner button:** Click "Load Now" in the banner → file picker opens.
9. **Status click:** Click the menubar status indicator → file picker opens.
10. **Unknown SKU:** `getUnitPrice('SKU-THAT-DOESNT-EXIST') === null` (not undefined, not 0, not throw).
11. **Schema version mismatch:** Manually set localStorage to a `pricingBook` with `schema_version: 2`. Reload app. Validation rejects on next read. Banner shows with a note "Pricing data uses an unsupported schema version. Reload your pricing file." (Edge case but worth covering for future-us.)
12. **Template loads cleanly:** `source-data/pricing-template.json` loads via the file picker without validation errors. All placeholder SKUs return their placeholder unit_costs.

## Out of scope (deferred to future Pricing pass)

- Rendering prices in the BOM drawer
- Adding cost columns to BOM, Take-Off, and cover summary PDFs
- Subtotal / labor cost / tax / margin / grand-total calculations
- Quote-specific PDF page (if needed beyond the Take-Off labor summary)
- Multi-currency conversion
- Vendor-tier pricing (different prices for different customer tiers)
- Per-project pricing overrides
- In-app pricing editor UI
- CSV import for pricing
- Pricing history / audit log
