import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateHardwareSets, type Opening, type HardwareItem } from '../src/index.ts';

function opening(over: Partial<Opening> & Pick<Opening, 'number' | 'function'>): Opening {
  return {
    config: 'single',
    fireRatingMinutes: 0,
    barrierFree: false,
    exterior: false,
    ...over,
  };
}

function cat(items: HardwareItem[], category: string): HardwareItem | undefined {
  return items.find((i) => i.category === category);
}
function cats(items: HardwareItem[], category: string): HardwareItem[] {
  return items.filter((i) => i.category === category);
}

test('office single interior: lockset, hinges, wall stop, no closer, silencers', () => {
  const { sets } = generateHardwareSets([opening({ number: '101', function: 'office', material: 'hollow-metal' })]);
  const items = sets[0]!.items;
  assert.equal(cat(items, 'lockset')?.sku, 'ND50PD RHO');
  assert.equal(cat(items, 'hinges')?.qty, 3);            // 2134mm default -> 3 hinges
  assert.equal(cat(items, 'stop-holder')?.sku, 'WS407CCV');
  assert.equal(cat(items, 'closer'), undefined);          // interior office, not rated/BF
  assert.ok(cat(items, 'silencer'), 'HM frame, non-gasketed => silencers');
});

test('storeroom fire-rated: self-closer, positive latch, smoke gasketing, bearing hinges', () => {
  const { sets, profiles } = generateHardwareSets([
    opening({ number: '201', function: 'storeroom', fireRatingMinutes: 45, material: 'hollow-metal' }),
  ]);
  const items = sets[0]!.items;
  assert.ok(cat(items, 'closer'), 'fire door must self-close');
  assert.equal(cat(items, 'lockset')?.sku, 'ND80PD RHO');  // storeroom positively latches
  assert.ok(cat(items, 'gasketing'), 'rated opening gets smoke gasketing');
  assert.equal(cat(items, 'hinges')?.sku, '5BB1');         // ball-bearing on rated
  const reasons = profiles[0]!.closer.reasons.join(' ');
  assert.match(reasons, /self-closing/);
});

test('public entrance exterior + high occupancy: exit device + weatherseals + closer', () => {
  const { sets } = generateHardwareSets([
    opening({ number: 'A1', function: 'entrance-public', exterior: true, occupantLoad: 120, barrierFree: true }),
  ]);
  const items = sets[0]!.items;
  assert.ok(cat(items, 'exit-device'), 'panic hardware at 120 occupants');
  assert.ok(cat(items, 'gasketing'), 'exterior weatherstrip');
  assert.ok(cat(items, 'door-sweep'));
  assert.ok(cat(items, 'threshold'));
  assert.ok(cat(items, 'closer'));
  assert.equal(cat(items, 'hinges')?.sku, '5BB1HW NRP');   // exterior -> NRP heavy
});

test('fire-rated pair cross-corridor: auto flush bolts + coordinator + FA-released closer x2', () => {
  const { sets, profiles } = generateHardwareSets([
    opening({ number: 'C1', function: 'corridor-cross', config: 'pair', fireRatingMinutes: 60 }),
  ]);
  const items = sets[0]!.items;
  assert.equal(cat(items, 'flush-bolt')?.sku, 'FB31P / FB41P', 'rated pair -> auto flush bolts');
  assert.ok(cat(items, 'coordinator'));
  assert.equal(cat(items, 'closer')?.qty, 2, 'one closer per leaf');
  assert.ok(profiles[0]!.closer.faReleased, 'cross-corridor hold-open releases on FA');
  assert.equal(cat(items, 'closer')?.sku, '4040XP-SEM');
});

test('barrier-free office forces an adjusted closer', () => {
  const { sets, profiles } = generateHardwareSets([
    opening({ number: '301', function: 'office', barrierFree: true }),
  ]);
  assert.ok(cat(sets[0]!.items, 'closer'), 'barrier-free route needs door control');
  assert.ok(profiles[0]!.closer.barrierFreeAdjust);
});

test('identical openings collapse into one hardware set; distinct ones do not', () => {
  const { sets, openingToSet } = generateHardwareSets([
    opening({ number: '401', function: 'office', material: 'hollow-metal' }),
    opening({ number: '402', function: 'office', material: 'hollow-metal' }),
    opening({ number: '403', function: 'storeroom', material: 'hollow-metal' }),
  ]);
  assert.equal(sets.length, 2);
  assert.equal(openingToSet['401'], openingToSet['402']);
  assert.notEqual(openingToSet['401'], openingToSet['403']);
  assert.deepEqual(sets[0]!.openingNumbers, ['401', '402']);
});

test('ASSA ABLOY skeleton emits loud TBD placeholders for unseeded items, never silent drops', () => {
  const { sets } = generateHardwareSets([
    opening({ number: '501', function: 'restroom-single', material: 'hollow-metal' }),
  ], { catalog: 'assa-abloy' });
  const items = sets[0]!.items;
  // restroom-single defaults a kick plate, which ASSA ABLOY does not seed -> TBD, not missing.
  const plate = cat(items, 'protection-plate');
  assert.ok(plate, 'kick plate requirement still present');
  assert.equal(plate!.sku, 'TBD');
  assert.match(plate!.description, /not yet seeded|UNSEEDED|VERIFY/);
});

test('access-controlled opening raises an AC-handoff advisory (engine does not spec electrified hw)', () => {
  const { profiles } = generateHardwareSets([
    opening({ number: '601', function: 'storeroom', accessControlled: true }),
  ]);
  assert.match(profiles[0]!.advisories.join(' '), /access-control module/);
});
