# Feature Spec: Door Hardware Module (Import → Quote → Price → Proposal)

## Context

Add a door-hardware quoting pipeline to the tool. The user is a lock-and-safe shop
quoting the hardware package on a multi-family job. They receive a hardware **takeoff**
(the Allegion/Overtur pre-construction quantity report), send it to one or more
**suppliers** for pricing, import the priced **quotes** back, compare them, apply a
**markup** over supplier cost, optionally add **install labour**, and drop the result
into the **proposal** as its own DOOR HARDWARE bill of materials (which may fold into a
master BOM in a later iteration).

There is **no on-canvas placement and no authoring** in this module. Doors are not
placed on the floor plan; hardware sets are not built by hand. The schedule already
exists — this module imports it, prices it, and proposes it. Placement-driven authoring
is a deliberately separate future module; do not build it, but keep the data structured
so it could later write into the same DOOR HARDWARE section.

## The key insight: takeoff and quote are one document in two states

The takeoff and a returned quote are the **same Allegion template**:

- **Unpriced** (takeoff): columns are Extended Qty · UoM · Description · Catalog Number ·
  Cut Sheet · Finish, grouped by manufacturer code (`FAL`, `IVE`, `ZER`, …).
- **Priced** (quote): a supplier fills in additional **LIST · COST · TOTAL** columns on
  the same rows. (Confirmed: the CC Craig quote is literally the takeoff with those
  three columns added.)

So **one parser handles both.** If the cost columns are present, it's a quote; if
absent, it's an unpriced takeoff. Match a quote's lines back to the takeoff by
`catalogNumber + finish` (rows align exactly because it's the same sheet).

A supplier's *own ERP format* (e.g. the BG Distribution PDF, with different SKU notation
and layout) is **out of scope for v1** — attach it as a reference document; don't parse
it. Fuzzy SKU reconciliation across vendor formats is a later problem.

## Resolved decisions

1. **Import only.** No placement/authoring (queued future module).
2. **Manufacturer free-text** with the nine known codes as autocomplete seeds; importer
   carries whatever code it finds verbatim, never validates against a list.
3. **Project-level storage only.** No cross-project hardware/quote library.
4. **CSV import for v1.** Honors the single-file / no-new-dependencies convention. The
   native artifacts are XLSX, so the user saves the takeoff/quote as CSV before import.
   XLSX import is the obvious fast-follow (needs a parser dependency — defer).
5. **Door schedule = embedded reference PDF page**, not parsed. The architectural door
   schedule arrives as a CAD vector PDF with no text layer; rasterize the page and place
   it in the proposal as reference. No OCR.
6. **Two-view quote comparison** (below); award basis can be whole-supplier or best-line.
7. **Markup applies on supplier COST** (not list). Project-default % with per-line
   override.
8. **Install labour** = install-hours per line × hourly rate, with an include/exclude
   toggle (matches the takeoff's own "populate Hourly Rate / Install Hours Per Item"
   prompt).

## Where it lives

### Door Hardware manager (no rail mode)
Because nothing is placed on the canvas, the module is a **manager dialog**, reachable
from the menu (e.g. **Proposal → Door Hardware…**). It contains: the imported takeoff,
the list of imported quotes, the comparison views, markup/labour settings, and the award
selection. No seventh left-rail mode is added.

### Menu actions
- **File → Import Hardware Takeoff (CSV)** — loads the unpriced Allegion template.
- **File → Export RFQ (CSV)** — emits the takeoff line set with blank price columns to
  send to a supplier.
- **File → Import Hardware Quote (CSV)** — loads a priced template; prompts for a
  supplier name; can be called multiple times to add multiple quotes.
- **File → Attach Door Schedule (PDF)** — stores the door-schedule PDF as a reference.

### BOM
A new **DOOR HARDWARE** section, after ACCESS CONTROL, before LABOR. Rows are the awarded
hardware lines at **sell** price (see pricing). Optional install-labour lines attach
here too (toggleable), pending a future merge into a master BOM.

### Proposal PDF
Page order:

1. Cover page
2. Bill of Materials
3. Riser Diagram
4. **Hardware Schedule** ← new (sell pricing)
5. **Door Schedule (reference)** ← new (embedded PDF page)
6. Floor plan markups

Two new checkboxes in **Project Settings → Proposal Sections** (`☑ Hardware Schedule`,
`☑ Door Schedule`, both default ON). Toggling either off omits its page without breaking
page numbers or the cover-page summary, identical to the existing toggles. If no takeoff
is imported, the Hardware Schedule page is omitted; if no door-schedule PDF is attached,
the Door Schedule page is omitted.

## The importer (CSV)

Parses the Allegion template shape:

- **Header block** to skip: Project Name, Architect Name, Project Id, Allegion Id,
  Version, Report Date.
- **Manufacturer group headers**: a lone short token row (`FAL`, `IVE`, `ZER`, or the
  literal `NO MANUFACTURER LISTED` → group `OTHER`). Applies to following line rows.
- **Repeated column-header rows** to skip (`Extended Qty | UoM | Description | …`).
- **Trailing instruction note** to skip ("Populate the Hourly Rate…").
- **Line rows**: capture extended qty, UoM, description, catalog number, finish, and —
  if present — LIST and COST. Carry the Cut Sheet column as a boolean only.

Tolerant parsing: blank rows skipped, qty-0 rows kept but de-emphasized, missing
finish/UoM allowed, unknown manufacturer codes preserved as their own group.

**Do not trust a supplier's TOTAL column.** Always recompute `extendedCost = qty ×
unitCost`. If the supplier's TOTAL is present and disagrees beyond a small rounding
tolerance, flag the line. (Real example from the CC Craig quote: its entire FAL block
computes `total = cost + qty` instead of `qty × cost`, so 111 passage sets at $49.11
read as a $160 line total instead of ~$5,451, and the sheet's grand total is badly
understated. The tool must catch this and surface a per-line warning + a count.)

## Multi-quote comparison

Multiple quotes per project, each tagged with a supplier name. The comparison screen has
two views:

### View 1 — By Supplier (whole package)
One row per imported quote. Columns: supplier, recomputed package cost (Σ qty × unit
cost), **coverage** (# of takeoff lines the supplier actually priced vs left blank/zero),
and a count of flagged lines (total mismatches, gaps). An **"Award whole package"** action
per supplier. Coverage matters because suppliers leave gaps — e.g. the KNC track line
came back unpriced in one quote; awarding a supplier who didn't price every line must
surface those holes rather than silently zero them.

### View 2 — Best by Line
One row per takeoff line; one column per supplier showing that supplier's recomputed unit
cost; the lowest is highlighted. A trailing column picks the per-line minimum and a
blended "best-line total." An **"Award best line"** action takes the cheapest valid quote
for each line (lines no one priced are flagged, not zeroed).

**Award basis** is stored on the project: either `whole:<supplierId>` or `bestLine`. The
awarded **unit cost per line** is what flows into pricing. (Note: best-line awarding
implies splitting the PO across suppliers — that's accepted, but the proposal/BOM should
make the per-line awarded supplier visible internally.)

## Pricing

For each awarded line:

```
unitCost   = awarded supplier's recomputed unit cost
markup%    = line override, else project default
unitSell   = unitCost × (1 + markup% / 100)
extSell    = qty × unitSell
```

- **Project-default markup %** lives in the manager (and persists). Per-line override
  allowed.
- LIST is retained for reference / optional "list vs sell" display but is **not** the
  markup basis.
- The customer-facing proposal shows **sell** prices only. Cost, markup, list, supplier
  comparison, and flagged-line warnings are **internal** to the manager — never printed
  on the proposal.

## Install labour (optional)

- Each hardware line carries an optional **install hours** value, entered **per line**
  (the hours to install that whole line item, not per unit), editable in the manager;
  default 0.
- Project-level **hourly rate**.
- `labourTotal = Σ(lineInstallHours) × hourlyRate` (per-line hours, summed across lines;
  quantity is **not** a multiplier).
- An **include-labour** toggle. When on, labour appears as line(s) tied to the hardware
  module (for now in/under the DOOR HARDWARE section; later merges into master LABOR).
- This is the natural pairing with the takeoff's "Install Hours Per Item" prompt.

## DOOR HARDWARE BOM rendering

Group by manufacturer (conventional order, unknowns trailing), report order preserved
within each group. Internal manager view columns: Qty · Description · Catalog # · Finish ·
Awarded supplier · Unit cost · Markup% · Unit sell · Ext sell, plus warning markers.
The proposal Hardware Schedule page shows the customer-facing subset: Qty · Description ·
Catalog # · Finish · Unit sell · Ext sell, grouped, with a self-describing project header
(name / architect / date pulled from the takeoff). Multi-page overflow reuses the riser
table helpers.

## Door Schedule reference page

Rasterize the attached door-schedule PDF page(s) to image(s) and place full-page in the
proposal as the Door Schedule (reference) section. No parsing, no extraction — it's a
faithful reference copy so the customer/installer can see opening numbers, sizes, fire
ratings, and the hardware-type matrix.

## Persistence

Project JSON gains:
- `importedTakeoff`: source-header fields + ordered line array `{ manufacturer, qty,
  uom, description, catalogNumber, finish, hasCutSheet }`.
- `hardwareQuotes[]`: each `{ supplierName, importedAt, lines: [{ catalogNumber, finish,
  list, unitCost, supplierTotal, flagged }] }`.
- `hardwareAward`: `{ basis: 'whole'|'bestLine', supplierId? }`.
- `hardwarePricing`: `{ defaultMarkupPct, lineMarkupOverrides{}, includeLabour,
  hourlyRate, lineInstallHours{} }`.
- `doorScheduleRef`: the attached PDF (or a reference to it).
- `projectInfo.proposalSections` gains `hardwareSchedule: true`, `doorSchedule: true`.

Backwards compatibility: older files without these fields load cleanly — no takeoff →
no hardware section/page; missing toggles default ON but produce nothing when there's no
content. Saving upgrades the file.

## What to skip for now (state to the user during build)

- **Placement / authoring** — no openings, markers, mode, or hardware-set editor.
- **Supplier ERP-format quote parsing** (e.g. the BG PDF) — attach as reference only.
- **Supplier direct-entry / portal** ("let suppliers enter pricing in our software") —
  that's a multi-user/online feature, a separate future track.
- **XLSX import** — CSV only in v1 (save-as-CSV first); XLSX is fast-follow.
- **Master BOM merge** — DOOR HARDWARE stays its own section now; structure the data so
  a later rollup is a merge, not a rewrite.
- **Keying schedule** — `X C KEYWAY X GMK` rides along as opaque catalog text.
- **Door/frame schedule logic** — fire rating etc. are reference-only via the embedded
  PDF.
- **Cut-sheet resolution/attachment** — boolean flag only.
- **Auto cross-reference to Access Control** — surface an advisory note that some lines
  (electric strikes, credential readers, power supplies, door contacts, wire harnesses)
  look like AC/Division-28 hardware so they aren't double-counted; do not auto-link.

## Acceptance criteria

1. ☑ Import Hardware Takeoff (CSV) parses the Allegion template (header block,
   manufacturer groups, repeated headers, trailing note) into grouped line rows.
2. ☑ Export RFQ (CSV) emits the takeoff lines with blank price columns.
3. ☑ Import Hardware Quote (CSV) loads a priced template, tagged with a supplier name;
   multiple quotes can coexist; lines match the takeoff by catalog # + finish.
4. ☑ Supplier TOTAL columns are ignored; extended cost is recomputed; lines whose
   supplier total disagrees are flagged with a visible count (verified against the CC
   Craig FAL-block error).
5. ☑ Comparison screen shows both views — whole-package cost per supplier (with coverage
   and flag counts) and best-line-across-suppliers — and an award can be set either way.
6. ☑ The awarded unit cost flows into pricing; sell = cost × (1 + markup%); project
   default markup with per-line override; proposal shows sell only, never cost/markup.
7. ☑ Optional install labour: per-line install hours × hourly rate (qty not a
   multiplier), with an include/exclude toggle.
8. ☑ A DOOR HARDWARE BOM section renders awarded sell pricing grouped by manufacturer;
   the proposal Hardware Schedule page shows the customer-facing subset with overflow.
9. ☑ The attached door-schedule PDF renders as an embedded reference page; both new
   proposal toggles work without breaking page numbers.
10. ☑ Project JSON round-trips takeoff, quotes, award, pricing, labour, and the door-
    schedule reference; older files load cleanly.

## Implementation hints

- Keep all module code in its own clearly-named section (e.g.
  `// ─── Door Hardware (Import / Quote / Price) ───`). Don't tangle with floor-plan or
  riser rendering.
- Vanilla JS, `var`, single HTML file, no new dependencies (hence CSV, not XLSX).
- Reuse the riser's jsPDF table/overflow helpers for the Hardware Schedule page.
- Door-schedule embed: rasterize the source PDF page to PNG and `addImage` into jsPDF
  (the source is vector CAD with no text layer; an image copy is the faithful path).
- Match keys: normalize catalog number (trim, collapse whitespace, upper-case) + finish.
- After implementing: JS syntax check, then open the HTML in a browser to verify nothing
  else broke.

## Test data

Three real fixtures for this project (Westmount Apartments):
- **Takeoff**: the unpriced Allegion report (`Pre-construction Quantity … WESTMOUNT`).
- **Quote A — CC Craig** (CSV of the XLSX): same template + LIST/COST/TOTAL; use it to
  verify the recompute/flag logic (its FAL block totals are wrong).
- **Quote B — BG Distribution** (PDF, supplier ERP format): use as the *deferred /
  reference-only* case — attach, don't parse.
- **Door schedule** (CAD PDF): attach as the embedded reference page.

After importing the takeoff + Quote A, the comparison's by-supplier total must equal the
**recomputed** package cost (not the sheet's understated grand total), and best-line view
should highlight CC Craig on every line it priced (since it's the only priced quote until
a second CSV quote is added).
