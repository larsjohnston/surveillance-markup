# Pass: Overhead Door — per-device section flag + OH credential types

## Context

§2.2 "Overhead Door Control" is currently populated by the INTERIM `OVERHEAD_DOOR_SKUS` allowlist
(hardcoded in `bom-restructure-v2`) — a band-aid for the missing user-controlled section assignment.
This pass replaces that with two real, user-driven mechanisms:

1. **A per-device "For use with Overhead Door" checkbox** on the right panel — the targeted first
   instance of data-driven section assignment. A flagged placed AC device routes its BOM row to
   2.2 instead of 2.1.
2. **Two new credential types** (OH Transmitters, OH Receiver) entered via the credentials tile,
   routed to 2.2 — the car fobs/receiver that open the overhead door.

When this lands, the `OVERHEAD_DOOR_SKUS` allowlist is REMOVED — the checkbox (for placed
controllers/readers) + the OH credential types (for transmitter/receiver) cover everything it was
hardcoding.

**Dependencies / sequencing:**
- Part A (checkbox) needs `bom-restructure-v2` on main (defines 2.1/2.2).
- Part B (OH credential types) needs the credentials-entry pass (the tile/modal/type-mapping
  infrastructure). **Recommend folding Part B INTO the credentials-entry pass** (it's 2 more tiles +
  2 more type→section mappings — same mechanism), and keeping Part A as this standalone pass.

---

## Part A — "For use with Overhead Door" device checkbox

### Right-panel field
- Add a checkbox to the `.rp-reader-fields` block in `#right-panel`: label **"For use with Overhead
  Door"**. Shows when a placed AC device (reader or controller) is selected.
- Applies to all placed AC devices (readers + controllers) — confirm both surface in the reader-mode
  right panel; if controllers have a separate path, add it there too.

### Persistence
- Store as a boolean on the placed device object: `dev.overheadDoor` (default false).
- `markDirty()` on toggle + recalc BOM.
- **Bump save version + backfill** (older saves: missing flag defaults false → all current devices
  stay in 2.1, no behavior change until the user opts in).

### BOM grouping + routing (the tricky part)
- `computeAutoRows` AC grouping currently keys `acGroups` by SKU alone (~html:14363). A flagged and
  an unflagged device of the SAME SKU must produce SEPARATE rows (one → 2.2, one → 2.1). So extend
  the group key to `sku + '|' + (dev.overheadDoor ? 'OH' : '')`.
- Emit the OH-flagged group with a distinguishable key (e.g. `auto-ac-oh-<SKU>`) and/or an
  `overheadDoor: true` field on the row.
- `computeBomTree` routing: AC rows with the OH marker → **2.2 Overhead Door Control**; all other AC
  rows → 2.1. (Credentials row still → 2.1.)
- **REMOVE `OVERHEAD_DOOR_SKUS`** and its routing branch from `computeBomTree` — the checkbox is now
  the signal for placed devices. Confirm nothing else references the const.

### Guard interaction
- The M7 security-hardware dedup guard already keeps strike/REX/contact rows out of 2.1/2.3. OH-flag
  routing is additive and shouldn't interact, but verify a flagged row still can't smuggle a
  security-hardware token anywhere it shouldn't (it routes to 2.2, which is fine — those are
  overhead-door control devices, not §5.1 security hardware).

---

## Part B — OH credential types (fold into the credentials-entry pass)

Extend the credentials section from 3 tiles to **5**:
- Fobs, Cards, Mobile Passes → route to **2.1 Access Control** (general building credentials)
- **OH Transmitters, OH Receiver** → route to **2.2 Overhead Door Control** (the car fobs +
  long-range receiver that open the overhead door)

Implementation = the same as the credentials-entry brief, with the type→section mapping made
non-uniform: most credential types → 2.1, the two OH types → 2.2. Keep this mapping in the ONE
credential-type→row helper so it stays a single source. Placeholder descriptions until catalogue
(e.g. "Overhead Door Transmitter (2-button)", "Overhead Door Long-Range Receiver"), `unit: 0`.

---

## Design / constraints
- Checkbox styled to match existing right-panel field controls (don't invent a new control style).
- Flat-icon tiles for the credential types, consistent with the set.
- Vanilla JS, `var` only, single file, no new deps. `markDirty()` discipline. node --check.
- Both the on-screen Security Quote drawer and the BOM PDF reflect the routing automatically (shared
  `computeBomTree`) — verify both.

---

## Open decisions (confirm at approval)
1. **D1 — checkbox scope:** readers + controllers (all placed AC devices). Rec: yes.
2. **D2 — OH credentials → 2.2** (not 2.1): they're the overhead-door access method. Rec: yes.
3. **D3 — fold Part B into the credentials-entry pass** vs separate. Rec: fold (same mechanism).
4. **D4 — remove `OVERHEAD_DOOR_SKUS`** when the checkbox lands. Rec: yes — checkbox + OH credential
   types cover everything it hardcoded.
5. **D5 — group-key split by OH flag** (required for correct routing). Rec: yes; `sku + OH-flag`.

---

## Note on the bigger picture
The "For use with Overhead Door" checkbox is the FIRST concrete instance of user-controlled,
data-driven section assignment. The general version (every material carries an editable `section`
field, any item reassignable) is still the larger materials-model work folded into Pass 2 pricing.
This pass solves the one case (overhead door) cleanly without building the full general mechanism —
but design `dev.overheadDoor` so it could later generalize to a `dev.sectionOverride` if that
direction is taken.
