# Pass: Access Control Credentials — wire to price book + fix qty modal

*Slots after **Pricing Vendor Expansion** (Brivo book must be loadable for SKUs to resolve), before **M5 (persistence)**.*

## Context

The AC left-pane Tier 2 already exposes credential tiles (Fobs / Cards / etc.). They're currently disconnected from the price book — clicking a tile opens a qty modal, but:

1. The catalog has no entries — selections don't add real rows to the BOM with a SKU + price.
2. **The OK button on the qty modal doesn't work** (clicking does nothing; typing a qty has no commit path). Bug to fix in this pass.

Today the BOM emits a derived `auto-ac-credentials` row sized by reader count (count of placed readers). That stub disappears once real per-SKU credential selection lands.

## What this pass adds

1. **`BRIVO_CRED_CATALOG`** — hardcoded catalog constant keyed by vendor SKU, carrying the 11 Brivo credential SKUs identified from the Brivo price book (tab "Access Reseller - NA1 L3", rows 317–327). Identity + a `code:` short label per Tier-3 conventions. **NO prices** in the catalog — those come from `getUnitPrice(sku)` at runtime.
2. **AC Tier 2 → Tier 3 wiring** — clicking a Tier 2 credential tile expands a Tier 3 grid of the catalog entries that match that family (Cards / Fobs / Dual-Tech / Custom / Punch-Service).
3. **Right-panel selection UI** — clicking a Tier 3 SKU tile opens the right panel showing description, list/cost, qty input, and an **Add to Quote** button. Click adds (or increments) a row in BOM section 2.1 with that SKU.
4. **Qty-modal bug fix** — the broken OK button: identify why the handler doesn't fire, restore commit. (Even after the right-panel flow lands, the modal will likely remain as the inline editor for existing rows. Confirm in recon.)
5. **Remove the derived `auto-ac-credentials` stub** — once real credential rows can be added, the reader-count-sized placeholder row goes away (Materials side no longer emits it). Per-row computeAutoRows site to delete.
6. **Right-panel info for special SKUs** — `*-Custom` and `*-Punch-*` entries display a "Brivo Custom Order Form required" note in the right panel.

## What this pass does NOT add

- **Mobile Passes** — Brivo Mobile Credentials are subscription-billed (separate page in the Brivo book, not in rows 317–327). Subscription line items don't fit the per-unit catalog model. Mobile passes get their own separate brief once the subscription model is designed (recommend: standalone "Subscription line items" pass, post-M5).
- HID credentials (rows 328–330) — flagged but deferred (would expand catalog scope; not in current SKU list).
- Per-resident allocation logic — credentials are a project-level qty input; no per-unit-type or per-suite breakdown.
- Catalog hand-edits for non-Brivo credentials (HID, Schlage, etc.) — wait for vendor request.

## Catalog entries (11 SKUs — pulled from Brivo price book row 316 header "Brivo Access Credentials", rows 317–327)

| SKU                 | Description                                                | List ($CAD) | Cost ($CAD) | Pack | Group       |
| ------------------- | ---------------------------------------------------------- | ----------- | ----------- | ---- | ----------- |
| `B-BUC3-37-SC50`    | Brivo Unified Smart Card EV3 37-Bit                        | 511.00      | 265.72      | 50   | Bulk card   |
| `B-BUC3-37-SF25`    | Brivo Unified Smart Keyfob EV3 37-Bit                      | 327.60      | 170.35      | 25   | Bulk fob    |
| `B-BUC3-37-SCP50`   | Brivo Unified Dual-Tech Smart Card + Prox EV3 37-Bit       | 742.00      | 385.84      | 50   | Bulk dual   |
| `B-BUC3-56-SC50`    | Brivo Unified Smart Card EV3 56-Bit                        | 511.00      | 265.72      | 50   | Bulk card   |
| `B-BUC3-56-SF25`    | Brivo Unified Smart Keyfob EV3 56-Bit                      | 327.60      | 170.35      | 25   | Bulk fob    |
| `B-BUC3-56-SCP50`   | Brivo Unified Dual-Tech Smart Card + Prox EV3 56-Bit       | 742.00      | 385.84      | 50   | Bulk dual   |
| `B-SC-Custom`       | Brivo Smart Card — Customer Specified Encryption / Lk Num  | 13.30       | 6.92        | 1    | Custom card |
| `B-SF-Custom`       | Brivo Smart Keyfob — Customer Specified Encryption         | 15.40       | 8.01        | 1    | Custom fob  |
| `B-SCP-Custom`      | Brivo Smart Card Dual-Tech — Customer Specified Encryption | 14.70       | 7.64        | 1    | Custom dual |
| `B-SC-Punch-V`      | Brivo Smart Card Pre-Punch Service (vertical)              | 1.04        | 0.54        | 1    | Service     |
| `B-SC-Punch-H`      | Brivo Smart Card Pre-Punch Service (horizontal)            | 1.04        | 0.54        | 1    | Service     |

Prices live in the price book (loaded via `getUnitPrice` / `getListPrice`); catalog carries identity + spec only.

**Tier 2 → Tier 3 grouping (recommend):**
- Tier 2 **Cards** → Tier 3: `B-BUC3-37-SC50`, `B-BUC3-56-SC50`, `B-SC-Custom`
- Tier 2 **Fobs** → Tier 3: `B-BUC3-37-SF25`, `B-BUC3-56-SF25`, `B-SF-Custom`
- Tier 2 **Dual-Tech** → Tier 3: `B-BUC3-37-SCP50`, `B-BUC3-56-SCP50`, `B-SCP-Custom`
- Tier 2 **Pre-Punch Service** → Tier 3: `B-SC-Punch-V`, `B-SC-Punch-H`

Confirm Tier 2 layout in recon — depends on what's already on the AC panel today.

## Interaction model

Credentials are NOT placed on the canvas (no x/y placement). They're project-level qty entries. So the interaction breaks the standard "arm → place" model in one specific way:

- Tier 3 tile **click** → arm the SKU AND open the right panel showing description / list / cost / qty input / Add button.
- Right panel **Add to Quote** → adds (or increments) a row in BOM section 2.1 with `{sku, qty, source:'credentials'}`.
- Qty defaults to 1 (the catalog pack size is reflected in the description, not multiplied — user types pack count).
- BOM row in 2.1 reads cost via `getUnitPrice(sku)`, list via `getListPrice(sku)`, Sell via the section's pricing rule (identical to other auto rows).
- Re-clicking a Tier 3 tile that's already armed re-opens the right panel for that SKU (qty editable from there too via an edit affordance on the existing BOM row).

**No canvas placement, no canvas marker.** Credentials never show up on the floorplan view.

## Save shape

Add `bom.credentials` to the existing `bom.config` envelope as a sparse map:

```js
bom.credentials = {
  '<SKU>': qty,
  // ...
}
```

Loaded back into the credential row generator in `applyProjectState`. Additive; older files load cleanly with empty credentials.

(Persistence wires in alongside M5's other save-shape changes — recommend keeping save-shape in M5 even though catalog + UI land here.)

## Recon items (recon-gate the implementation)

1. **Current AC Tier 2 structure** — what tiles exist today on the AC panel between readers/controllers and the credential entry? Quote the markup + the `pickAccessoryTier2`-equivalent dispatcher for AC. (Verify the tier mapping — credential tiles may be Tier 2 OR a sub-panel.)
2. **Current qty modal** — where does it open from, what markup, what's the OK handler called and why isn't it firing? Quote the bug site.
3. **`auto-ac-credentials` derived row** — where does `computeAutoRows` emit it (cited at ~17914 in M2/M3 recons)? Confirm the delete site.
4. **Right-panel renderer for AC** — does an `openRightPanelForReader` or equivalent already exist? Confirm reuse pattern for a new credential SKU right panel.
5. **BOM 2.1 routing** — confirm credential rows route to 2.1 via the existing `auto-ac-*` key prefix or whether a new key prefix is needed.

## Open questions

- **Tier 2 layout for AC panel** — recommend 4 Tier-2 tiles for the credential family (Cards / Fobs / Dual-Tech / Pre-Punch); confirm in recon what's actually there today + whether to consolidate or expand.
- **Custom-encryption SKUs** — those require a Brivo Custom Order Form. Render a right-panel warning + a one-line note on the BOM row (e.g. " — order form required"). Confirm.
- **Mobile passes** — recommend deferred (subscription model). Confirm.

## Acceptance criteria

- 11 Brivo credential SKUs are selectable from the AC panel Tier 2/3 surface.
- Right panel opens on Tier 3 tile click with qty input + Add button.
- Add commits row to BOM 2.1 with real Cost + List from the loaded Brivo price book.
- Old derived `auto-ac-credentials` stub no longer emits.
- Qty modal OK button works.
- `node --check` passes. Save round-trip preserves credential qtys (in M5 — for this pass, in-memory only).
