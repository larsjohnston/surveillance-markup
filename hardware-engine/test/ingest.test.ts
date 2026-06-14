import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rowsToOpenings, inferFunction, widthToInches, generateHardwareSets } from '../src/index.ts';
import { WESTFIELD_COMMON } from '../fixtures/westfield-landing.ts';

test('width parser handles feet-dash-inches', () => {
  assert.equal(widthToInches(`3'-2"`), 38);
  assert.equal(widthToInches(`6'-4"`), 76);
  assert.equal(widthToInches(`18'-0"`), 216);
});

test('overhead (OHI) doors are skipped, not mis-specced', () => {
  const r = rowsToOpenings(WESTFIELD_COMMON);
  assert.equal(r.skipped.length, 2, 'D001 + D118 overhead doors skipped');
  assert.ok(r.skipped.every((s) => s.row.material === 'OHI'));
});

test('aluminum storefront infers a public entrance', () => {
  const inf = inferFunction({ number: 'D109', width: `6'-4"`, material: 'AL', group: 'Ground' })!;
  assert.equal(inf.function, 'entrance-public');
});

test('rated HM pair on a residential floor infers an exit stair', () => {
  const inf = inferFunction({ number: 'D305', width: `6'-4"`, material: 'HM', frameType: 'A', fireLabelMin: 90, group: 'L3' })!;
  assert.equal(inf.function, 'stairwell-exit');
});

test('suite interior MCD infers low confidence (room name needed)', () => {
  const narrow = inferFunction({ number: 'D1', width: `2'-6"`, material: 'MCD', group: 'Suite A' })!;
  assert.equal(narrow.confidence, 'low');
});

test('the real common-area schedule generates rated sets with closers + smoke seals', () => {
  const { openings } = rowsToOpenings(WESTFIELD_COMMON);
  const result = generateHardwareSets(openings, { catalog: 'assa-abloy' });
  // every fire-rated opening must carry a closer and smoke gasketing.
  for (const p of result.profiles) {
    if (p.opening.fireRatingMinutes > 0) {
      assert.equal(p.closer.required, true, `${p.opening.number} rated -> closer`);
      assert.equal(p.seals.smokeGasketing, true, `${p.opening.number} rated -> smoke gasketing`);
      assert.equal(p.closer.holdOpenAllowed, false, `${p.opening.number} rated -> no mechanical hold-open`);
    }
  }
  // sanity: dedup actually collapses the many identical 45-min HM singles.
  assert.ok(result.sets.length < openings.length, 'identical openings collapse into shared sets');
});
