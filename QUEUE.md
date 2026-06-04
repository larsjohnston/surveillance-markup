# QUEUE.md — Smart Building Markup & Quoting Tool

## Shipped (recent)
- PR #31: DHW Labour step redesign — SQ-style top strip (supply-only pill, Default Labour Flat/Hourly pills, project rate inputs in both modes), per-section mode-only pills, Catalog#->SKU, column-hide button (Convention B). Flat ext = matQty x rate; Hourly ext = matQty x hours x rate. B-lite per-mode project rate buckets (projectLabourRule.hourly/.flat) via _dhwResolveProjectRates across Labour/Summary/PDF. Save v27->28 + migration. Description default-hidden; supply-only notice removed.
- PR #30: DHW + SQ wizard step scroll-to-top on Back/Continue/stepper-click; DHW Labour footer un-stuck + reworded "Labour Sub-Total:".
- PR #28: DHW dashboard relocated to left-pane Tier-1 tiles; Export RFQ -> wizard header; Add-to-Proposal -> wizard Save; .xlsx takeoff import.

## Immediate queue
1. SQ Labour mirror (M2) — port the DHW Labour M1 redesign to SQ Labour (recalcLabour, grid-based table, Convention A data-col tagging): same column set (Qty/SKU/Description/Hours/Cost/Sell/Ext Cost/Ext Sell/Margin $/GM %), default-hidden Ext Cost/Ext Sell/GM%/Description, column-hide button, Flat = matQty x rate / Hourly = matQty x hours x rate. Note: SQ Summary labourQty math (uses raw lineRule.qty, no matQty multiplier) diverges from Labour step — reconcile or confirm intentional.
2. Cleanup sweep (accumulated): delete orphaned #hardware-home markup + renderHardwareHome/_hwHomeRenderTile/_dhwRefreshHomeIfVisible + _hwSavedScroll mechanism; orphaned .dhw-supply-notice CSS; stale v27 comments (L5045/5046/19104); dead _dhwSetSectionLabourCost/_dhwSetSectionLabourSell setters (no UI writes them post-M1); unused hoursHeading var in _dhwRenderStep3Labour.
3. Pricing M2: wire SKU->price-book lookup into computeAutoRows wrapper; _stripOhPrefix + _normalizeBomKey helpers; hoisted single price-book read per compute pass; override-wins ordering.
4. Camera SKU crosswalk (een-* tool keys -> EN-* price list keys).
5. Credentials/materials model expansion (Pass 2 pricing).
6. Spec-map slice: Groups B/C/D BOM rows.

## Backlog
- Reusable makeColumnHidePopover factory — de-dupe the now-4 column-hide instances (DHW Pricing, DHW Summary, SQ Summary, DHW Labour) + SQ Labour once M2 ships.
- PDF scale-marker auto-recognition.
- Manual cable routing + conduit.
