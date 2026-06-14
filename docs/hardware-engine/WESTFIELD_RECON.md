# Validation: Westfield Landing (real job) vs the engine

First run of the engine against a real Calgary multifamily job — its architectural door/frame
schedule (~100+ openings; common-area subset transcribed in `fixtures/westfield-landing.ts`)
and its hardware quote's catalog numbers (`fixtures/westfield-skus.ts`; supplier prices NOT
committed). Goal: prove the engine's output
shape, surface the gaps, and reconcile SKUs against a real price book.

## What ran

`rowsToOpenings(WESTFIELD_COMMON)` → 40 architectural openings (2 overhead doors correctly
skipped) → `generateHardwareSets(.., { catalog: 'assa-abloy' })` → **8 distinct hardware sets**.
Inference confidence: 34 medium / 6 low. Every fire-rated opening got a self-closer, smoke
gasketing, positive latching, and no mechanical hold-open — verified in `test/ingest.test.ts`.

## The three findings that matter

### 1. The door schedule does NOT contain the opening function — this is the core gap
The schedule gives width/height/material/fire-label/frame, and an **empty `HDW CODE` column**.
The thing that drives a hardware set — *what the room is for* — is not in the schedule. The
consultant assigns it from the **floor plans** (room names + adjacencies). So schedule-only
generation must **infer** function, and the engine is honest about confidence:

- **High/medium** where material + fire + width + location pin it: AL storefront → public
  entrance; rated HM pair frame-A → exit stair; rated HM single → service/storeroom; HMI →
  exterior service.
- **Low** for suite interiors (MCD): passage vs privacy vs closet is *only* resolvable from the
  room name. The quote proves this matters — it carries **both** ~592 passage sets **and** ~223
  privacy sets in the suites; width alone can't split them reliably.

**Implication:** the real product needs a function source — floor-plan room labels (best),
the `HDW CODE` column when populated, or a quick human pass over the low-confidence rows. The
engine already exposes per-opening `confidence` + `notes` so the UI can route only those rows
to review.

### 2. The manufacturer is an ASSA ABLOY-family commodity line, not Allegion
The quote's high-volume locks/closers/hinges/exit use an **`LH`-prefixed commodity line**
(`LH3001-LOGAN` passage, `LH5007-L` storeroom, `LH816-REG` closer, `LH179BB` hinge,
`LH8810F` exit), paired with **Pemko** seals (`S88`, `171A`), a **Rixson** overhead stop
(`1-336`), and **Record** operators. Allegion-only would not have matched this price book.
Good news: the engine's **ASSA ABLOY accessory seed already matched** the real SKUs for
threshold (`171A`), perimeter/smoke seal (`S88`), and overhead stop (Rixson 1-series) — the
families were right. The commodity locks/closers/hinges differ from Sargent/Norton/McKinney.

### 3. The Pretium PDF is a missing-door reconciliation — a feature, not just a comment
The "with Pretium comments" PDF is the floor-plan markup flagging **doors in the drawings but
absent from the schedule** (and vice-versa) — e.g. "1 door Parkade to Elev. Lobby", "Missing
D116", "4 Doors from Elev. Lobby to Corridor Level 3 to 6". This schedule↔plan reconciliation
is exactly the owner-review/diff workflow in the project goal, and the engine's `skipped` +
opening-keyed output is structured to support it later.

## SKU reconciliation (engine output → real quote line)

Catalog numbers only — supplier pricing is not committed (it lives in the private price book).

| Engine category / function | Quote catalog # | Status |
|---|---|---|
| lockset · passage | `LH3001-LOGAN` | map (LH line) |
| lockset · passage (rated) | `LH3001-LOGAN x UL 20 Min Latch` | map |
| lockset · privacy | `LH3022-LOGAN` | map |
| lockset · storeroom | `LH5007-L` | map |
| closer · standard | `LH816-REG` | map |
| closer · heavy | `LH8016-REG` | map |
| closer · FA hold-open | `351-EHT` | map |
| hinges · NRP | `LH179BB 4.5" x 4" - NRP` | map |
| exit-device · fire exit-only | `LH8810F x EXIT ONLY` | map |
| flush-bolt · auto | `LHFB610M` | map |
| gasketing (smoke/perimeter) | `S88BL` | **already in seed** |
| threshold | `171A` | **already in seed (171A)** |
| stop-holder · overhead | `1-336` (Rixson) | **family already in seed** |
| stop-holder · wall | `409` (Rockwood) | seed uses 441 → switch to 409 |
| (AC) electric strike | `1500C` | engine flags → AC module |
| (AC) door position switch | `DPS-W` | engine flags → AC module |

## Engine aggregate (common-area subset, per single opening)

`150 hinges · 43 closers · 40 stops · 32 gasketing · 31 locksets · 14 kick plates ·
10 flush-bolts/coordinators/astragals · 9 exit devices+trim · 8 sweeps/thresholds · 6 silencers`
across **8 sets** for 40 openings. Inferred function mix: 19 storeroom · 6 utility · 6 public
entrance · 4 exterior-service · 3 stair · 2 cross-corridor.

## Next (E4b)

1. ✅ **`LH` commodity catalog line** (`src/catalog/lh-commodity.ts`, id `lh`) keyed to the quote
   SKUs above — schedule → sets → **priced** now runs end-to-end against an injected price book
   (the integrator's private book; prices stay out of git). Items the residential line doesn't
   stock (storefront exit hardware, kick plates, coordinators, silencers) surface as flagged
   unpriced lines, never zeroed.
2. ✅ **Function from the floor plan** — `ScheduleRow.room` drives a HIGH-confidence function
   (`functionFromRoomLabel`), resolving the suite passage-vs-privacy ambiguity that material+width
   cannot; the material/width heuristic stays as the fallback with review flags.
3. ✅ **Schedule CSV importer** (`src/ingest/csv.ts`, `parseScheduleCsv`) — handles quoted inch
   marks, repeated per-section headers, section/band rows, double TYPE/MAT/FIN columns, and
   em-dash fire labels. CSV → `ScheduleRow[]` → openings → sets, end-to-end.
4. Switch the ASSA ABLOY seed's wall stop `441` → `409` to match this distributor (minor).
5. **E5** — SaaS surface (generate → owner edits → re-derive → keep prior version).
