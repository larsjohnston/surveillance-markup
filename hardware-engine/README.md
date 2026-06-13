# @calsafe/hardware-engine

Architectural-hardware **consulting engine**: turn door-schedule openings into code-compliant,
manufacturer-resolved **hardware sets**. DOM-free, **zero runtime dependencies**, pure
TypeScript — built to drop into `proposal-platform/src/lib/hardware/` (the SaaS), but
developed and tested standalone first.

This is the *authoring* counterpart to the existing import-only Door Hardware module
(`../HARDWARE_SPEC.md`): that one prices a schedule someone else wrote; this one writes it.

Design + scope: [`../docs/hardware-engine/ENGINE_SPEC.md`](../docs/hardware-engine/ENGINE_SPEC.md).

## Use

```ts
import { generateHardwareSets, type Opening } from './src/index.ts';

const openings: Opening[] = [
  { number: '101', function: 'office',    config: 'single', fireRatingMinutes: 0,  barrierFree: true,  exterior: false },
  { number: '102', function: 'storeroom', config: 'single', fireRatingMinutes: 45, barrierFree: false, exterior: false },
  { number: 'A1',  function: 'entrance-public', config: 'single', fireRatingMinutes: 0, barrierFree: true, exterior: true, occupantLoad: 120 },
];

const { sets, openingToSet, profiles } = generateHardwareSets(openings, { catalog: 'allegion' });
// sets[]      -> HW-1, HW-2 … each with resolved items (sku, finish, qty, reasons)
// openingToSet -> { '101': 'HW-1', … }
// profiles[]  -> per-opening derived requirements with full reasons[] traceability
```

Pipeline: `Opening → deriveRequirements (NBC/Alberta overlays) → resolveItems (catalog) →
groupIntoSets (dedup)`.

Optional price join (E3) — pure, takes an injected price book (real data comes from the
platform pricing service later):

```ts
import { priceSets, type PriceBook } from './src/index.ts';
const book: PriceBook = { 'ND50PD RHO': { cost: 210, list: 350 }, /* … */ };
const priced = priceSets(result, book, { rule: { mode: 'discount', value: 15 } });
// priced.sets[].items[] carry unitCost/unitList/unitSell/extSell + a `priced` flag;
// unpriced lines are flagged (never zeroed); grandCost/grandSell roll up per-opening.
```

## Pieces

- `src/types.ts` — domain model (`Opening`, `RequirementProfile`, `HardwareItem`, `HardwareSet`).
- `src/jurisdiction/nbc-alberta.ts` — DRAFT code thresholds (every value tagged `// VERIFY:`).
- `src/engine/` — `requirements` (derive) · `resolve` · `sets` (group).
- `src/catalog/` — `allegion` (seeded) · `assa-abloy` (seeded) · registry.
- `src/pricing/price.ts` — `priceSets` price-book join (cost/list/sell, unpriced flagging).

## Test / typecheck

```bash
npm test         # node --test — zero install, needs Node >= 22.18
npm run typecheck# tsc --noEmit (install typescript + @types/node first; the SaaS has them)
```

## ⚠ Data confidence

Catalog numbers, finish codes (BHMA), handing suffixes, and code thresholds are
**illustrative DRAFT**. They use real product *series/functions* but must be reconciled
against the live price book and the actual NBC 2020 / Alberta Building Code / CAN-ULC text
before any output is quoted or stamped. The engine's value is the rule **structure and
reason traceability**; the data is correctable in one place each.
