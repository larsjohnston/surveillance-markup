import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveRequirements, needsPanicHardware, NBC_ALBERTA, type Opening } from '../src/index.ts';

function opening(over: Partial<Opening> & Pick<Opening, 'number' | 'function'>): Opening {
  return { config: 'single', fireRatingMinutes: 0, barrierFree: false, exterior: false, ...over };
}

test('assembly occupancy over 100 requires panic hardware (NBC 3.4.6.16(a))', () => {
  const r = deriveRequirements(opening({ number: '1', function: 'office', occupancyGroup: 'A2', occupantLoad: 150 }), NBC_ALBERTA);
  assert.equal(r.latching.kind, 'exit-device');
  assert.match(r.latching.reasons.join(' '), /3\.4\.6\.16\(a\)|assembly/);
});

test('business occupancy over 100 does NOT require panic (precise rule prevents over-spec)', () => {
  const r = deriveRequirements(opening({ number: '1', function: 'office', occupancyGroup: 'D', occupantLoad: 150 }), NBC_ALBERTA);
  assert.equal(r.latching.kind, 'lockset', 'group D is not assembly/F1 — no panic despite load > 100');
});

test('high-hazard industrial (F1) requires panic regardless of occupant load (NBC 3.4.6.16(c))', () => {
  const d = needsPanicHardware(NBC_ALBERTA, { occupancyGroup: 'F1', occupantLoad: 5, function: 'storeroom' });
  assert.equal(d.required, true);
  assert.match(d.reason, /F1|high-hazard/);
});

test('omitting occupancy group falls back to a conservative raw-load trigger', () => {
  const d = needsPanicHardware(NBC_ALBERTA, { occupantLoad: 150 });
  assert.equal(d.required, true);
  assert.match(d.reason, /conservative/);
  const safe = needsPanicHardware(NBC_ALBERTA, { occupantLoad: 80 });
  assert.equal(safe.required, false);
});
