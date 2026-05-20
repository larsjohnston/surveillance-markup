# source-data/ — Pricing Curation

This folder holds the raw vendor price books and the curated `pricing.json` file the app loads. **The entire folder is gitignored** with two exceptions:

- `pricing-template.json` — committed, the schema reference.
- `README.md` (this file) — committed, the curation flow.

Nothing else in `source-data/` should be committed. Vendor PDFs/XLSX files and the curated `pricing.json` stay local to each machine.

## Files you'll see here

| File | Tracked? | Purpose |
|---|---|---|
| `pricing-template.json` | yes | Schema reference with placeholder values. Loads cleanly into the app as a smoke test. |
| `README.md` | yes | This document. |
| `pricing.json` | no | The hand-curated file the app actually loads. **You create this.** |
| `*.pdf`, `*.xlsx` | no | Vendor price books (LuxerOne, Doorbird, Brivo, Eagle Eye, Hanwha, etc.). |

## Workflow

1. **Get the vendor price books.** Drop the PDFs / XLSX files from each vendor into this folder.
2. **Copy the template:** `cp pricing-template.json pricing.json` (or duplicate via File Explorer).
3. **Hand-fill `pricing.json`** from the vendor sources:
   - Replace `EXAMPLE-SKU-001` / `EXAMPLE-SKU-002` with real SKU keys.
   - Set `unit_cost` (what you pay the vendor) and/or `msrp` (list price) on each item. At least one of the two is required per item; either is a non-negative number.
   - Update `currency`, `updated`, `labor_rate_per_hour`, and `notes` to reflect the real values.
4. **Load it in the app:** open `camera_markup_tool.html`, then **File → Load Pricing…**, pick `pricing.json`. The menubar status indicator updates to `Pricing · <currency> · <date>` and the BOM-drawer banner disappears.
5. **Re-curate when vendor pricing changes:** re-edit `pricing.json`, then File → Load Pricing again. The new file replaces the cached pricing in browser localStorage.

## Schema (v1)

```json
{
  "schema_version": 1,
  "currency": "CAD",
  "updated": "2026-05-20",
  "notes": "Optional integrator notes — e.g. 'Q2 2026 LuxerOne MSAA pricing'",
  "labor_rate_per_hour": 95.00,
  "items": {
    "<SKU>": {
      "unit_cost": <number>,
      "msrp": <number>,
      "notes": "<optional>"
    }
  }
}
```

- **`schema_version`** — must be `1`. Bump if the shape changes.
- **`currency`** — ISO 4217 code (display only, no conversion).
- **`updated`** — ISO date string. Surfaced in the status indicator.
- **`labor_rate_per_hour`** — must be a **positive number** (must be `> 0`, not `0`). Composes with the hours-per-task `LABOR_RATES` constants in the app to compute labor cost.
- **`items`** — object keyed by SKU. Each item is an object with at least one of `unit_cost` / `msrp`. Both are non-negative numbers (zeros are allowed). The `notes` field is optional.

The `pricing-template.json` in this folder is a working example with placeholder values that passes validation, so you can load it as a sanity check before populating real prices.

## SKU matching

The `items` keys must match the catalog identifiers the tool uses internally. To find the real SKU strings:

```bash
grep -oP "'[a-z]+-[A-Z0-9]+'" camera_markup_tool.html | sort -u
```

Or open `camera_markup_tool.html` and search for the catalog constants directly:

- **Cameras** — `CAMERA_DB` (~line 2140), keyed like `'een-PB01'`, `'hwa-ANV-L7012R'`.
- **Access Control** — `BRIVO_CATALOG`.
- **Intercoms** — `INTERCOM_DB`.
- **Parcel lockers** — `PARCEL_DB`.
- **Mailbox banks** — `MAILBOX_DB`.

A pricing entry whose SKU doesn't match a catalog key won't error — it just won't surface on the BOM. Misspellings are silent.

## Why is this folder gitignored?

Vendor pricing is contractual and shouldn't appear in git history regardless of repo visibility. Keeping the entire folder gitignored (except this README and the template) eliminates the risk of an accidental commit revealing real numbers.

If you need to share a working `pricing.json` between machines, copy it manually (USB stick, secure share, password manager attachment) — don't push it through git.
