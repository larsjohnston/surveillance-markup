import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RevisionStore, diffRevisions, createRevision, type Opening, type ProjectInput } from '../src/index.ts';

function op(over: Partial<Opening> & Pick<Opening, 'number' | 'function'>): Opening {
  return { config: 'single', fireRatingMinutes: 0, barrierFree: false, exterior: false, ...over };
}

const base: ProjectInput = {
  options: { catalog: 'allegion' },
  openings: [
    op({ number: '101', function: 'office', material: 'hollow-metal' }),
    op({ number: '102', function: 'storeroom', material: 'hollow-metal' }),
    op({ number: '103', function: 'storeroom', material: 'hollow-metal' }),
  ],
};

const clock = (() => { let n = 0; return () => `2026-06-14T00:00:0${n++}Z`; })();

test('store keeps prior versions and links parents', () => {
  const store = new RevisionStore();
  const v1 = store.commit(base, { now: clock });
  const v2 = store.commit({
    ...base,
    openings: [
      // 101 unchanged; 102 gains a fire rating (hardware changes); 103 removed; 104 added.
      base.openings[0]!,
      op({ number: '102', function: 'storeroom', material: 'hollow-metal', fireRatingMinutes: 45 }),
      op({ number: '104', function: 'office', material: 'hollow-metal' }),
    ],
  }, { now: clock });

  assert.equal(store.history().length, 2, 'previous version retained');
  assert.equal(store.head()!.id, v2.id);
  assert.equal(v2.parentId, v1.id);
  assert.ok(store.get(v1.id), 'v1 still retrievable');
});

test('diff reports added/removed/modified openings and hardware deltas', () => {
  const v1 = createRevision(base, { now: clock });
  const v2 = createRevision({
    ...base,
    openings: [
      base.openings[0]!,
      op({ number: '102', function: 'storeroom', material: 'hollow-metal', fireRatingMinutes: 45 }),
      op({ number: '104', function: 'office', material: 'hollow-metal' }),
    ],
  }, { now: clock, parentId: v1.id });

  const d = diffRevisions(v1, v2);
  assert.equal(d.summary.added, 1);
  assert.equal(d.summary.removed, 1);

  const o102 = d.openings.find((o) => o.number === '102')!;
  assert.equal(o102.status, 'modified');
  assert.equal(o102.hardwareChanged, true, 'adding a fire rating changes the hardware');
  assert.ok(o102.fieldChanges!.some((c) => c.field === 'fireRatingMinutes' && c.to === 45));
  // a fire-rated storeroom gains a closer + smoke gasketing vs the non-rated version.
  assert.ok(o102.itemDelta!.added.some((s) => /4040XP/.test(s)), 'closer added');

  assert.equal(d.openings.find((o) => o.number === '103')!.status, 'removed');
  assert.equal(d.openings.find((o) => o.number === '104')!.status, 'added');
  assert.equal(d.openings.find((o) => o.number === '101'), undefined, 'unchanged openings omitted by default');
});

test('re-committing identical input is a no-op (no duplicate version)', () => {
  const store = new RevisionStore();
  store.commit(base, { now: clock });
  const again = store.commit(base, { now: clock });
  assert.equal(store.history().length, 1, 'identical input does not create a new revision');
  assert.equal(again.hash, store.head()!.hash);
});

test('changing only a global option (catalog) shows hardware-only changes (rehardware)', () => {
  const v1 = createRevision(base, { now: clock });
  const v2 = createRevision({ ...base, options: { catalog: 'assa-abloy' } }, { now: clock, parentId: v1.id });
  const d = diffRevisions(v1, v2);
  assert.equal(d.summary.modified, 0, 'no opening fields changed');
  assert.ok(d.summary.hardwareChanged > 0, 'catalog swap re-specs the hardware');
  assert.ok(d.openings.every((o) => o.status === 'rehardware'));
});
