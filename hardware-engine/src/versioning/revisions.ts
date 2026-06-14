// ─── Versioning (E5 core): revisions + diff for the owner-review workflow ───
//
// The product goal: "the owner looks at the draft, makes changes to openings (edit/remove/add),
// which update automatically and KEEP the previous version." That workflow is pure logic:
//   commit(input) -> Revision (snapshot of input + generated sets + content hash)
//   edit openings -> commit again -> a new Revision linked to its parent (history retained)
//   diff(prev, next) -> exactly what changed: openings added/removed/modified, and which
//   openings' HARDWARE changed as a result.
// The SaaS swaps the in-memory store for Postgres rows; this API is identical. Zero deps.

import type { Opening, GenerateResult } from '../types.ts';
import { generateHardwareSets, type GenerateOptions } from '../engine/index.ts';

export interface ProjectInput {
  openings: Opening[];
  options?: GenerateOptions;
}

export interface Revision {
  id: string;
  parentId: string | null;
  createdAt: string;
  label?: string;
  input: ProjectInput;
  result: GenerateResult;
  /** Content hash of the input — equal hashes mean an identical re-commit (no-op). */
  hash: string;
}

// ── deterministic stringify + small FNV-1a hash (no crypto dependency) ──

function stableStringify(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null';
  if (Array.isArray(v)) return '[' + v.map(stableStringify).join(',') + ']';
  const keys = Object.keys(v as Record<string, unknown>).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify((v as Record<string, unknown>)[k])).join(',') + '}';
}

export function hashInput(input: ProjectInput): string {
  const s = stableStringify(input);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return ('00000000' + h.toString(16)).slice(-8);
}

export interface CreateRevisionMeta {
  id?: string;
  parentId?: string | null;
  label?: string;
  /** Inject the timestamp for deterministic tests. */
  now?: () => string;
}

/** Generate hardware sets for an input and snapshot it as a Revision. */
export function createRevision(input: ProjectInput, meta: CreateRevisionMeta = {}): Revision {
  const result = generateHardwareSets(input.openings, input.options);
  const now = meta.now ? meta.now() : new Date().toISOString();
  return {
    id: meta.id ?? `rev_${hashInput(input)}_${now}`,
    parentId: meta.parentId ?? null,
    createdAt: now,
    label: meta.label,
    input,
    result,
    hash: hashInput(input),
  };
}

// ── diff ──

export interface OpeningFieldChange { field: string; from: unknown; to: unknown; }

export type OpeningStatus = 'added' | 'removed' | 'modified' | 'rehardware' | 'unchanged';

export interface OpeningDiff {
  number: string;
  status: OpeningStatus;
  fieldChanges?: OpeningFieldChange[];
  hardwareChanged?: boolean;
  itemDelta?: { added: string[]; removed: string[] };
}

export interface RevisionDiff {
  fromId: string;
  toId: string;
  openings: OpeningDiff[];
  summary: { added: number; removed: number; modified: number; hardwareChanged: number; setsBefore: number; setsAfter: number };
}

function sigByOpening(result: GenerateResult): Map<string, string> {
  const m = new Map<string, string>();
  for (const s of result.sets) for (const n of s.openingNumbers) m.set(n, s.signature);
  return m;
}

function itemsByOpening(result: GenerateResult): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const s of result.sets) {
    const list = s.items.map((i) => `${i.qty}× ${i.sku}`);
    for (const n of s.openingNumbers) m.set(n, list);
  }
  return m;
}

function diffOpeningFields(a: Opening, b: Opening): OpeningFieldChange[] {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const out: OpeningFieldChange[] = [];
  for (const k of keys) {
    const av = (a as unknown as Record<string, unknown>)[k];
    const bv = (b as unknown as Record<string, unknown>)[k];
    if (stableStringify(av) !== stableStringify(bv)) out.push({ field: k, from: av, to: bv });
  }
  return out;
}

/** Diff two revisions: opening-level edits + which openings' hardware changed. */
export function diffRevisions(prev: Revision, next: Revision, opts: { includeUnchanged?: boolean } = {}): RevisionDiff {
  const prevOpen = new Map(prev.input.openings.map((o) => [o.number, o]));
  const nextOpen = new Map(next.input.openings.map((o) => [o.number, o]));
  const prevSig = sigByOpening(prev.result);
  const nextSig = sigByOpening(next.result);
  const prevItems = itemsByOpening(prev.result);
  const nextItems = itemsByOpening(next.result);

  const numbers = [...new Set([...prevOpen.keys(), ...nextOpen.keys()])].sort();
  const openings: OpeningDiff[] = [];
  let added = 0, removed = 0, modified = 0, hardwareChanged = 0;

  for (const n of numbers) {
    const a = prevOpen.get(n);
    const b = nextOpen.get(n);
    if (a && !b) { openings.push({ number: n, status: 'removed' }); removed++; continue; }
    if (!a && b) {
      openings.push({ number: n, status: 'added', hardwareChanged: true, itemDelta: { added: nextItems.get(n) ?? [], removed: [] } });
      added++; hardwareChanged++; continue;
    }
    const fieldChanges = diffOpeningFields(a!, b!);
    const hwChanged = prevSig.get(n) !== nextSig.get(n);
    if (hwChanged) hardwareChanged++;
    if (fieldChanges.length) modified++;

    if (!fieldChanges.length && !hwChanged) {
      if (opts.includeUnchanged) openings.push({ number: n, status: 'unchanged' });
      continue;
    }
    let itemDelta: OpeningDiff['itemDelta'];
    if (hwChanged) {
      const before = new Set(prevItems.get(n) ?? []);
      const after = new Set(nextItems.get(n) ?? []);
      itemDelta = {
        added: [...after].filter((x) => !before.has(x)),
        removed: [...before].filter((x) => !after.has(x)),
      };
    }
    openings.push({
      number: n,
      status: fieldChanges.length ? 'modified' : 'rehardware',
      fieldChanges: fieldChanges.length ? fieldChanges : undefined,
      hardwareChanged: hwChanged,
      itemDelta,
    });
  }

  return {
    fromId: prev.id,
    toId: next.id,
    openings,
    summary: { added, removed, modified, hardwareChanged, setsBefore: prev.result.sets.length, setsAfter: next.result.sets.length },
  };
}

// ── append-only revision store (history retained; SaaS swaps for Postgres) ──

export class RevisionStore {
  private revisions: Revision[] = [];

  /** Commit a new input as the next revision (linked to the current head). No-op-safe:
   *  an identical input to head returns head unchanged so prior versions aren't duplicated. */
  commit(input: ProjectInput, meta: { label?: string; now?: () => string } = {}): Revision {
    const parent = this.head();
    if (parent && parent.hash === hashInput(input)) return parent;
    const rev = createRevision(input, { parentId: parent?.id ?? null, label: meta.label, now: meta.now });
    this.revisions.push(rev);
    return rev;
  }

  /** Append a pre-built revision (e.g. when rehydrating from storage). Bypasses re-generation. */
  append(rev: Revision): void {
    this.revisions.push(rev);
  }

  head(): Revision | null {
    return this.revisions.length ? this.revisions[this.revisions.length - 1]! : null;
  }

  history(): Revision[] {
    return [...this.revisions];
  }

  get(id: string): Revision | undefined {
    return this.revisions.find((r) => r.id === id);
  }

  /** Diff two revisions by id (defaults: parent of head → head). */
  diff(fromId?: string, toId?: string): RevisionDiff {
    const to = toId ? this.get(toId) : this.head();
    if (!to) throw new Error('no revisions to diff');
    const from = fromId ? this.get(fromId) : (to.parentId ? this.get(to.parentId) : undefined);
    if (!from) throw new Error('no prior revision to diff against');
    return diffRevisions(from, to);
  }
}
