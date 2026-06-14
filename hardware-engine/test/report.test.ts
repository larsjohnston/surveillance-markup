import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  rowsToOpenings,
  generateHardwareSets,
  priceSets,
  renderHardwareSchedule,
  renderTakeoff,
  renderPricedSummary,
  renderReviewFlags,
  type PriceBook,
} from '../src/index.ts';
import { WESTFIELD_COMMON } from '../fixtures/westfield-landing.ts';

test('hardware schedule renders headings, items, and code basis', () => {
  const { openings } = rowsToOpenings(WESTFIELD_COMMON);
  const result = generateHardwareSets(openings, { catalog: 'assa-abloy' });
  const text = renderHardwareSchedule(result, { projectName: 'Westfield Landing' });
  assert.match(text, /HARDWARE SCHEDULE — Westfield Landing/);
  assert.match(text, /HW-1\s+Openings/);
  assert.match(text, /Code basis:/);
  assert.match(text, /Hinges/);
});

test('take-off multiplies set items by opening count', () => {
  const { openings } = rowsToOpenings(WESTFIELD_COMMON);
  const result = generateHardwareSets(openings, { catalog: 'assa-abloy' });
  const text = renderTakeoff(result);
  assert.match(text, /TAKE-OFF/);
  // hinges are the highest-count line — first data row after the header.
  assert.match(text.split('\n')[2]!, /Hinges/);
});

test('priced summary shows grand sell and flags unpriced sets', () => {
  const { openings } = rowsToOpenings(WESTFIELD_COMMON);
  const result = generateHardwareSets(openings, { catalog: 'lh' });
  const book: PriceBook = { 'LH816-REG': { cost: 65, list: 230 }, '171A': { cost: 35, list: 44 } };
  const priced = priceSets(result, book);
  const text = renderPricedSummary(priced);
  assert.match(text, /GRAND SELL: \$/);
  assert.match(text, /unpriced/);
});

test('review flags surface unresolved TBD items', () => {
  const { openings } = rowsToOpenings(WESTFIELD_COMMON);
  const result = generateHardwareSets(openings, { catalog: 'lh' }); // LH leaves storefront items TBD
  const text = renderReviewFlags(result, ['D203 (low confidence)']);
  assert.match(text, /low-confidence function: D203/);
  assert.match(text, /unresolved/);
});
