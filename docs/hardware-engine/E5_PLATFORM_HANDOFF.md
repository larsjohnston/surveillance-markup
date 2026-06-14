# E5 — Platform handoff: wiring the hardware engine into `proposal-platform`

The engine + its versioning/diff/persistence boundary are **done and tested** here. The only
remaining work is SaaS infrastructure (Postgres rows + a Next.js review screen), which must live
in `proposal-platform` (a separate repo this session can't write to — repo creation returned
`403 Resource not accessible by integration`). This doc is the complete, paste-ready transplant.

Everything below follows the conventions already established in
`docs/superpowers/plans/2026-06-11-saas-phase1-foundation.md` (`@supabase/ssr` server client,
RLS keyed off `user_tenant_ids()`, `getMembership()` from `@/lib/tenancy`).

---

## Step 1 — Copy the engine in

```bash
# from the proposal-platform repo root
mkdir -p src/lib/hardware
cp -R /path/to/surveillance-markup/hardware-engine/src/* src/lib/hardware/
```

**One porting nuance:** the engine's relative imports carry explicit `.ts` extensions (required by
Node's strip-types loader). Next/SWC wants extensionless specifiers. Strip them on copy:

```bash
# macOS/BSD sed: sed -i ''  ·  GNU sed: sed -i
find src/lib/hardware -name '*.ts' -exec sed -i -E "s/(from '\.[^']*)\.ts'/\1'/g" {} +
```

The engine has **zero runtime dependencies**, so nothing else to install. Its `node --test`
suite can run as-is, or re-point the existing vitest at `src/lib/hardware/**/*.test.ts`.

---

## Step 2 — Migration `supabase/migrations/0003_hardware_revisions.sql`

One row per revision; `input`/`result` are jsonb (they map 1:1 onto the engine's `RevisionRow`).
Tenant-scoped RLS mirrors `0001_tenancy.sql`.

```sql
-- Architectural-hardware revisions: the owner-review version history.
create table public.hardware_revisions (
  id          text primary key,                       -- engine Revision.id
  project_id  uuid not null references public.projects(id)  on delete cascade,
  tenant_id   uuid not null references public.tenants(id)   on delete cascade,
  parent_id   text references public.hardware_revisions(id) on delete set null,
  label       text,
  input       jsonb not null,   -- ProjectInput { openings, options }
  result      jsonb not null,   -- GenerateResult { sets, openingToSet, profiles }
  hash        text not null,
  created_at  timestamptz not null default now()
);
create index hardware_revisions_project_idx
  on public.hardware_revisions (project_id, created_at);

alter table public.hardware_revisions enable row level security;

create policy hardware_rev_select on public.hardware_revisions
  for select using (tenant_id in (select public.user_tenant_ids()));
create policy hardware_rev_insert on public.hardware_revisions
  for insert with check (tenant_id in (select public.user_tenant_ids()));
create policy hardware_rev_delete on public.hardware_revisions
  for delete using (tenant_id in (select public.user_tenant_ids()));
```

```powershell
npx supabase db push
```

---

## Step 3 — Persistence adapter `src/lib/hardware/revisionRepo.ts`

Wraps the engine's `RevisionStore` semantics over Postgres. The DB row adds `project_id` +
`tenant_id`; everything else IS the engine `RevisionRow`.

```ts
import { createClient } from '@/lib/supabase/server';
import { getMembership } from '@/lib/tenancy';
import {
  createRevision, diffRevisions, hashInput, loadStore,
  revisionToRow, type ProjectInput, type Revision, type RevisionDiff, type RevisionRow,
} from '@/lib/hardware';

type DbRow = RevisionRow & { project_id: string; tenant_id: string };

const toEngineRow = (r: DbRow): RevisionRow => ({
  id: r.id, parent_id: r.parent_id, created_at: r.created_at,
  label: r.label, input: r.input, result: r.result, hash: r.hash,
});

/** Rehydrate the full history for a project (oldest -> newest). */
export async function loadHardwareStore(projectId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('hardware_revisions').select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
  return loadStore((data ?? []).map(toEngineRow as (r: unknown) => RevisionRow));
}

/** Commit a new revision (no-op if identical to head). Keeps prior versions. */
export async function commitHardwareRevision(
  projectId: string, input: ProjectInput, label?: string,
): Promise<Revision> {
  const m = await getMembership();
  if (!m) throw new Error('no tenant');
  const store = await loadHardwareStore(projectId);
  const parent = store.head();
  if (parent && parent.hash === hashInput(input)) return parent; // identical -> no new version

  const rev = createRevision(input, { parentId: parent?.id ?? null, label });
  const row = revisionToRow(rev);
  const supabase = await createClient();
  const { error } = await supabase.from('hardware_revisions')
    .insert({ ...row, project_id: projectId, tenant_id: m.tenant_id });
  if (error) throw new Error(error.message);
  return rev;
}

/** Diff head against its parent (the "what changed in this review" payload). */
export async function latestHardwareDiff(projectId: string): Promise<RevisionDiff | null> {
  const store = await loadHardwareStore(projectId);
  const head = store.head();
  if (!head || !head.parentId) return null;
  return store.diff();
}
```

---

## Step 4 — Server actions `src/app/(app)/projects/[id]/hardware/actions.ts`

```ts
'use server';
import { revalidatePath } from 'next/cache';
import { commitHardwareRevision } from '@/lib/hardware/revisionRepo';
import type { ProjectInput } from '@/lib/hardware';

/** Owner submits an edited opening set -> a new retained revision + re-derived hardware. */
export async function commitReview(projectId: string, formData: FormData) {
  const input = JSON.parse(String(formData.get('input'))) as ProjectInput;
  const label = String(formData.get('label') || '') || undefined;
  await commitHardwareRevision(projectId, input, label);
  revalidatePath(`/projects/${projectId}/hardware`);
}
```

(Openings come from the project's uploaded door schedule — parse it with the engine's
`parseScheduleCsv` + `rowsToOpenings` in an upload action, or from the project JSON. The first
commit is the generated draft; subsequent commits are owner edits.)

---

## Step 5 — Review screen `src/app/(app)/projects/[id]/hardware/page.tsx`

Server component: renders the current hardware schedule, the version history, and the diff of the
latest review (added / removed / modified openings with their hardware deltas).

```tsx
import { loadHardwareStore, latestHardwareDiff } from '@/lib/hardware/revisionRepo';
import { renderHardwareSchedule } from '@/lib/hardware';

export default async function HardwarePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await loadHardwareStore(id);
  const head = store.head();
  const diff = await latestHardwareDiff(id);

  return (
    <main className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-xl font-semibold">Hardware</h1>

      <section>
        <h2 className="text-sm font-semibold">Version history ({store.history().length})</h2>
        <ul className="text-sm text-gray-600">
          {store.history().map((r) => (
            <li key={r.id}>{r.label ?? r.id} · {new Date(r.createdAt).toLocaleString()}</li>
          ))}
        </ul>
      </section>

      {diff && (
        <section className="rounded border p-4">
          <h2 className="text-sm font-semibold">Changes in the latest review</h2>
          <p className="text-xs text-gray-500">
            +{diff.summary.added} added · −{diff.summary.removed} removed ·
            {diff.summary.modified} modified · {diff.summary.hardwareChanged} re-specced ·
            sets {diff.summary.setsBefore}→{diff.summary.setsAfter}
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {diff.openings.map((o) => (
              <li key={o.number}>
                <span className="font-mono">{o.number}</span> — <b>{o.status}</b>
                {o.fieldChanges?.map((c) => (
                  <span key={c.field} className="text-gray-600"> · {c.field}: {JSON.stringify(c.from)}→{JSON.stringify(c.to)}</span>
                ))}
                {o.itemDelta && (o.itemDelta.added.length > 0 || o.itemDelta.removed.length > 0) && (
                  <div className="ml-4 text-xs text-gray-500">
                    hardware +[{o.itemDelta.added.join(', ')}] −[{o.itemDelta.removed.join(', ')}]
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {head && (
        <section>
          <h2 className="text-sm font-semibold">Current hardware schedule</h2>
          <pre className="overflow-auto rounded bg-gray-50 p-3 text-xs">
            {renderHardwareSchedule(head.result, { projectName: 'Project' })}
          </pre>
        </section>
      )}
    </main>
  );
}
```

---

## Step 6 — Verify

1. `npx supabase db push` applies `0003`.
2. `node scripts/test-rls.mjs` still green (no cross-tenant leakage).
3. Engine tests pass under vitest (53 tests; they're framework-free).
4. Manual: open a project → commit a draft → edit an opening (e.g. add a fire rating) → commit
   again → the review screen shows the diff and the prior version is still listed.

That's the whole of E5. The hard part — generating correct, code-compliant, priced, versioned
hardware from a real schedule — is already done and tested in `src/lib/hardware`.
```
