# Pass: Pricing Cloud Backend

*Promoted to #1 priority. Blocks all downstream pricing-dependent work — Credentials, DHW Revamp, Proposal Wizard all depend on the price book being live + maintainable.*

## Goal

Move pricing data off local disk + into a private cloud backend so:
- Catalogs stay private (not exposed in any public client JS or browser file).
- New vendor catalogs can be uploaded through a Pricing menu in the tool (no terminal / git knowledge required for the integrator).
- The tool fetches the latest book on load + caches it locally for offline.
- Multi-tenant API contract from day one (single tenant hardcoded for now).

Architecture: Cloudflare Worker → private GitHub repo → fetch on tool boot.

## Architecture

```
┌──────────────────────────┐
│ camera_markup_tool.html  │   the existing tool, client-side JS
│ (browser)                │
└──────────┬───────────────┘
           │ fetch with X-Auth-Token header
           ▼
┌──────────────────────────────────┐
│ Cloudflare Worker                │   pricing.smartmf.workers.dev (or custom domain)
│ pricing-worker/src/index.js      │
│  - validates X-Auth-Token        │
│  - resolves tenant → repo coords │
│  - proxies to GitHub Contents API│
└──────────┬───────────────────────┘
           │ GitHub API (PAT auth, server-side only)
           ▼
┌─────────────────────────────────────────┐
│ Private GitHub repo: smart-mf-pricing   │
│   pricingBook.json                      │   ← the current book
│   history via git commits               │   ← versioning + audit
└─────────────────────────────────────────┘
```

- Worker holds GitHub PAT in env var (`GITHUB_TOKEN`) + auth secret (`ADMIN_SECRET`).
- Tool's client JS only knows the Worker URL + admin secret (the secret lives in localStorage after one-time setup).
- GitHub PAT is NEVER in client JS — Worker is the trust boundary.

## Decisions (locked)

1. **Backend platform**: Cloudflare Workers (free tier; 100K requests/day; edge-deployed; JS-native; zero cold-start).
2. **Auth**: Single shared admin secret in `X-Auth-Token` header. Both GET (read) and POST (upload) require it (catalogs are private). Secret lives in tool's localStorage after one-time entry via the Pricing menu. OAuth deferred to SaaS launch.
3. **Multi-tenant API contract** from day one: every request carries `tenant` query param (or path). Worker resolves to per-tenant repo coordinates from an internal map. For now: hardcoded single tenant `smartmf`.
4. **Upload format**: User uploads pre-converted `pricingBook.json` (runs `build_pricing_json.py` locally first). Worker validates shape + commits as-is. Converter stays Python / local — moving it to backend is a v2 concern.
5. **Offline fallback**: Tool caches last-fetched book in localStorage. On boot, fetch fresh; on failure, fall back to cache + show "offline mode" indicator. New requests retry on next page load.
6. **Local file picker** stays as power-user fallback (File menu → Pricing → "Use local file"). Both paths converge on the same `setPricingBook(book)` API in the tool.
7. **Pricing menu UX**: single modal with status + actions + advanced settings (see Pricing menu UX below).
8. **Rollback / version history UI**: deferred. Git commits in the private repo are the audit trail. Manual `git revert` for now.

## API contract

**Base URL** (TBD at infra setup): `https://pricing.smartmf.workers.dev` (or custom domain).

### GET /api/pricing?tenant=smartmf

Fetch current pricing book.

- **Headers**: `X-Auth-Token: <admin-secret>` (required)
- **200**: `{ pricingBook: {...}, meta: { commit: '<sha7>', timestamp: '<ISO8601>', author: '<github-username>' } }`
- **401**: `{ error: 'unauthorized' }`
- **404**: `{ error: 'tenant not found' }`
- **502**: `{ error: 'upstream github error', detail: '...' }`

### POST /api/pricing?tenant=smartmf

Upload + commit a new pricing book.

- **Headers**: `X-Auth-Token: <admin-secret>`, `Content-Type: application/json`
- **Body**: `{ pricingBook: {...}, message?: 'optional commit message' }`
- **200**: `{ commit: '<sha7>', timestamp: '<ISO8601>' }`
- **401**: `{ error: 'unauthorized' }`
- **422**: `{ error: 'invalid pricingBook shape', detail: '...' }` (Worker runs lightweight schema check before commit)
- **502**: `{ error: 'upstream github error', detail: '...' }`

### GET /api/pricing/history?tenant=smartmf (deferred per decision 8)

Returns last N commits. Not implemented this pass.

### CORS

- Worker allows requests from `claude.ai`, `localhost:8000`, `file://` (for dev), and the eventual production tool URL.

## Pricing menu UX

File menu → "Pricing..." opens a modal with three sections:

### Section 1 — Status

- **Source**: "Cloud" (default) or "Local file" (advanced).
- **Last synced**: `2026-06-01 14:32 UTC (commit abc123 by lars)` — or "Never synced — cache empty".
- **Offline indicator**: red badge if last sync failed.

### Section 2 — Actions

- **Sync now** button — calls `fetchRemotePricing()`, refreshes status + book.
- **Upload new pricing file** — file picker → reads JSON → POST to Worker → on success refreshes status + book.
- **Reload from cache** button — uses localStorage cache without contacting Worker.

### Section 3 — Advanced

- **Auth token** — input field (masked after entry); stored in localStorage `pricingAuthToken`. Edit / clear.
- **Worker URL** — read-only by default; editable if user toggles "Override default URL" (for dev / staging).
- **Use local file instead** — file picker (mirrors current File menu → Load Pricing). Loaded book persists per session but does NOT push to cloud.
- **Clear local cache** — wipes localStorage key + forces fresh fetch on next sync.

## What this pass adds

**New worker repo (`pricing-worker/`)** — separate workspace, sibling to the tool repo. Tracked here as a new directory in main repo OR as its own repo (CC's choice during P0 setup — recommend sibling directory for simplicity).
- `wrangler.toml` — Cloudflare Wrangler config (project name, env, KV/Durable Objects placeholders for future, route).
- `src/index.js` — Worker code (~150 lines):
  - Request router (GET vs POST + tenant param).
  - Auth middleware.
  - GitHub Contents API client (uses `octokit` or raw fetch).
  - Pricing book validator (basic shape check).
  - Error handler with sensible HTTP codes.
- `README.md` — deploy + env var setup instructions.

**Tool changes (`camera_markup_tool.html`)**:
- `fetchRemotePricing(opts)` async fn — calls Worker GET endpoint, returns book + meta.
- `uploadPricing(book, message)` async fn — calls Worker POST endpoint.
- localStorage keys: `pricingBookCache`, `pricingMeta`, `pricingAuthToken`, `pricingWorkerUrl`.
- New Pricing menu modal markup + handlers.
- On tool boot: read from cache → kick off fresh fetch in background → update if newer.
- "Offline mode" status indicator in main UI (subtle — small badge near the pricing-loaded indicator).

**Private GitHub repo (`smart-mf-pricing`)** — created out-of-band (P0 infra setup). Holds `pricingBook.json` + optional source xlsx/csv. Commits = audit trail.

## What this pass does NOT add

- Multi-user / multi-account auth (OAuth). Single shared secret only.
- Server-side conversion (xlsx → JSON happens locally via `build_pricing_json.py`).
- Rollback UI / version history list (git commits are the audit trail).
- Real-time sync (manual sync only — tool fetches on boot + on user-initiated "Sync now").
- Multi-tenant management UI (tenant map is hardcoded server-side).
- Audit logging beyond git commits.
- Rate limiting (Cloudflare's defaults apply; not enforced in Worker code).

## Save shape changes

Project save shape unchanged. The pricing book is global state, not project state. Cache lives in localStorage outside the project save envelope.

New localStorage keys (NOT in project save):
- `pricingBookCache` — last fetched book (JSON-stringified).
- `pricingMeta` — `{ commit, timestamp, author }` from last successful sync.
- `pricingAuthToken` — admin secret (masked input).
- `pricingWorkerUrl` — Worker URL (default hardcoded; editable in Advanced).
- `pricingSource` — `'cloud'` or `'local'` (last load source).

## Recon items

1. **Existing pricing load path** — `setPricingBook` / `getPricingBook` / `clearPricingBook` / `isPricingLoaded` / `validatePricingBook` line numbers + their localStorage interactions. Confirm the new `fetchRemotePricing` can call `setPricingBook` directly without breaking any caller.
2. **Existing File menu → Load Pricing** entry — how it's wired, what handler it calls (`openPricingFilePicker`?). Confirm it stays as the "Use local file" advanced action.
3. **Tool's bootstrap sequence** — where to inject the auto-fetch on load. After DOM ready + before first canvas render.
4. **Error handling pattern** — how other async ops in the tool report errors (toast? modal? console only?). Match for Worker errors.
5. **Pricing-loaded indicator** in the main UI — where it renders + how to add the offline-mode badge alongside.
6. **CORS preflight** — Worker must handle OPTIONS requests. Confirm exact origins to allow.
7. **GitHub Contents API** behavior:
   - Reading: `GET /repos/{owner}/{repo}/contents/{path}` returns base64-encoded content + sha.
   - Writing: `PUT /repos/{owner}/{repo}/contents/{path}` requires previous sha for atomic update. Worker fetches current sha → writes new content with that sha.
   - Rate limit: 5000 req/hr per token. Plenty for solo / small team.

## Phases (one commit per phase except P0)

### P0 — Infra setup (OUT-OF-BAND, no code commit)

User-side, sequential:
1. Create private GitHub repo `smart-mf-pricing` (or whatever name).
2. Generate a fine-grained Personal Access Token with `repo` scope on that single repo. Copy + secure.
3. Sign up for Cloudflare account (free tier).
4. Install Wrangler CLI locally: `npm install -g wrangler`.
5. Pick a Worker name (`pricing.smartmf.workers.dev` or custom domain). Reserve via Cloudflare dashboard.
6. Generate the admin secret (random 32-char string, store in 1Password / secret manager).

Outputs needed before P1:
- GitHub repo URL.
- PAT value.
- Worker subdomain reserved.
- Admin secret value.

### P1 — Worker backend (`pricing-worker/`)

- Scaffolded with `wrangler init pricing-worker`.
- `src/index.js` implements:
  - GET handler (auth → tenant lookup → fetch from GitHub → return).
  - POST handler (auth → tenant lookup → validate shape → fetch sha → commit → return new sha).
  - CORS middleware.
  - Schema validator (`pricingBook.schema_version === 1`, `items` is object, etc).
- `wrangler.toml` env vars: `GITHUB_TOKEN`, `ADMIN_SECRET`, `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_PATH=pricingBook.json`.
- Tenant map in `src/index.js` for now (could move to KV later).
- `README.md` with `wrangler dev` + `wrangler deploy` instructions.
- Test via `curl` after deploy:
  - `GET` returns 401 without token, 200 with token + book.
  - `POST` of a tiny valid book commits to repo (visible in GitHub).
- Initial seed: commit the current local `pricingBook.json` to the private repo.

### P2 — Tool fetches remote on load

- Add `fetchRemotePricing(opts)` + `uploadPricing(book, message)` to the tool's JS.
- On boot, read cache → render with cache → async fetch + replace if newer.
- Offline fallback: if fetch fails, log + flag indicator + use cache.
- New localStorage keys (per save-shape spec above).
- Pricing-loaded indicator updated to show source (`Cloud sync: 14:32 UTC` or `Cache offline`).
- File menu → Load Pricing still works (now flagged as "advanced: local file").

### P3 — Pricing menu modal

- New modal accessible via File menu → "Pricing..." (replace current "Load Pricing" menu item with the new modal).
- Status / Actions / Advanced sections per UX spec above.
- Auth token setup flow: first-run prompts for token; storing in localStorage; mask on display.
- Sync now + Upload new pricing + Reload from cache buttons all wire to the existing handlers.

### P4 — Polish + sunset legacy

- Promote the Pricing modal entry to the top of the File menu (above project save/load — pricing is global state).
- Demote the standalone "Load Pricing" file picker into the modal's Advanced section.
- Document the new flow in the user guide.
- M5 cross-reference: add a note that pricingMeta + source tracking lives in localStorage (NOT in project save).

## Open follow-ups (not in scope)

- **OAuth** when SaaS launches (replaces shared-secret auth).
- **Multi-tenant UI** for managing additional tenants (creating, removing).
- **Rollback UI** with commit list + one-click revert.
- **Server-side converter** (port `build_pricing_json.py` to JS in the Worker).
- **Schema versioning** when `pricingBook.schema_version` bumps (forward + back compat in tool + Worker).
- **Bulk upload via drag-and-drop** of multiple vendor files (currently one JSON at a time).
- **Vendor-specific upload panel** (UI for "DoorBird update" vs "Brivo update" with per-vendor history).

## Risks

- **Worker outage** — Cloudflare's reliability is high but not 100%. Cache fallback covers this; tool stays usable.
- **GitHub outage** — same; cache covers.
- **Auth secret leak** — single shared secret means leak = full read + write access. Mitigations: rotate secret quarterly; future OAuth migration; for now, treat the secret like a database password.
- **Schema drift** — if pricingBook shape changes, Worker's validator + tool's consumer + the converter all need to migrate in lockstep. Standard versioned-schema concern.
- **Worker URL hijack** — if the Worker subdomain expires + someone re-registers it, they could intercept tool traffic. Mitigations: use a custom domain (`pricing.smartmf.com`) eventually; renew the Cloudflare subscription; restrict the auth token's blast radius.
- **GitHub API rate limit** — 5000 req/hr per token. Tool fetches once per page load. Even 100 active users = 100 req/hr. Well within bounds.
- **CORS surprises** — file:// origin sends `null` Origin header. Worker needs to handle this (allow null or check user-agent — flag at P1).

## Acceptance criteria

- Worker deployed; `curl GET` returns book + meta with valid token.
- Worker `curl POST` commits new book to private repo; commit visible in GitHub.
- Tool fetches book on boot when cloud reachable; uses cache when offline; indicator reflects state.
- File menu → Pricing modal opens; Sync / Upload / Cache reload all functional.
- Auth token setup flow: tool prompts on first run; stores + masks after.
- Upload of a fresh DoorBird-populated pricingBook.json successfully commits to private repo; tool reflects new prices after sync.
- File menu → "Use local file" advanced action still works (regression check).
- node --check passes.
- M5 doesn't need to touch pricing storage (lives outside project save).

## Notes for implementation team

- **Worker is a separate workspace** — its own directory, its own deploy lifecycle, its own README. Don't bundle Worker code into camera_markup_tool.html.
- **GitHub Contents API quirks**: writing requires the SHA of the existing file (for atomic update). Worker fetches SHA → writes new content → handles 409 conflict if SHA stale.
- **Wrangler local dev** (`wrangler dev`) runs the Worker against a local URL; great for testing without deploys.
- **Secrets in Wrangler**: `wrangler secret put GITHUB_TOKEN` + `wrangler secret put ADMIN_SECRET`. Never check secrets into `wrangler.toml`.
- **Tool-side error UX**: failed sync should surface a non-blocking toast/badge, not a modal — tool should remain usable with stale cache.
- **First-run auth setup**: when localStorage has no `pricingAuthToken`, the Pricing modal auto-opens (or the indicator prompts) to set it up.
- **Pricing book is global**, not project-scoped. Multiple projects on the same machine share one cache.
