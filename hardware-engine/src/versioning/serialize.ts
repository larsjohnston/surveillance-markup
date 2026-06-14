// ─── Persistence boundary (E5): Revision <-> DB row ───
//
// A Revision is already plain JSON (input = openings + options; result = generated sets), so
// it stores directly. This module pins the exact row shape the SaaS persists (one row per
// revision; input/result as jsonb) and provides loss-free (de)serialization so the Postgres
// layer and the in-memory engine agree byte-for-byte. The SaaS `hardware_revisions` table maps
// 1:1 onto RevisionRow.

import type { Revision, ProjectInput } from './revisions.ts';
import { RevisionStore } from './revisions.ts';
import type { GenerateResult } from '../types.ts';

/** One persisted revision. snake_case to match the SQL column names directly. */
export interface RevisionRow {
  id: string;
  parent_id: string | null;
  created_at: string;
  label: string | null;
  input: ProjectInput;     // jsonb
  result: GenerateResult;  // jsonb
  hash: string;
}

export function revisionToRow(rev: Revision): RevisionRow {
  return {
    id: rev.id,
    parent_id: rev.parentId,
    created_at: rev.createdAt,
    label: rev.label ?? null,
    input: rev.input,
    result: rev.result,
    hash: rev.hash,
  };
}

export function rowToRevision(row: RevisionRow): Revision {
  const rev: Revision = {
    id: row.id,
    parentId: row.parent_id,
    createdAt: row.created_at,
    input: row.input,
    result: row.result,
    hash: row.hash,
  };
  if (row.label !== null && row.label !== undefined) rev.label = row.label;
  return rev;
}

export function serializeRevision(rev: Revision): string {
  return JSON.stringify(revisionToRow(rev));
}

export function deserializeRevision(json: string): Revision {
  return rowToRevision(JSON.parse(json) as RevisionRow);
}

/** Dump a whole store's history to rows (insertion order = revision order). */
export function dumpStore(store: RevisionStore): RevisionRow[] {
  return store.history().map(revisionToRow);
}

/** Rehydrate a store from persisted rows (trusts the stored result; no re-generation). */
export function loadStore(rows: RevisionRow[]): RevisionStore {
  const store = new RevisionStore();
  for (const r of rows) store.append(rowToRevision(r));
  return store;
}
