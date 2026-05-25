#!/usr/bin/env python3
"""
build_pricing_json.py — Convert the Brivo/Eagle Eye reseller price list .xlsx
into the tool's Pricing Book schema (v1).

Schema (from camera_markup_tool.html validatePricingBook):
  {
    schema_version: 1,
    currency: "CAD",
    updated: "<ISO date>",
    notes: "...",
    labor_rate_per_hour: <positive number>,
    items: { "<SKU>": { unit_cost: <colE>, msrp: <colD>, notes: <colC/F> } }
  }

Decisions baked in (confirmed with user):
  - cost basis = col E (Reseller L3 CDN) -> unit_cost
  - col D (North America Price CDN, list) -> msrp
  - include ALL data rows from BOTH equipment sheets (Access + Video).
    Camera SKU scheme mismatch (een-* vs EN-*) handled tool-side later;
    unmatched SKUs simply never get looked up. Including them costs nothing.
  - data row = col A non-empty AND col E is numeric.
    Section-header rows (text in A, empty D/E) are skipped.
"""
import openpyxl
import json
import os
import sys

# Repo-relative defaults. Run from source-data/ with the .xlsx alongside, or
# pass paths explicitly:  python build_pricing_json.py [SRC.xlsx] [OUT.json]
_HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(_HERE, '27_3_Brivo_Price_List_NA1_Reseller_L3_CDN_20260401.xlsx')
OUT = os.path.join(_HERE, 'pricing.json')
if len(sys.argv) > 1: SRC = sys.argv[1]
if len(sys.argv) > 2: OUT = sys.argv[2]

EQUIPMENT_SHEETS = ['Access Reseller - NA1 L3', 'Video Reseller - NA1 L3']

# Price-list effective date (from sheet preamble "Effective 2026-04-01").
PRICE_LIST_DATE = '2026-04-01'
# labor_rate_per_hour is REQUIRED + must be positive by the validator, but is
# NOT in the price list. Placeholder the user edits; flagged in notes.
LABOR_RATE_PLACEHOLDER = 95.00


def num(v):
    return v if isinstance(v, (int, float)) else None


def build():
    wb = openpyxl.load_workbook(SRC, data_only=True)
    items = {}
    stats = {'data_rows': 0, 'skipped_no_price': 0, 'dups': 0, 'per_sheet': {}}

    for name in EQUIPMENT_SHEETS:
        ws = wb[name]
        sheet_count = 0
        for r in range(1, ws.max_row + 1):
            a = ws.cell(row=r, column=1).value          # SKU
            b = ws.cell(row=r, column=2).value          # description
            c = ws.cell(row=r, column=3).value          # spec/sub-desc
            d = num(ws.cell(row=r, column=4).value)     # list (CDN) -> msrp
            e = num(ws.cell(row=r, column=5).value)     # Reseller L3 -> unit_cost
            f = ws.cell(row=r, column=6).value          # notes

            if a is None:
                continue
            sku = str(a).strip()
            if not sku:
                continue
            # Data row requires a numeric reseller price (col E). Section
            # headers have text in A but empty D/E -> skipped here.
            if e is None and d is None:
                continue
            if e is None:
                # has list but no reseller price: keep with msrp only
                stats['skipped_no_price'] += 1

            item = {}
            if e is not None:
                item['unit_cost'] = round(float(e), 2)
            if d is not None:
                item['msrp'] = round(float(d), 2)

            # notes: prefer the price-list "notes" col F, fall back to spec col C.
            note_parts = []
            if isinstance(f, str) and f.strip():
                note_parts.append(f.strip())
            if isinstance(c, str) and c.strip():
                note_parts.append(c.strip())
            desc = (str(b).strip() if isinstance(b, str) else '')
            # Put the human-readable description first in notes so a user
            # eyeballing the JSON can identify the SKU.
            full_note = desc
            if note_parts:
                full_note = (desc + ' — ' if desc else '') + ' · '.join(note_parts)
            if full_note:
                item['notes'] = full_note

            if sku in items:
                stats['dups'] += 1
            items[sku] = item
            sheet_count += 1
            stats['data_rows'] += 1
        stats['per_sheet'][name] = sheet_count

    book = {
        'schema_version': 1,
        'currency': 'CAD',
        'updated': PRICE_LIST_DATE,
        'notes': ('Generated from 27_3_Brivo_Price_List_NA1_Reseller_L3_CDN_20260401.xlsx. '
                  'unit_cost = Reseller L3 (CDN). msrp = North America Price (CDN, list). '
                  'labor_rate_per_hour is a PLACEHOLDER (' + str(LABOR_RATE_PLACEHOLDER) +
                  ') — not in the price list; edit to your real rate.'),
        'labor_rate_per_hour': LABOR_RATE_PLACEHOLDER,
        'items': items,
    }
    return book, stats


def main():
    book, stats = build()
    with open(OUT, 'w') as fh:
        json.dump(book, fh, indent=2, ensure_ascii=False)
    print('Wrote', OUT)
    print('items:', len(book['items']))
    print('stats:', json.dumps(stats, indent=2))


if __name__ == '__main__':
    main()
