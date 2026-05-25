# Pass: Customer BOM export page (Qty · SKU · Description, PDF-only, no pricing)

## Context / reframe

The on-screen "BOM" drawer is actually the **SECURITY QUOTE** — an internal priced workspace.
Pricing stays, untouched this pass.

The proposal-export "Bill of Materials" PDF page is a **CUSTOMER-facing spec sheet**: NO
pricing, just Qty + SKU + Description. This pass changes only the PDF page + renames the
on-screen drawer's user-facing label.

---

## M1 — Rename (user-facing strings only)

- On-screen drawer header + the Proposal/View menu item that opens it:
  **"Bill of Materials" → "Security Quote"**.
- Do NOT rename code symbols (`#bom-drawer`, `computeBomTree`, `recalcBom`, `drawProposalBOM`,
  etc.) — high churn, zero function gain. Strings only.
- The PDF export page TITLE stays **"Bill of Materials"** (customer doc). Don't rename that.

---

## M2 — Customer BOM PDF page rewrite (`drawProposalBOM`, ~html:14145)

- Replace the 4-column (Description / Qty / Unit / Total) row layout with a **TWO-LINE row**:
  - **line 1** (bold, larger): `<SKU>   ·   Qty <n>`
  - **line 2** (regular): `<full description / justification>` (the existing row desc)
- **REMOVE** from this PDF page:
  - the Unit Price column,
  - the Line Total column,
  - the entire Subtotal / Margin / Tax / Grand Total block.
  - Customer BOM shows no money.
- **KEEP**:
  - the tier-1 / tier-2 hierarchy (5 majors + subs),
  - the hide-empty rule,
  - the orphan guard,
  - the Unclassified group.
  - Just the row format + no-pricing changes.
- **Larger font**: bump row text up (line-1 SKU+Qty bold ~11pt, line-2 desc ~10pt — adjust to
  taste).
- Add `bomRowSku(row)` helper for the SKU:
  - **cameras** → model/catalog key (`cam.model` is the sku)
  - **AC** → parse from `auto-ac-<SKU>` key (or the existing "— SKU" suffix `bomDisplayDesc`
    isolates)
  - **intercom** → from `auto-sa-intercom-<SKU>` key / `INTERCOM_DB` model
  - **parcel** → from `auto-sa-parcel-<SKU>` key / `PARCEL_DB` model
  - **DHW** → the takeoff line `catalogNumber` (attach `sku` to `dhwBomRows()` output — one-line
    add, OK)
  - **mailbox / in-unit IoT / derived recording+network / custom lines** → NO sku: show a short
    type label on line 1 instead (e.g. `MAILBOX BANK`, `SMART LOCK`, `NVR (derived)`) so every
    row keeps the two-line shape. **Never a blank top line.**

GREP the actual camera + AC row key/field formats before writing the helper — confirm, don't
assume the key strings above.

---

## DO NOT TOUCH

- `recalcBom` / the on-screen drawer rendering (that's the Security Quote — stays priced).
- `exportBomCSV` (CSV stays priced, belongs to the Security Quote — leave M8's tier columns +
  prices).
- The proposal cover (`drawProposalCover`) — separate branch owns it.

---

## KNOWN, OUT OF SCOPE (flag, don't fix)

The cover GRAND TOTAL sums the tree × margin/tax and will show $0 until Pass 2 (Security Quote
pricing) wires a real price book. Not this pass's problem; the cover branch / Pass 2 handles it.

---

## CLAUDE.md compliance

- Vanilla JS, `var` only, single file, no new deps.
- Compute / render only — no schema change, no version bump.
- `node --check` after each edit.
- Step report per CLAUDE.md (verify "retained X" by grep).
- Commit after each milestone's browser review.
