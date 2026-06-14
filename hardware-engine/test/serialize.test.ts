import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  RevisionStore,
  serializeRevision,
  deserializeRevision,
  dumpStore,
  loadStore,
  diffRevisions,
  type Opening,
  type ProjectInput,
} from '../src/index.ts';

function op(over: Partial<Opening> & Pick<Opening, 'number' | 'function'>): Opening {
  return { config: 'single', fireRatingMinutes: 0, barrierFree: false, exterior: false, ...over };
}
const clock = (() => { let n = 0; return () => `2026-06-14T01:00:0${n++}Z`; })();

const base: ProjectInput = {
  options: { catalog: 'assa-abloy' },
  openings: [op({ number: '101', function: 'office', material: 'hollow-metal' }), op({ number: '102', function: 'storeroom', fireRatingMinutes: 45 })],
};

test('a single revision round-trips loss-free through JSON', () => {
  const store = new RevisionStore();
  const rev = store.commit(base, { label: 'Draft', now: clock });
  const back = deserializeRevision(serializeRevision(rev));
  assert.deepEqual(back, rev);
  assert.equal(back.hash, rev.hash);
});

test('the whole store dumps to rows and reloads identically (history + parents preserved)', () => {
  const store = new RevisionStore();
  store.commit(base, { label: 'v1', now: clock });
  store.commit({ ...base, openings: [base.openings[0]!] }, { label: 'v2', now: clock });

  const rows = dumpStore(store);
  assert.equal(rows.length, 2);
  assert.equal(rows[0]!.parent_id, null);
  assert.equal(rows[1]!.parent_id, rows[0]!.id);

  const reloaded = loadStore(JSON.parse(JSON.stringify(rows))); // simulate a DB round-trip
  assert.equal(reloaded.history().length, 2);
  assert.equal(reloaded.head()!.id, store.head()!.id);

  // a diff computed from the reloaded store matches the original.
  const a = diffRevisions(store.history()[0]!, store.history()[1]!);
  const b = reloaded.diff();
  assert.deepEqual(b.summary, a.summary);
});

test('RevisionRow uses snake_case columns ready for the SQL schema', () => {
  const store = new RevisionStore();
  const rev = store.commit(base, { now: clock });
  const [row] = dumpStore(store);
  assert.deepEqual(Object.keys(row!).sort(), ['created_at', 'hash', 'id', 'input', 'label', 'parent_id', 'result'].sort());
});
