import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateHardwareSets,
  priceSets,
  rowsToOpenings,
  getCatalog,
  type PriceBook,
} from '../src/index.ts';
import { WESTFIELD_COMMON } from '../fixtures/westfield-landing.ts';

test('LH line maps the residential lock functions to the real job SKUs', () => {
  const lh = getCatalog('lh');
  assert.equal(lh.lockset('passage')?.sku, 'LH3001-LOGAN');
  assert.equal(lh.lockset('privacy')?.sku, 'LH3022-LOGAN');
  assert.equal(lh.lockset('storeroom')?.sku, 'LH5007-L');
  assert.equal(lh.lockset('office'), null, 'office lock not stocked on this commodity line');
});

test('LH wall/overhead stops + Pemko seals/threshold match the quote families', () => {
  const lh = getCatalog('lh');
  assert.equal(lh.stopHolder('wall')?.sku, '409');
  assert.equal(lh.stopHolder('overhead')?.sku, '1-336');
  assert.equal(lh.gasketing({ smoke: true })?.sku, 'S88BL');
  assert.equal(lh.threshold()?.sku, '171A');
});

test('end-to-end: Westfield schedule -> LH sets -> priced (synthetic book), unmapped items flagged', () => {
  // SYNTHETIC prices (invented for the test — NOT the supplier quote).
  const book: PriceBook = {
    'LH3001-LOGAN': { cost: 40, list: 130 },
    'LH5007-L': { cost: 120, list: 430 },
    'LH816-REG': { cost: 65, list: 230 },
    '351-EHT': { cost: 690, list: 1790 },
    'LH179BB 4.5" x 4" - NRP': { cost: 6, list: 22 },
    'LH8810F x EXIT ONLY': { cost: 350, list: 1250 },
    'LHFB610M': { cost: 67, list: 235 },
    'S88BL': { cost: 22, list: 23 },
    '171A': { cost: 35, list: 44 },
    '409': { cost: 3, list: 5 },
    '1-336': { cost: 348, list: 539 },
  };
  const { openings } = rowsToOpenings(WESTFIELD_COMMON);
  const result = generateHardwareSets(openings, { catalog: 'lh' });
  const priced = priceSets(result, book, { rule: { mode: 'discount', value: 15 } });

  assert.ok(priced.grandSell > 0, 'job prices out to a positive sell');
  // hinges priced from the book; an unstocked item (e.g. kick plate -> TBD) is flagged, not zeroed.
  const anyTbd = priced.sets.some((s) => s.items.some((i) => i.sku === 'TBD'));
  if (anyTbd) assert.ok(priced.unpricedCount > 0, 'TBD/unstocked items surface as unpriced');
});
