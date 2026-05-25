# PASS — Pricing M2: wire getUnitPrice into the Security Quote (Group A) + cleanup fold

_Brief for Claude Code. Behavior-specified, not line-bound — the project-knowledge HTML copy lags `main` (override layer shows at 15084 here / CC reported ~17433; `bomRowSku` reported 14307–14324 but absent in the synced copy). **CC binds every edit to current `main` and confirms real line numbers before editing.**_

---

## Preconditions (do FIRST, report before any edit)
1. `git checkout main && git pull && git log -1 && git status` — open reply with `[HEAD | branch | tree]`.
2. **Overwrite the junk local QUEUE.md:** `git checkout QUEUE.md` (discard the dirty unstaged edit), then drop the regenerated `QUEUE.md` (provided separately) at repo root. Tree clean before cutting the branch.
3. Drop `source-data/build_pricing_json.py` + `source-data/pricing.json` (provided separately).
4. Cut branch `pricing-m2-wire` off clean `main`.
5. **Confirm on main and report:**
   - Current name of the BOM-tree compute function (`computeBomTree` vs `computeAutoRows`) and the exact shape of the override layer (the monkey-patch wrapper: `origCompute = X; X = function(){ ... rows[k].forEach(... bomAutoOverrides[r.key] ...) }`).
   - `bomRowSku(row)` real line range + verbatim body.
   - The verbatim 5 Group-A emit sites (current line numbers).

---

## Scope (LOCKED — do not expand)
- **Group A only** (5 sites): DHW `4090`, cameras `16356`, AC `16494`, intercom `16551`, parcel `16572` (stale line refs — bind to main).
- **Groups B/C/D stay at price-pending** ($0 / no-price marker). Synthetic spec-maps + catalog SKU mapping are a SEPARATE later slice. Do not build them here.
- Fold in: the small **cleanup pass** (latent UI/UX/visual sweep — scope confirmed at milestone start) + two override-orphan fixes (below).

## Decisions already settled (don't re-litigate)
- Ingestion = JSON path (Foundation M1–M4 shipped it). No SheetJS.
- Cost basis = `unit_cost` (Reseller L3). `getUnitPrice(sku)` defaults to `unit_cost`.
- Cameras price-pending in v1 (een-*/EE-* vs EN-* mismatch — crosswalk is a later slice).
- Brivo coverage = 14/14; that's the win this pass realizes.

---

## The wiring (one path, not five)
`bomRowSku(row)` already encodes the row→SKU routing for all 5 Group-A sites. **Reuse it. Do NOT touch the individual emit sites.**

**Insertion point:** the override-layer wrapper that iterates every row (`rows[k].forEach`). Inside that loop, **before** the existing `bomAutoOverrides` application, add a price-load step:

```javascript
// Load catalogue price first; user override (below) wins on top.
var skuInfo = bomRowSku(r);
if(skuInfo && skuInfo.sku){
  var p = getUnitPrice(skuInfo.sku);   // defaults to unit_cost; null if not loaded / no match
  if(p != null) r.unit = p;
}
// ... existing bomAutoOverrides[r.key] block stays exactly as-is, AFTER this ...
```

Ordering is the whole point: price loads → override (if any) overwrites. Group B/C/D rows return no sku from `bomRowSku` → `r.unit` stays 0 (price-pending). Group D (custom line, `addBomLine`) is untouched — user types the price.

**markDirty discipline:** this runs inside compute (render path), not a user mutation — do NOT call `markDirty()` here. Confirm against CLAUDE.md.

---

## Bug fixes (REQUIRED — same OH-key orphan class, fix together)

### Fix 1 — `bomRowSku` OH-strip
CC trace: for `auto-ac-oh-<SKU>` rows, `bomRowSku` does `key.slice('auto-ac-'.length)` → returns `oh-<SKU>` — not a valid pricing-book key, lookup misses silently. Strip the `oh-` infix so flagged AC rows resolve to the bare `<SKU>` (same price as the unflagged row — overhead-door flag is a routing/grouping concern, not a different part).
- In the `auto-ac-` branch: after slicing the prefix, if the remainder starts with `oh-`, strip that too. Net: both `auto-ac-<SKU>` and `auto-ac-oh-<SKU>` → `<SKU>`.

### Fix 2 — `bomAutoOverrides` flag-flip orphan
Flagging a device flips its row key `auto-ac-<SKU>` → `auto-ac-oh-<SKU>`, orphaning any unit-price override stored under the old key. Inert at unit:0; a real bug now that prices are non-zero.
- **Rec:** key overrides by a normalized identity that's stable across the flag flip. Simplest: when reading/writing `bomAutoOverrides`, normalize the key by stripping the `oh-` infix (mirror Fix 1) so flagged/unflagged share one override entry. Confirm this matches how `updateAutoRow` writes keys (it uses `row.dataset.key` = the full row key). If a shared override is wrong UX (user may want different override per flag state), fall back to: on flag flip, migrate the override entry old-key→new-key. **CC: state which you implemented and why.**

---

## Coverage report (deliverable)
After wiring, with `pricing.json` loaded, dump per-Group-A-source: how many distinct SKUs emitted, how many hit a price, which missed. Expected shape:
- DHW: depends on takeoff catalog numbers vs price-list (likely partial — DHW prices are RFQ, NOT in this list; many will miss, that's expected).
- Cameras: 0 hit (pending crosswalk).
- AC: high hit rate (Brivo B-*).
- Intercom: depends on INTERCOM_DB keys vs price-list (`DB-*` Doorbird likely not in Brivo list — may miss).
- Parcel: 0 hit (placeholder SKUs).
**Surface this in the milestone report — don't trust the lookup blind.** The headline number is AC/Brivo hitting; the rest legitimately pending.

---

## Save schema
Pricing lives in its own localStorage key (`pricingBook`), separate from the project save (v21). **Likely NO project-save bump needed** — the wiring reads prices at compute time, doesn't persist them in project state. `bomAutoOverrides` already persists in project save (pre-existing). Confirm nothing new needs persisting before touching v21. **Default: no bump.**

---

## Milestone plan (propose, then STOP for user approval before edits)
- **M1** — preconditions: branch cut, files dropped, pricing.json load-tested green in browser, main-line confirmations reported.
- **M2** — `bomRowSku` OH-strip (Fix 1) + unit test the 5 Group-A SKU resolutions by hand.
- **M3** — lookup pass in the override wrapper; browser-verify AC/Brivo rows show real unit/line/total; cover GRAND TOTAL non-zero. Commit after review.
- **M4** — `bomAutoOverrides` flag-flip fix (Fix 2). Commit after review.
- **M5** — coverage report dump.
- **M6** — cleanup pass (latent UI/UX/visual sweep; scope confirmed here).
- Fold this brief into the closing commit's `git add`.

**Verify after each edit:** `node --check` on the script block. Browser-review each milestone before committing — don't defer.
