import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateHardwareSets,
  priceSets,
  type Opening,
  type PriceBook,
} from '../src/index.ts';

function opening(over: Partial<Opening> & Pick<Opening, 'number' | 'function'>): Opening {
  return { config: 'single', fireRatingMinutes: 0, barrierFree: false, exterior: false, ...over };
}

// A tiny fixture book keyed to the DRAFT Allegion SKUs an office set resolves to.
const BOOK: PriceBook = {
  '5PB1': { cost: 18, list: 30 },
  'ND50PD RHO': { cost: 210, list: 350 },
  'WS407CCV': { cost: 6, list: 12 },
  'SR64': { cost: 2, list: 4 },
};

test('discount rule sells off list; markup rule sells off cost', () => {
  const result = generateHardwareSets([opening({ number: '1', function: 'office', material: 'hollow-metal' })]);
  const disc = priceSets(result, BOOK, { rule: { mode: 'discount', value: 10 } });
  const lock = disc.sets[0]!.items.find((i) => i.category === 'lockset')!;
  assert.equal(lock.unitSell, 315);   // 350 list x 0.90
  assert.equal(lock.extSell, 315);    // qty 1

  const mark = priceSets(result, BOOK, { rule: { mode: 'markup', value: 40 } });
  const lock2 = mark.sets[0]!.items.find((i) => i.category === 'lockset')!;
  assert.equal(lock2.unitSell, 294);  // 210 cost x 1.40
});

test('unpriced items are flagged, never zeroed, and counted', () => {
  const result = generateHardwareSets([opening({ number: '1', function: 'office', material: 'hollow-metal' })]);
  // Omit the hinge sku from the book.
  const partial: PriceBook = { 'ND50PD RHO': { cost: 210, list: 350 } };
  const priced = priceSets(result, partial, { rule: { mode: 'discount', value: 0 } });
  const hinge = priced.sets[0]!.items.find((i) => i.category === 'hinges')!;
  assert.equal(hinge.priced, false);
  assert.equal(hinge.unitSell, null);
  assert.equal(hinge.extSell, null, 'never coerced to 0');
  assert.ok(priced.unpricedCount >= 1);
});

test('job grand total multiplies a shared set by its opening count', () => {
  const result = generateHardwareSets([
    opening({ number: '1', function: 'office', material: 'hollow-metal' }),
    opening({ number: '2', function: 'office', material: 'hollow-metal' }),
  ]);
  assert.equal(result.sets.length, 1, 'two identical offices share one set');
  const priced = priceSets(result, BOOK, { rule: { mode: 'discount', value: 0 } });
  const oneOpening = priced.sets[0]!.setSell;
  assert.ok(oneOpening > 0);
  assert.equal(priced.grandSell, Math.round(oneOpening * 2 * 100) / 100, 'grand = per-opening x 2 openings');
});

test('normalizeKey lets a messy book key match the engine sku', () => {
  const result = generateHardwareSets([opening({ number: '1', function: 'office', material: 'hollow-metal' })]);
  const messy: PriceBook = { 'nd50pd rho': { cost: 100, list: 200 } };
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  const priced = priceSets(result, messy, { rule: { mode: 'discount', value: 0 }, normalizeKey: norm });
  const lock = priced.sets[0]!.items.find((i) => i.category === 'lockset')!;
  assert.equal(lock.unitSell, 200);
});
