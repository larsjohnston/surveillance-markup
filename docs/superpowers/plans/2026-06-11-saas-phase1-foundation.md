# SaaS Phase 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the multi-tenant SaaS foundation — Next.js app, Supabase (ca-central-1) with tenants/roles/RLS, auth (email/password + OAuth buttons), project storage for the existing v34 JSON format, floor-plan file storage, and import of the 5 legacy projects.

**Architecture:** Next.js App Router (TypeScript) talking to Supabase Postgres via `@supabase/ssr` server clients. Tenancy enforced in the database with row-level security keyed off a `memberships` table (never in app code alone). Projects store the existing v34 save JSON as JSONB; floor-plan binaries go to Supabase Storage, not the database. Spec: `docs/superpowers/specs/2026-06-11-saas-platform-design.md`.

**Tech Stack:** Next.js 15 (App Router, TS, Tailwind), Supabase (Postgres + Auth + Storage, region ca-central-1), `@supabase/ssr`, Vitest, Supabase CLI for migrations, Vercel for hosting.

---

## Task 0: Owner prerequisites (no code — Lars does these once)

The engineer cannot create these accounts. Confirm each exists before Task 2:

- [ ] **GitHub repo** `proposal-platform` (private) under the `larsjohnston` account.
- [ ] **Supabase project**: at [supabase.com](https://supabase.com) create org + project named `proposal-platform-dev`, **Region: Canada (Central) — ca-central-1**. Record: Project URL, `anon` key, `service_role` key (Dashboard → Settings → API), and the database password.
- [ ] **Vercel account** connected to the GitHub repo (Task 10 deploys).
- [ ] OAuth consoles (needed when enabling each provider, Task 9 documents the steps): Google Cloud project; Microsoft Entra app registration; Apple Developer Program enrollment (US$99/yr — required for Sign in with Apple; can lag behind launch of the other providers).

> **Repo location note:** the new codebase lives at `C:\Users\lars\proposal-platform` — deliberately **outside OneDrive**. `node_modules` + OneDrive sync causes file-lock chaos and corrupts git perf; the existing OneDrive repo stays where it is for the legacy tool.

---

## Task 1: Scaffold the repo

**Files:**
- Create: `C:\Users\lars\proposal-platform\` (entire Next.js scaffold)
- Create: `vitest.config.ts`, `.env.local.example`

- [ ] **Step 1: Scaffold Next.js**

```powershell
cd C:\Users\lars
npx create-next-app@latest proposal-platform --typescript --tailwind --eslint --app --src-dir --use-npm --import-alias "@/*" --no-turbopack
cd C:\Users\lars\proposal-platform
```

Expected: scaffold completes; `src/app/page.tsx` exists.

- [ ] **Step 2: Add deps**

```powershell
npm install @supabase/supabase-js @supabase/ssr
npm install -D vitest supabase
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: { include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'] },
});
```

- [ ] **Step 4: Create `.env.local.example`** (committed; the real `.env.local` is gitignored by the scaffold)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-anon-key
# server-only — never expose to the browser:
SUPABASE_SERVICE_ROLE_KEY=YOUR-service-role-key
```

- [ ] **Step 5: Add scripts to `package.json`** (merge into existing `scripts` block)

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: Init git, first commit, wire remote**

```powershell
git init -b main
git add -A
git commit -m "chore: Next.js scaffold + vitest + supabase deps"
git remote add origin https://github.com/larsjohnston/proposal-platform.git
git push -u origin main
```

---

## Task 2: Supabase clients + session middleware

**Files:**
- Create: `src/lib/supabase/client.ts` (browser client)
- Create: `src/lib/supabase/server.ts` (server client)
- Create: `src/middleware.ts` (session refresh)
- Create: `.env.local` (from owner's Task 0 values — NOT committed)

- [ ] **Step 1: `src/lib/supabase/client.ts`**

```ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 2: `src/lib/supabase/server.ts`**

```ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // called from a Server Component — middleware refresh handles it
          }
        },
      },
    }
  );
}
```

- [ ] **Step 3: `src/middleware.ts`**

```ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login')
    || request.nextUrl.pathname.startsWith('/signup')
    || request.nextUrl.pathname.startsWith('/auth');
  if (!user && !isAuthRoute && request.nextUrl.pathname !== '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
```

- [ ] **Step 4: Create `.env.local` with the real values from Task 0, then verify boot**

Run: `npm run dev` → open http://localhost:3000
Expected: default Next.js page renders, no console errors about missing env vars.

- [ ] **Step 5: Commit**

```powershell
git add -A; git commit -m "feat: supabase browser/server clients + session middleware"
```

---

## Task 3: Database schema + RLS (migration 0001)

**Files:**
- Create: `supabase/migrations/0001_tenancy.sql`
- Create: `supabase/config.toml` (via CLI init)

- [ ] **Step 1: Init Supabase CLI and link** (project ref from the Supabase dashboard URL)

```powershell
npx supabase init
npx supabase link --project-ref YOUR-PROJECT-REF
```

Expected: prompts for the database password from Task 0; "Finished supabase link."

- [ ] **Step 2: Write `supabase/migrations/0001_tenancy.sql`**

```sql
-- Tenancy core: tenants, memberships (role-gated), projects (v34 JSON as JSONB).
create extension if not exists pgcrypto;

create table public.tenants (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 120),
  branding    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create type public.member_role as enum ('owner_admin', 'estimator', 'salesperson');

create table public.memberships (
  user_id     uuid not null references auth.users(id) on delete cascade,
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  role        public.member_role not null default 'owner_admin',
  created_at  timestamptz not null default now(),
  primary key (user_id, tenant_id)
);

create table public.projects (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.tenants(id) on delete cascade,
  name             text not null default 'Untitled project',
  client           text,
  data             jsonb not null default '{}'::jsonb,   -- the v34 save JSON (sourceDocument.data stripped)
  source_doc_path  text,                                  -- Storage object path for the floor-plan PDF/image
  save_version     int  not null default 34,
  created_by       uuid references auth.users(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index projects_tenant_idx on public.projects (tenant_id, updated_at desc);

-- SECURITY DEFINER helper: a membership policy that queries memberships
-- recurses infinitely under RLS; this function bypasses RLS safely.
create or replace function public.user_tenant_ids()
returns setof uuid
language sql stable security definer set search_path = public as
$$ select tenant_id from public.memberships where user_id = auth.uid() $$;

alter table public.tenants     enable row level security;
alter table public.memberships enable row level security;
alter table public.projects    enable row level security;

create policy tenants_member_select on public.tenants
  for select using (id in (select public.user_tenant_ids()));
create policy tenants_admin_update on public.tenants
  for update using (
    id in (select tenant_id from public.memberships
           where user_id = auth.uid() and role = 'owner_admin')
  );

create policy memberships_visible on public.memberships
  for select using (
    user_id = auth.uid() or tenant_id in (select public.user_tenant_ids())
  );

create policy projects_member_select on public.projects
  for select using (tenant_id in (select public.user_tenant_ids()));
create policy projects_member_insert on public.projects
  for insert with check (
    tenant_id in (select public.user_tenant_ids()) and created_by = auth.uid()
  );
create policy projects_member_update on public.projects
  for update using (tenant_id in (select public.user_tenant_ids()));
create policy projects_member_delete on public.projects
  for delete using (tenant_id in (select public.user_tenant_ids()));

-- Onboarding: first sign-in creates a tenant + owner_admin membership atomically.
create or replace function public.create_tenant(p_name text)
returns uuid
language plpgsql security definer set search_path = public as
$$
declare v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if exists (select 1 from public.memberships where user_id = auth.uid()) then
    raise exception 'user already belongs to a tenant';
  end if;
  insert into public.tenants (name) values (p_name) returning id into v_id;
  insert into public.memberships (user_id, tenant_id, role)
    values (auth.uid(), v_id, 'owner_admin');
  return v_id;
end
$$;
revoke execute on function public.create_tenant(text) from public, anon;
grant  execute on function public.create_tenant(text) to authenticated;

-- updated_at maintenance
create or replace function public.touch_updated_at()
returns trigger language plpgsql as
$$ begin new.updated_at = now(); return new; end $$;
create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();
```

- [ ] **Step 3: Push the migration**

```powershell
npx supabase db push
```

Expected: `Applying migration 0001_tenancy.sql... Finished supabase db push.`

- [ ] **Step 4: Verify in SQL editor** (Supabase Dashboard → SQL):

```sql
select tablename, rowsecurity from pg_tables where schemaname='public';
```

Expected: `tenants`, `memberships`, `projects` all `rowsecurity = true`.

- [ ] **Step 5: Commit**

```powershell
git add supabase; git commit -m "feat: tenancy schema + RLS + create_tenant rpc (migration 0001)"
```

---

## Task 4: RLS integration test script

Proves cross-tenant isolation with real anon-key clients before any UI exists.

**Files:**
- Create: `scripts/test-rls.mjs`

- [ ] **Step 1: Write `scripts/test-rls.mjs`**

```js
// RLS isolation test against the dev Supabase project.
// Usage: node scripts/test-rls.mjs   (reads .env.local)
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.+)$/);
  if (m) process.env[m[1]] = m[2].trim();
}
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });
let pass = 0, fail = 0;
const ok = (cond, msg) => { cond ? pass++ : (fail++, console.error('FAIL:', msg)); };

async function makeUser(email) {
  const { data, error } = await admin.auth.admin.createUser({ email, password: 'Rls-test-pass-1!', email_confirm: true });
  if (error && !String(error.message).includes('already')) throw error;
  if (data?.user) return data.user;
  const { data: list } = await admin.auth.admin.listUsers();
  return list.users.find(u => u.email === email);
}
async function signedClient(email) {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: 'Rls-test-pass-1!' });
  if (error) throw error;
  return c;
}

const userA = await makeUser('rls-a@test.local');
const userB = await makeUser('rls-b@test.local');
const a = await signedClient('rls-a@test.local');
const b = await signedClient('rls-b@test.local');

// each user bootstraps their own tenant (idempotent: ignore "already belongs")
const { data: tA, error: eA } = await a.rpc('create_tenant', { p_name: 'Tenant A' });
const { data: tB, error: eB } = await b.rpc('create_tenant', { p_name: 'Tenant B' });
ok(!eA || /already belongs/.test(eA.message), 'A creates tenant: ' + (eA && eA.message));
ok(!eB || /already belongs/.test(eB.message), 'B creates tenant: ' + (eB && eB.message));

const { data: aTenants } = await a.from('tenants').select('id');
const { data: bTenants } = await b.from('tenants').select('id');
ok(aTenants?.length === 1, `A sees exactly 1 tenant (got ${aTenants?.length})`);
ok(bTenants?.length === 1, `B sees exactly 1 tenant (got ${bTenants?.length})`);
ok(aTenants[0].id !== bTenants[0].id, 'A and B see different tenants');

// A creates a project; B must not see it
const { error: insErr } = await a.from('projects').insert({
  tenant_id: aTenants[0].id, name: 'RLS probe', data: { version: 34 }, created_by: userA.id,
});
ok(!insErr, 'A inserts project: ' + (insErr && insErr.message));
const { data: bProjects } = await b.from('projects').select('id').eq('tenant_id', aTenants[0].id);
ok(bProjects?.length === 0, `B sees 0 of A's projects (got ${bProjects?.length})`);

// B must not insert into A's tenant
const { error: crossErr } = await b.from('projects').insert({
  tenant_id: aTenants[0].id, name: 'should fail', data: {}, created_by: userB.id,
});
ok(!!crossErr, 'B blocked from inserting into A tenant');

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: Run it**

Run: `node scripts/test-rls.mjs`
Expected: `8 passed, 0 failed` (first run; reruns also pass — script is idempotent).

- [ ] **Step 3: Commit**

```powershell
git add scripts/test-rls.mjs; git commit -m "test: RLS cross-tenant isolation script"
```

---

## Task 5: Auth — signup, login, logout, OAuth buttons

**Files:**
- Create: `src/app/login/page.tsx`
- Create: `src/app/signup/page.tsx`
- Create: `src/app/auth/actions.ts`
- Create: `src/app/auth/callback/route.ts`
- Create: `src/app/auth/oauth-buttons.tsx`

- [ ] **Step 1: `src/app/auth/actions.ts`** (server actions)

```ts
'use server';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: String(formData.get('email')),
    password: String(formData.get('password')),
  });
  if (error) redirect('/signup?error=' + encodeURIComponent(error.message));
  redirect('/onboarding');
}

export async function login(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get('email')),
    password: String(formData.get('password')),
  });
  if (error) redirect('/login?error=' + encodeURIComponent(error.message));
  redirect('/projects');
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
```

- [ ] **Step 2: `src/app/auth/oauth-buttons.tsx`** (client component; one code path for all three providers — each activates when its dashboard config lands, Task 9)

```tsx
'use client';
import { createClient } from '@/lib/supabase/client';

const PROVIDERS = [
  { id: 'google', label: 'Continue with Google' },
  { id: 'azure', label: 'Continue with Microsoft' },
  { id: 'apple', label: 'Continue with Apple' },
] as const;

export function OAuthButtons() {
  const signIn = async (provider: (typeof PROVIDERS)[number]['id']) => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  };
  return (
    <div className="flex flex-col gap-2">
      {PROVIDERS.map((p) => (
        <button key={p.id} onClick={() => signIn(p.id)}
          className="rounded border px-4 py-2 text-sm hover:bg-gray-50">
          {p.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: `src/app/auth/callback/route.ts`** (OAuth code exchange)

```ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(`${origin}/projects`);
}
```

- [ ] **Step 4: `src/app/login/page.tsx`**

```tsx
import { login } from '@/app/auth/actions';
import { OAuthButtons } from '@/app/auth/oauth-buttons';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto mt-24 max-w-sm space-y-4 p-4">
      <h1 className="text-xl font-semibold">Sign in</h1>
      {error && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      <form action={login} className="space-y-3">
        <input name="email" type="email" required placeholder="Email"
          className="w-full rounded border px-3 py-2 text-sm" />
        <input name="password" type="password" required placeholder="Password"
          className="w-full rounded border px-3 py-2 text-sm" />
        <button className="w-full rounded bg-blue-700 px-4 py-2 text-sm text-white">Sign in</button>
      </form>
      <OAuthButtons />
      <p className="text-sm text-gray-500">No account? <a className="underline" href="/signup">Sign up</a></p>
    </main>
  );
}
```

- [ ] **Step 5: `src/app/signup/page.tsx`**

```tsx
import { signup } from '@/app/auth/actions';
import { OAuthButtons } from '@/app/auth/oauth-buttons';

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto mt-24 max-w-sm space-y-4 p-4">
      <h1 className="text-xl font-semibold">Create your account</h1>
      {error && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      <form action={signup} className="space-y-3">
        <input name="email" type="email" required placeholder="Email"
          className="w-full rounded border px-3 py-2 text-sm" />
        <input name="password" type="password" required minLength={8} placeholder="Password (8+ chars)"
          className="w-full rounded border px-3 py-2 text-sm" />
        <button className="w-full rounded bg-blue-700 px-4 py-2 text-sm text-white">Sign up</button>
      </form>
      <OAuthButtons />
      <p className="text-sm text-gray-500">Have an account? <a className="underline" href="/login">Sign in</a></p>
    </main>
  );
}
```

- [ ] **Step 6: Manual verification** (Supabase Dashboard → Auth → Providers → Email: disable "Confirm email" on the dev project so signup is immediate)

Run: `npm run dev` → /signup with a test email → expect redirect to `/onboarding` (404 until Task 6 — that's fine, the session cookie is set). Then /login with the same creds → redirect to `/projects` (404 until Task 7).

- [ ] **Step 7: Commit**

```powershell
git add src/app; git commit -m "feat: email/password auth + OAuth buttons + callback route"
```

---

## Task 6: Onboarding + app shell

**Files:**
- Create: `src/app/onboarding/page.tsx`
- Create: `src/app/onboarding/actions.ts`
- Create: `src/lib/tenancy.ts`
- Create: `src/app/(app)/layout.tsx`

- [ ] **Step 1: `src/lib/tenancy.ts`** (single source for "who am I / which tenant / which role")

```ts
import { createClient } from '@/lib/supabase/server';

export type Membership = {
  tenant_id: string;
  role: 'owner_admin' | 'estimator' | 'salesperson';
  tenants: { id: string; name: string; branding: Record<string, unknown> };
};

export async function getMembership(): Promise<Membership | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('memberships')
    .select('tenant_id, role, tenants ( id, name, branding )')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();
  return (data as unknown as Membership) ?? null;
}
```

- [ ] **Step 2: `src/app/onboarding/actions.ts`**

```ts
'use server';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function createTenant(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc('create_tenant', {
    p_name: String(formData.get('company')),
  });
  if (error) redirect('/onboarding?error=' + encodeURIComponent(error.message));
  redirect('/projects');
}
```

- [ ] **Step 3: `src/app/onboarding/page.tsx`**

```tsx
import { createTenant } from './actions';
import { getMembership } from '@/lib/tenancy';
import { redirect } from 'next/navigation';

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getMembership()) redirect('/projects');
  const { error } = await searchParams;
  return (
    <main className="mx-auto mt-24 max-w-sm space-y-4 p-4">
      <h1 className="text-xl font-semibold">Set up your company</h1>
      {error && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      <form action={createTenant} className="space-y-3">
        <input name="company" required maxLength={120} placeholder="Company name"
          className="w-full rounded border px-3 py-2 text-sm" />
        <button className="w-full rounded bg-blue-700 px-4 py-2 text-sm text-white">Create workspace</button>
      </form>
    </main>
  );
}
```

- [ ] **Step 4: `src/app/(app)/layout.tsx`** (protected shell; every in-app page lives in this route group)

```tsx
import { getMembership } from '@/lib/tenancy';
import { logout } from '@/app/auth/actions';
import { redirect } from 'next/navigation';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const m = await getMembership();
  if (!m) redirect('/onboarding');
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b px-4 py-2 text-sm">
        <span className="font-semibold">{m.tenants.name}</span>
        <span className="flex items-center gap-3 text-gray-500">
          {m.role}
          <form action={logout}><button className="underline">Sign out</button></form>
        </span>
      </header>
      <div className="p-4">{children}</div>
    </div>
  );
}
```

- [ ] **Step 5: Verify** — sign in with the Task 5 test user → /onboarding → create company → lands on /projects (404 body but the layout header shows company + role + Sign out).

- [ ] **Step 6: Commit**

```powershell
git add src; git commit -m "feat: onboarding (create_tenant) + protected app shell with tenancy helper"
```

---

## Task 7: Projects — storage bucket, list, create, save/load

**Files:**
- Create: `supabase/migrations/0002_storage.sql`
- Create: `src/app/(app)/projects/page.tsx`
- Create: `src/app/(app)/projects/actions.ts`
- Create: `src/app/(app)/projects/[id]/page.tsx`

- [ ] **Step 1: `supabase/migrations/0002_storage.sql`** (bucket + tenant-prefixed object policies)

```sql
insert into storage.buckets (id, name, public) values ('floorplans', 'floorplans', false)
on conflict (id) do nothing;

-- Object paths are '<tenant_id>/<project_id>/<filename>'; first folder must be
-- a tenant the user belongs to.
create policy floorplans_member_read on storage.objects
  for select using (
    bucket_id = 'floorplans'
    and (storage.foldername(name))[1] in (select public.user_tenant_ids()::text)
  );
create policy floorplans_member_write on storage.objects
  for insert with check (
    bucket_id = 'floorplans'
    and (storage.foldername(name))[1] in (select public.user_tenant_ids()::text)
  );
create policy floorplans_member_delete on storage.objects
  for delete using (
    bucket_id = 'floorplans'
    and (storage.foldername(name))[1] in (select public.user_tenant_ids()::text)
  );
```

Run: `npx supabase db push` → Expected: migration applies. (If `user_tenant_ids()::text` errors on your CLI version, use `(select tenant_id::text from public.memberships where user_id = auth.uid())`.)

- [ ] **Step 2: `src/app/(app)/projects/actions.ts`**

```ts
'use server';
import { createClient } from '@/lib/supabase/server';
import { getMembership } from '@/lib/tenancy';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export async function createProject(formData: FormData) {
  const m = await getMembership();
  if (!m) redirect('/onboarding');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('projects')
    .insert({
      tenant_id: m.tenant_id,
      name: String(formData.get('name') || 'Untitled project'),
      client: String(formData.get('client') || '') || null,
      data: { version: 34 },
      created_by: user!.id,
    })
    .select('id')
    .single();
  if (error) redirect('/projects?error=' + encodeURIComponent(error.message));
  redirect(`/projects/${data.id}`);
}

export async function uploadFloorplan(projectId: string, formData: FormData) {
  const m = await getMembership();
  if (!m) redirect('/onboarding');
  const file = formData.get('file') as File;
  if (!file || file.size === 0) return;
  const supabase = await createClient();
  const path = `${m.tenant_id}/${projectId}/${file.name}`;
  const { error } = await supabase.storage.from('floorplans').upload(path, file, { upsert: true });
  if (!error) {
    await supabase.from('projects').update({ source_doc_path: path }).eq('id', projectId);
  }
  revalidatePath(`/projects/${projectId}`);
}
```

- [ ] **Step 3: `src/app/(app)/projects/page.tsx`**

```tsx
import { createClient } from '@/lib/supabase/server';
import { createProject } from './actions';

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, client, updated_at')
    .order('updated_at', { ascending: false });
  return (
    <main className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold">Projects</h1>
      <form action={createProject} className="flex gap-2">
        <input name="name" required placeholder="Project name" className="rounded border px-3 py-2 text-sm" />
        <input name="client" placeholder="Client" className="rounded border px-3 py-2 text-sm" />
        <button className="rounded bg-blue-700 px-4 py-2 text-sm text-white">New project</button>
      </form>
      <ul className="divide-y rounded border">
        {(projects ?? []).map((p) => (
          <li key={p.id} className="flex justify-between p-3 text-sm">
            <a className="font-medium underline" href={`/projects/${p.id}`}>{p.name}</a>
            <span className="text-gray-500">{p.client} · {new Date(p.updated_at).toLocaleDateString()}</span>
          </li>
        ))}
        {(projects ?? []).length === 0 && <li className="p-3 text-sm text-gray-500">No projects yet.</li>}
      </ul>
    </main>
  );
}
```

- [ ] **Step 4: `src/app/(app)/projects/[id]/page.tsx`** (Phase 1 detail view: metadata, floor-plan upload, raw JSON download — the React canvas arrives in Phase 2)

```tsx
import { createClient } from '@/lib/supabase/server';
import { uploadFloorplan } from '../actions';
import { notFound } from 'next/navigation';

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: p } = await supabase.from('projects').select('*').eq('id', id).maybeSingle();
  if (!p) notFound();
  const uploadWithId = uploadFloorplan.bind(null, p.id);
  let floorplanUrl: string | null = null;
  if (p.source_doc_path) {
    const { data } = await supabase.storage.from('floorplans').createSignedUrl(p.source_doc_path, 3600);
    floorplanUrl = data?.signedUrl ?? null;
  }
  const jsonHref = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(p.data, null, 2));
  return (
    <main className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold">{p.name}</h1>
      <p className="text-sm text-gray-500">Client: {p.client ?? '—'} · Save format v{p.save_version}</p>
      <section className="space-y-2 rounded border p-4">
        <h2 className="text-sm font-semibold">Floor plan source</h2>
        {floorplanUrl
          ? <a className="text-sm underline" href={floorplanUrl}>Download current file</a>
          : <p className="text-sm text-gray-500">None uploaded.</p>}
        <form action={uploadWithId} className="flex items-center gap-2">
          <input name="file" type="file" accept=".pdf,image/*" className="text-sm" />
          <button className="rounded border px-3 py-1 text-sm">Upload</button>
        </form>
      </section>
      <section className="space-y-2 rounded border p-4">
        <h2 className="text-sm font-semibold">Project data (v34 JSON)</h2>
        <a className="text-sm underline" download={`${p.name}.json`} href={jsonHref}>Export JSON</a>
      </section>
    </main>
  );
}
```

- [ ] **Step 5: Verify** — create a project, upload a small PDF, refresh: signed download link appears; Export JSON downloads `{"version": 34}`. Re-run `node scripts/test-rls.mjs` → still `8 passed, 0 failed`.

- [ ] **Step 6: Commit**

```powershell
git add -A; git commit -m "feat: projects list/create/detail + floorplan storage with tenant-scoped policies"
```

---

## Task 8: Legacy import — normalizer (TDD) + import script

**Files:**
- Create: `src/lib/legacy/normalize.ts`
- Test:   `src/lib/legacy/normalize.test.ts`
- Create: `scripts/import-legacy.mjs`

- [ ] **Step 1: Write the failing test `src/lib/legacy/normalize.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { normalizeLegacyProject } from './normalize';

const legacy = {
  version: 34,
  sourceDocument: { type: 'pdf', mime: 'application/pdf', name: 'plan.pdf', data: 'QUJD' },
  projectInfo: { name: 'Wolf Willow', client: 'Brad Remmington Homes' },
  cameras: [{ id: '1', page: 0, x: 1, y: 2 }],
};

describe('normalizeLegacyProject', () => {
  it('strips the base64 source bytes but keeps the metadata', () => {
    const r = normalizeLegacyProject(legacy);
    expect(r.data.sourceDocument).toEqual({ type: 'pdf', mime: 'application/pdf', name: 'plan.pdf', data: null });
    expect(r.sourceBytes).toBeInstanceOf(Uint8Array);
    expect(Array.from(r.sourceBytes!)).toEqual([0x41, 0x42, 0x43]); // 'ABC'
    expect(r.sourceName).toBe('plan.pdf');
    expect(r.sourceMime).toBe('application/pdf');
  });
  it('extracts name/client/version for the projects row', () => {
    const r = normalizeLegacyProject(legacy);
    expect(r.name).toBe('Wolf Willow');
    expect(r.client).toBe('Brad Remmington Homes');
    expect(r.saveVersion).toBe(34);
  });
  it('handles projects with no embedded source document', () => {
    const r = normalizeLegacyProject({ version: 30, projectInfo: {} });
    expect(r.sourceBytes).toBeNull();
    expect(r.name).toBe('Untitled project');
    expect(r.saveVersion).toBe(30);
  });
  it('rejects non-object input', () => {
    expect(() => normalizeLegacyProject(null as never)).toThrow();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test`
Expected: FAIL — `Cannot find module './normalize'`.

- [ ] **Step 3: Implement `src/lib/legacy/normalize.ts`**

```ts
// Normalizes a legacy single-file-tool save (v10..v34) for platform storage:
// the JSON keeps everything EXCEPT the embedded base64 floor-plan bytes,
// which are returned separately for upload to Storage.
export type NormalizedLegacy = {
  name: string;
  client: string | null;
  saveVersion: number;
  data: Record<string, unknown>;
  sourceBytes: Uint8Array | null;
  sourceName: string | null;
  sourceMime: string | null;
};

export function normalizeLegacyProject(raw: Record<string, unknown>): NormalizedLegacy {
  if (!raw || typeof raw !== 'object') throw new Error('legacy project must be an object');
  const data = JSON.parse(JSON.stringify(raw)) as Record<string, unknown>;
  const info = (data.projectInfo ?? {}) as Record<string, unknown>;

  let sourceBytes: Uint8Array | null = null;
  let sourceName: string | null = null;
  let sourceMime: string | null = null;
  const doc = data.sourceDocument as Record<string, unknown> | null | undefined;
  if (doc && typeof doc.data === 'string' && doc.data.length > 0) {
    const binary = typeof atob === 'function'
      ? atob(doc.data)
      : Buffer.from(doc.data, 'base64').toString('binary');
    sourceBytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    sourceName = (doc.name as string) ?? 'floorplan';
    sourceMime = (doc.mime as string) ?? 'application/octet-stream';
    doc.data = null; // metadata stays, bytes move to Storage
  }
  return {
    name: (info.name as string)?.trim() || 'Untitled project',
    client: (info.client as string)?.trim() || null,
    saveVersion: typeof data.version === 'number' ? (data.version as number) : 0,
    data,
    sourceBytes,
    sourceName,
    sourceMime,
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: `4 passed`.

- [ ] **Step 5: Write `scripts/import-legacy.mjs`**

```js
// Imports legacy .json saves into the platform.
// Usage: node scripts/import-legacy.mjs <tenant_id> <file1.json> [file2.json ...]
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { normalizeLegacyProject } from '../src/lib/legacy/normalize.ts';

for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.+)$/);
  if (m) process.env[m[1]] = m[2].trim();
}
const [tenantId, ...files] = process.argv.slice(2);
if (!tenantId || files.length === 0) {
  console.error('Usage: node scripts/import-legacy.mjs <tenant_id> <file.json> ...');
  process.exit(1);
}
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

for (const file of files) {
  const raw = JSON.parse(readFileSync(file, 'utf8'));
  const n = normalizeLegacyProject(raw);
  const { data: row, error } = await admin.from('projects').insert({
    tenant_id: tenantId, name: n.name, client: n.client,
    data: n.data, save_version: n.saveVersion,
  }).select('id').single();
  if (error) { console.error(`${basename(file)}: ${error.message}`); continue; }
  if (n.sourceBytes) {
    const path = `${tenantId}/${row.id}/${n.sourceName}`;
    const { error: upErr } = await admin.storage.from('floorplans')
      .upload(path, n.sourceBytes, { contentType: n.sourceMime, upsert: true });
    if (upErr) { console.error(`${basename(file)} upload: ${upErr.message}`); continue; }
    await admin.from('projects').update({ source_doc_path: path }).eq('id', row.id);
  }
  console.log(`imported: ${n.name} (${basename(file)}) -> ${row.id}`);
}
```

Note: running a `.ts` import from an `.mjs` script needs Node 22.6+ (type stripping) — run with `node --experimental-strip-types scripts/import-legacy.mjs ...`; if the installed Node refuses, run via `npx tsx scripts/import-legacy.mjs ...` instead (add `tsx` as a dev dep).

- [ ] **Step 6: Import the 5 real projects** — Lars supplies the 5 `.json` paths and his real tenant id (visible in Supabase → Table Editor → tenants). Expected output: 5 `imported: ...` lines; each project opens in /projects with a working floor-plan download.

- [ ] **Step 7: Commit**

```powershell
git add -A; git commit -m "feat: legacy v34 normalizer (TDD) + import script; 5 legacy projects imported"
```

---

## Task 9: OAuth provider configuration docs

**Files:**
- Create: `docs/auth-providers.md`

- [ ] **Step 1: Write `docs/auth-providers.md`**

```markdown
# Enabling OAuth providers (Supabase Dashboard → Authentication → Providers)

The app code (OAuthButtons + /auth/callback) is provider-agnostic; each provider
goes live the moment it's configured here. Callback URL for ALL providers:
`https://YOUR-PROJECT-ref.supabase.co/auth/v1/callback`

## Google
1. console.cloud.google.com → APIs & Services → Credentials → Create OAuth client ID (Web).
2. Authorized redirect URI = the callback URL above.
3. Copy Client ID + Secret into Supabase → Providers → Google. Enable.

## Microsoft (Azure)
1. portal.azure.com → Microsoft Entra ID → App registrations → New.
2. Supported accounts: "Accounts in any organizational directory and personal
   Microsoft accounts". Redirect URI (Web) = the callback URL.
3. Certificates & secrets → New client secret. Copy Application (client) ID +
   secret into Supabase → Providers → Azure. Enable.

## Apple
1. Requires Apple Developer Program (US$99/yr).
2. developer.apple.com → Identifiers → new App ID + Services ID (enable
   "Sign in with Apple"); configure the callback URL as the Return URL.
3. Keys → new key with Sign in with Apple → download .p8.
4. Supabase → Providers → Apple: Services ID, Team ID, Key ID, .p8 contents. Enable.

Until a provider is configured, its button errors with "provider is not
enabled" — expected, not a bug.
```

- [ ] **Step 2: Commit**

```powershell
git add docs; git commit -m "docs: OAuth provider setup (Google/Microsoft/Apple)"
```

---

## Task 10: Deploy to Vercel

- [ ] **Step 1:** Push `main`; in vercel.com → Add New Project → import `larsjohnston/proposal-platform`. Framework auto-detects Next.js.
- [ ] **Step 2:** Environment variables (Production + Preview): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] **Step 3:** In Supabase → Authentication → URL Configuration: set Site URL to the Vercel production URL; add `https://<vercel-domain>/auth/callback` to Redirect URLs.
- [ ] **Step 4: Smoke test on production:** sign up fresh user → onboarding → create project → upload floor plan → export JSON → sign out → sign in. All six steps green = Phase 1 done.

---

## Self-review checklist (done at authoring)

- **Spec coverage:** foundation phase items all covered — scaffold (T1), clients (T2), tenancy+RLS (T3, verified T4), auth incl. 4 providers (T5 code + T9 config), onboarding/roles surface (T6), project CRUD + storage (T7), 5-project import (T8), deploy (T10). Cost-price isolation, pricing, proposals, billing = later phases by design.
- **No placeholders:** every code step carries full code; commands carry expected output.
- **Type consistency:** `getMembership()`/`Membership` (T6) used in T7 actions; `normalizeLegacyProject`/`NormalizedLegacy` consistent between T8 test/impl/script; `user_tenant_ids()` defined in 0001, referenced in 0002.
```
