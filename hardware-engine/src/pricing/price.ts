// ─── Pricing join (E3): hardware sets + price book -> priced sets ───
//
// Pure and pluggable. The engine consumes an injected price book (sku -> {cost, list}); the
// real data comes from the platform pricing service later (pricing_items; unit_cost is
// server-only there). Unpriced items are FLAGGED, never silently zeroed — same discipline as
// the legacy tool's "unpriced" badge.

import type {
  GenerateResult,
  HardwareItem,
  PriceBook,
  PriceEntry,
  PricingRule,
  PricedItem,
  PricedSet,
  PricedResult,
} from '../types.ts';

/** Platform default: discount 0% off list (sell = list). Matches the legacy project default. */
export const DEFAULT_PRICING_RULE: PricingRule = { mode: 'discount', value: 0 };

export interface PriceOptions {
  rule?: PricingRule;
  /** Normalise a sku before book lookup (applied to both book keys and item skus). Default: identity. */
  normalizeKey?: (sku: string) => string;
  /** Full override: resolve a price per item (wins over the book). Return null = unpriced. */
  resolvePrice?: (item: HardwareItem) => PriceEntry | null;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Customer sell from a price entry under a rule. discount=off list, markup=on cost. */
export function deriveSell(e: PriceEntry, rule: PricingRule): number | null {
  if (rule.mode === 'discount') {
    if (typeof e.list === 'number') return round2(e.list * (1 - rule.value / 100));
    if (typeof e.cost === 'number') return round2(e.cost); // list-less fallback: cost at par
    return null;
  }
  if (typeof e.cost === 'number') return round2(e.cost * (1 + rule.value / 100));
  return null;
}

function makeLookup(book: PriceBook, normalizeKey?: (s: string) => string): (sku: string) => PriceEntry | null {
  if (!normalizeKey) return (sku) => book[sku] ?? null;
  const normed: PriceBook = {};
  for (const k of Object.keys(book)) normed[normalizeKey(k)] = book[k]!;
  return (sku) => normed[normalizeKey(sku)] ?? null;
}

function priceItem(item: HardwareItem, entry: PriceEntry | null, rule: PricingRule): PricedItem {
  const unitCost = entry && typeof entry.cost === 'number' ? entry.cost : null;
  const unitList = entry && typeof entry.list === 'number' ? entry.list : null;
  const unitSell = entry ? deriveSell(entry, rule) : null;
  return {
    ...item,
    unitCost,
    unitList,
    unitSell,
    extCost: unitCost === null ? null : round2(unitCost * item.qty),
    extSell: unitSell === null ? null : round2(unitSell * item.qty),
    priced: unitSell !== null,
  };
}

/**
 * Join a GenerateResult against a price book.
 * Per-set totals are for ONE opening's worth of hardware; the job grand totals multiply each
 * set by the number of openings it covers. `unpricedCount` counts distinct unpriced lines.
 */
export function priceSets(result: GenerateResult, book: PriceBook = {}, options: PriceOptions = {}): PricedResult {
  const rule = options.rule ?? DEFAULT_PRICING_RULE;
  const bySku = makeLookup(book, options.normalizeKey);
  const lookup: (item: HardwareItem) => PriceEntry | null =
    options.resolvePrice ?? ((item) => bySku(item.sku));

  let grandCost = 0;
  let grandSell = 0;
  let unpricedCount = 0;

  const sets: PricedSet[] = result.sets.map((s) => {
    const items = s.items.map((it) => priceItem(it, lookup(it), rule));
    let setCost = 0;
    let setSell = 0;
    let setUnpriced = 0;
    for (const pi of items) {
      if (pi.extCost !== null) setCost += pi.extCost;
      if (pi.extSell !== null) setSell += pi.extSell;
      if (!pi.priced) setUnpriced += 1;
    }
    setCost = round2(setCost);
    setSell = round2(setSell);
    const count = s.openingNumbers.length;
    grandCost = round2(grandCost + setCost * count);
    grandSell = round2(grandSell + setSell * count);
    unpricedCount += setUnpriced;
    return { id: s.id, openingNumbers: s.openingNumbers, signature: s.signature, items, setCost, setSell, unpricedCount: setUnpriced };
  });

  return { sets, openingToSet: result.openingToSet, grandCost, grandSell, unpricedCount };
}
