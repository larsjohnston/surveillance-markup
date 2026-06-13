# Architectural Hardware Engine — Design Spec (MVP)

- **Status:** Draft for owner review
- **Scope:** The *consulting brain* — turn a door-schedule opening into a code-compliant
  hardware set, resolved to manufacturer catalog numbers. This is the authoring/derivation
  module that `HARDWARE_SPEC.md` explicitly deferred ("placement-driven authoring is a
  deliberately separate future module"). It is the inverse of the existing import-only
  Door Hardware module: that one *prices* a schedule someone else wrote; this one *writes*
  the schedule.
- **Home:** `proposal-platform` (the Next.js + Supabase SaaS). Per the platform design spec,
  "pure business logic … extracts to shared TS modules." This engine is exactly that: a
  DOM-free TypeScript library with zero runtime dependencies. It is being built in this repo
  under `hardware-engine/` so it can be developed and tested before the SaaS canvas (Phase 2)
  exists, then copied into `proposal-platform/src/lib/hardware/` unchanged.

## 1. Why this is hard (the consulting value)

An Architectural Hardware Consultant (AHC) reads a door schedule and, for every opening,
specifies a complete hardware set ("heading") — hinges, locking/latching, exit devices,
closers, protection plates, stops/holders, seals/thresholds, coordinators, silencers — such
that the opening satisfies, simultaneously:

- **Function** (what the room is for: an office locks differently than a storeroom).
- **Life-safety / egress** (NBC 3.4 / NFPA 101 analog: free egress, panic hardware on
  high-occupancy assembly, no key/tool/special knowledge to get out).
- **Fire protection** (NFPA 80 / CAN-ULC-S104: rated openings must self-close and
  positively latch; no hold-opens unless released by the fire-alarm system; listed
  components only).
- **Barrier-free / accessibility** (NBC 3.8 / CSA B651: lever (not knob) operation,
  bounded opening force, closer sweep/latch timing, reach/mounting heights).
- **Environment** (exterior openings need weatherseal, sweep, threshold, sealed-bearing /
  non-removable-pin hinges, corrosion-appropriate finishes).
- **Door configuration** (pairs need a coordinator + astragal + flush bolts or removable
  mullion; a fire-rated pair forces auto/constant-latching bolts).

The AHC value the engine encodes is not just "pick a lock" — it is the **traceable reason**
each item is present, so the spec can be defended to an AHJ and edited intelligently by the
owner. Every derived requirement carries a `reasons[]` trail.

## 2. Pipeline

```
Opening[]  ──derive──▶  RequirementProfile[]  ──resolve──▶  HardwareItem[][]  ──group──▶  HardwareSet[]
            (codes +                (catalog,                       (dedup identical
             function)               manufacturer line)              profiles → headings)
```

1. **derive** (`engine/requirements.ts`): `Opening + Jurisdiction → RequirementProfile`.
   Function defaults first, then jurisdiction overlays (fire, barrier-free, egress,
   environment, pair-config) each *appending reasons*. The profile is manufacturer-agnostic.
2. **resolve** (`engine/resolve.ts`): `RequirementProfile + CatalogLine + FinishPolicy →
   HardwareItem[]`. Hinge quantity from leaf height; lock function → catalog number; finish
   from environment/material. Manufacturer-specific.
3. **group** (`engine/sets.ts`): hash each resolved item list into a signature; identical
   signatures collapse into one `HardwareSet` ("HW-1", "HW-2" …) covering many openings,
   exactly as a real spec book groups openings under shared headings.

## 3. Data model (summary — see `src/types.ts`)

- `Opening` — one door-schedule row: number, `function` (the taxonomy below), `config`
  (single/pair), `fireRatingMinutes`, `barrierFree`, `exterior`, `occupantLoad?`,
  `leafHeightMm?`, `material?`, `handing?`, `accessControlled?`.
- `RequirementProfile` — derived, manufacturer-agnostic: a `latching` requirement
  (lock-function token **or** exit-device token), plus booleans/objects for `closer`,
  `hinges`, `protection`, `stopHolder`, `seals`, `pairHardware`, `silencers`, each with
  `reasons[]`.
- `HardwareItem` — resolved: `category`, `sku`, `description`, `finishBhma`, `qty`,
  `line` (Schlage / Von Duprin / LCN / Ives / Glynn-Johnson / …), `reasons[]`, `draft`.
- `HardwareSet` — `id`, `openingIds[]`, `items[]`, `signature`.

## 4. The opening-function taxonomy (NEEDS OWNER RATIFICATION)

The single most important design choice. The MVP enum (in `src/types.ts` as
`OpeningFunction`) is:

`entrance-public · entrance-staff · office · storeroom · classroom · classroom-security ·
restroom-single · restroom-multi · stairwell-exit · corridor-cross · communicating ·
mechanical-electrical · utility-closet · exterior-service · exit-only`

Each maps to a default lock/latch function and a default hardware skeleton. This taxonomy is
where your AHC judgment matters most — it should match how you actually read schedules.
Open question for you: do you spec from **room use** (above) or from a **hardware-function
code** the architect already wrote in the schedule (e.g. ANSI F-series / "HW-12")? The engine
supports both — room-use derives a function; a pre-written function code can be injected
directly — but the MVP defaults assume room-use.

## 5. Code ruleset — Alberta / NBC (DRAFT, NEEDS VERIFICATION)

`src/jurisdiction/nbc-alberta.ts` encodes the overlays as data + small functions. **Every
rule is marked `draft` and must be verified against the actual NBC 2020 / Alberta Building
Code / CAN-ULC text before any output is quoted or stamped.** First-cut overlays:

- **Fire** (`fireRatingMinutes > 0`): force self-closer; force positive-latching (kills
  passage/dummy latch → upgrade to latching function); ban mechanical hold-open (allow only
  fail-safe electromagnetic hold-open released by FA); require smoke gasketing for
  smoke-rated; listed hinges (steel, ball-bearing). Pairs → constant/auto flush bolts +
  fire-pin coordinator, no mechanical dogging on exit devices (fire exit hardware).
- **Barrier-free** (`barrierFree`): lever operation (reject knob); closer required on the
  accessible route with bounded opening force + min sweep/latch time; mounting-height note;
  reject privacy functions that cannot be released from the egress side.
- **Egress / occupancy** (`occupantLoad`): above the assembly/high-load threshold → panic
  exit device, free egress (no key/thumbturn-only on the egress side); below → lever set ok.
- **Environment** (`exterior`): weatherstrip + door sweep + threshold; non-removable-pin +
  sealed-bearing hinges; corrosion-appropriate finish.

Thresholds (occupant-load number, opening-force value, hinge-count breakpoints) are centralised
constants in that file with `// VERIFY:` tags.

## 6. Catalog (DRAFT SKUs — illustrative, not quote-ready)

`src/catalog/`. A `CatalogLine` interface maps requirement tokens → catalog numbers + finish.

- **Allegion** (`allegion.ts`) — seeded across the common commercial functions: Schlage
  ND-series (Grade 1 cylindrical) lock functions, Von Duprin 99 exit devices, LCN 4040XP
  closers, Ives hinges/plates/stops, Glynn-Johnson overhead holders, Zero seals/thresholds.
- **ASSA ABLOY** (`assa-abloy.ts`) — scaffolded with the structural map (Sargent / Norton /
  McKinney / Pemko / Rockwood) but only partially seeded, to prove the two-manufacturer
  abstraction without fabricating a full second catalog this pass.

SKUs, finish codes (BHMA 626/630/689…), and handing suffixes are **illustrative**. They use
real, well-known product *series/functions* but exact catalog numbers must be reconciled
against the live price book before use. Each entry carries `draft: true`.

## 7. MVP boundaries

**In:** single + pair openings; the 15 functions above; the four code overlays; Allegion
full seed + ASSA ABLOY skeleton; hardware-set dedup; full reason traceability; deterministic,
unit-tested output.

**Out (flagged for later):** keying/master-key schedules; electrified hardware spec (ties to
the AC module — engine only *flags* `accessControlled`); cylinder/core specifics; spring
hinges / continuous hinges / pivots selection nuance; door & frame (steel gauge, prep) spec;
price resolution (the existing price-book layer does that); floor-plan/door-schedule *parsing*
(a separate ingestion concern — the engine consumes structured `Opening[]`); versioning &
owner-review diffing (a SaaS/DB concern, not engine logic).

## 8. Roadmap

- **E1 (this pass):** types + pipeline + Allegion seed + NBC/Alberta overlays + dedup + tests.
- **E2:** ratify the function taxonomy + verify the NBC overlays against code text; expand
  Allegion to mortise (L-series) upgrade path; finish ASSA ABLOY seed.
- **E3:** price-book join (reuse the platform pricing service) → priced hardware sets.
- **E4:** ingestion adapters (door-schedule CSV/Overtur → `Opening[]`).
- **E5:** SaaS surface — generate → owner edits openings → re-derive → keep prior version
  (the review/versioning workflow). This is DB/UI, built on the stable engine.

## 9. Verification

`hardware-engine/` runs with **zero install** on Node ≥ 22.18: `npm test` →
`node --test test/`. No vitest/tsc needed here; the SaaS repo (which already has vitest)
re-runs the same tests after the copy-in.
