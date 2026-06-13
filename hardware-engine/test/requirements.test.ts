import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveRequirements, NBC_ALBERTA, type Opening } from '../src/index.ts';

function opening(over: Partial<Opening> & Pick<Opening, 'number' | 'function'>): Opening {
  return { config: 'single', fireRatingMinutes: 0, barrierFree: false, exterior: false, ...over };
}

test('non-rated restroom-multi is push/pull; rating upgrades it to positive latching', () => {
  const open = deriveRequirements(opening({ number: '1', function: 'restroom-multi' }), NBC_ALBERTA);
  assert.equal(open.latching.kind, 'push-pull');

  const rated = deriveRequirements(opening({ number: '1', function: 'restroom-multi', fireRatingMinutes: 20 }), NBC_ALBERTA);
  assert.equal(rated.latching.kind, 'lockset');
  assert.match(rated.latching.reasons.join(' '), /positive latching/);
});

test('hinge count tracks leaf height per NBC breakpoints', () => {
  const short = deriveRequirements(opening({ number: '1', function: 'office', leafHeightMm: 1500 }), NBC_ALBERTA);
  const std = deriveRequirements(opening({ number: '1', function: 'office', leafHeightMm: 2134 }), NBC_ALBERTA);
  const tall = deriveRequirements(opening({ number: '1', function: 'office', leafHeightMm: 2700 }), NBC_ALBERTA);
  assert.equal(short.hinges.count, 2);
  assert.equal(std.hinges.count, 3);
  assert.equal(tall.hinges.count, 4);
});

test('occupant load below threshold keeps a lockset; at/above swaps to exit device', () => {
  const low = deriveRequirements(opening({ number: '1', function: 'office', occupantLoad: 40 }), NBC_ALBERTA);
  assert.equal(low.latching.kind, 'lockset');
  const high = deriveRequirements(opening({ number: '1', function: 'office', occupantLoad: 60 }), NBC_ALBERTA);
  assert.equal(high.latching.kind, 'exit-device');
  assert.equal(high.latching.kind === 'exit-device' && high.latching.outsideTrim, 'key-lever');
});

test('rated opening bans mechanical hold-open in the closer requirement', () => {
  const rated = deriveRequirements(opening({ number: '1', function: 'storeroom', fireRatingMinutes: 90 }), NBC_ALBERTA);
  assert.equal(rated.closer.required, true);
  assert.equal(rated.closer.holdOpenAllowed, false);
});

test('exterior opening requires weatherstrip, sweep, threshold and NRP bearing hinges', () => {
  const ext = deriveRequirements(opening({ number: '1', function: 'exterior-service', exterior: true }), NBC_ALBERTA);
  assert.ok(ext.seals.weatherstrip && ext.seals.sweep && ext.seals.threshold);
  assert.ok(ext.hinges.nonRemovablePin && ext.hinges.bearing);
  assert.equal(ext.silencers, false, 'gasketed opening has no silencers');
});

test('every requirement carries a traceable reason', () => {
  const r = deriveRequirements(opening({ number: '1', function: 'storeroom', fireRatingMinutes: 45, barrierFree: true }), NBC_ALBERTA);
  assert.ok(r.latching.reasons.length > 0);
  assert.ok(r.closer.reasons.length > 0);
  assert.ok(r.hinges.reasons.length > 0);
  assert.ok(r.seals.reasons.length > 0);
});
