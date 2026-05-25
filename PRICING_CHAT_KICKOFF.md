# Pricing Module — New-Chat Kickoff / Orientation

_Hand this to the new chat as the first message (or paste its contents). It tells the planning Claude where everything lives and what's already decided, so it can write the Pass 2 pricing brief without re-deriving the session._

---

## What this project is
Single-file, browser-based quoting tool for **smart MF** (multifamily smart-building integrator): `camera_markup_tool.html` — CSS in one `<style>`, JS in one `<script>`, vanilla JS, `var` only, no build step. Runs client-side. Only CDN deps are **pdf.js + jsPDF** (hard rule: no new deps without explicit approval). It takes floor plans / door schedules and produces a marked-up package: cover page, BOM, riser, marked-up plans, price quotes.

## How we work (the relay)
- I (the user, Lars) relay between **you (planning Claude)** and **Claude Code (CC, execution)**. You think and produce terse, paste-ready blocks for CC; I paste CC's reports back to you.
- **Every CC block opens with a resync anchor:** `[HEAD: <hash> | branch: <name> | tree: <state>]`. Driving git in raw terminal + via CC drifts state otherwise.
- **Make a recommendation for every open decision.** Terse, no preamble, no end-summary unless asked. Bullet points.
- My PowerShell does **not** chain with `&&` — one command per line or `;`.
- Repo: `C:\Users\lars\OneDrive - Calgary Lock and Safe\Documents\SurveillanceMarkup` (OneDrive = fragile, commit promptly). GitHub: larsjohnston/surveillance-markup.
- **Commit after each milestone's browser review — don't defer.** **Fold each pass's brief file into that pass's CLOSING commit's `git add`** so it lands tracked.

## Where the information lives (READ THESE FIRST)
- **`QUEUE.md`** (project files) — the canonical work queue. The **"NEXT — Pass 2: Pricing module"** section is a self-contained brief-starter: confirmed file structure, the two gating decisions, the cost-basis/scope defaults, and the required coverage report. **Start here.**
- **`CLAUDE.md`** (project files) — engineering gotchas: `markDirty()` discipline, `selectCamera`/`selectReader` vs bare assignment, `pixelsPerMeter` convention, JSON save-version bump + backfill rules, surgical-edit rule, step-report requirements. Consult before non-trivial edits.
- **`camera_markup_tool.html`** (project files) — the tool itself (~17.8k lines). The project-knowledge copy may trail `main`; CC must verify against current `main` before editing.
- **`27_3_Brivo_Price_List_NA1_Reseller_L3_CDN_20260401.xlsx`** (project files) — the price list this pass consumes.
- Note: the project-knowledge copies of these files are **manually synced** and may lag the repo. The repo on `main` is canonical. Confirm current state by having CC grep `main`.

## Current state at handoff
- **main HEAD = `a598d44`** (merge of overhead-door-flag). Tree clean.
- **Save schema = v21.**
- The Security Quote (on-screen BOM drawer) + customer BOM PDF + CSV all flow from one `computeBomTree()` over `BOM_TEMPLATE`. Structure: 5 majors + Other; routing by `r.section` (priority) then `src`+key-prefix. (Full map in QUEUE.md.)
- **Every BOM row currently has `unit: 0`** — no pricing wired yet. That's this pass.

## 🔴 The hard dependency this pass resolves
The proposal cover's GRAND TOTAL shows **$0.00** because `drawProposalCover` sums `computeBomTree()` × margin/tax and all units are 0. A proposal exported today looks broken to a client. **Wiring real unit costs fixes this** — it's the headline reason Pass 2 matters.

## What the pricing pass must do (high level)
Wire SKU → price-list lookup so the Security Quote drawer + CSV show real unit / line / margin / tax / grand-total, and the cover total becomes real.

## The two decisions that gate the architecture — RESOLVE FIRST
The user will answer these at the start of the pricing chat. Do NOT write the implementation brief until they're settled — the whole design branches on them.

**Decision 1 — how to read the .xlsx:**
- (A) Add **SheetJS** (xlsx CDN lib) → tool parses the raw `.xlsx` directly. Matches "pull from this Excel as stated"; seeds the eventual dynamic solution. **BUT it's a new dependency — needs the user's explicit approval (hard rule).**
- (B) **Offline-convert** the two equipment sheets to a checked-in `pricing.json`, loaded via the existing Pricing Foundation pipe. No new dep; costs a manual convert step per price-list update.
- **Claude's standing rec: (B) for v1** (the user said "dynamic solution later" — that's the SheetJS path). FIRST verify what the existing pricing loader already accepts: grep `main` for `loadPricing` / `pricing.json` / `priceBook` / `loadPriceList` (only a stale comment near line ~2802 found so far — confirm whether a JSON loader is scaffolded and its expected shape).

**Decision 2 — camera SKU mismatch (make-or-break):**
- Brivo `B-*` price-list SKUs MATCH the tool's `BRIVO_CATALOG` → AC / credentials / suite prices will hit.
- Eagle Eye cameras DON'T: price list uses `EN-CDUD-010a`-style; the tool's camera catalog uses `een-DD10`-style. Lookup misses → camera prices come back $0 silently.
- Either **build an `een-* → EN-*` crosswalk now** (needs the user's product knowledge to map each pair) OR **scope v1 to Brivo/AC-only prices**, cameras showing $0 / "price pending" until the crosswalk lands. **Decide live with the user.**

## Confirmed price-list structure (from inspection — state in the brief)
- 5 sheets. Equipment SKUs live in **"Access Reseller - NA1 L3"** (Brivo `B-*` AC + suites + door-hw incl. Kwikset `KW-*` / Yale `YL-*` / Honeywell `HON-*`) and **"Video Reseller - NA1 L3"** (Eagle Eye `EN-*` cameras / switches / CMVRs).
- Ignore: "Video Complete" (OpEx variant), "Video Sub Price Matrix L3" (recurring cloud-VMS grid, not equipment), "Summary of Changes" (changelog).
- Column layout (both equipment sheets): **rows 0–11 = title/preamble/column headers (SKIP).** Data rows: **col A = SKU · col B = description · col C = spec/sub-desc · col D = Price CDN (list) · col E = Reseller L3 CDN · col F = notes.** Category-section header rows have text in col A but **empty D/E** — treat as section dividers, not SKUs.

## Defaults to bake into the brief unless the user overrides
- **Cost basis = Reseller L3 (CDN), col E**; margin → sell.
- **Scope v1 = one-time equipment** for SKUs the tool emits (cameras, AC, credentials, suites, intercom if present). **§5 door hardware stays on the DHW quote/RFQ path** (its prices are NOT in this list). **Subscriptions / recurring out of scope v1.**
- Require a **SKU-match coverage report** as part of the pass: how many of the tool's emitted SKUs found a price, and which missed — surface this before trusting the lookup.

## Prerequisite within the pass
Promote `sku` to a real per-material field where it's currently derived-at-render. Cameras / AC / intercom / parcel / DHW have a SKU source; mailbox / IoT / derived rows need a SKU assignment or an explicit no-price marker.

## Known debt this pass should clean while it's in the pricing code
- **`bomAutoOverrides` orphan-on-flag-flip:** flagging a device for overhead-door changes its row key (`auto-ac-<SKU>` → `auto-ac-oh-<SKU>`), orphaning any unit-price override on the old key. Inert today (unit:0); becomes a real bug once prices are non-zero. Fix here — migrate the override to the new key, or key overrides by a `<sku, flag>` tuple matching the group key.

## Process reminders for the pricing chat
- Open the chat by confirming current `main` HEAD with CC (`git log -1`) — don't assume `a598d44` is still tip if other work landed.
- Settle Decisions 1 + 2 with the user, then write the brief, then propose a milestone plan and stop for approval before any edits.
- Pricing touches save schema (a price-book load state / cached prices may persist) → expect a **version bump v21 → v22** + backfill. Confirm what actually needs persisting before bumping.
- After the pass: remind the user to regen `QUEUE.md` and re-upload it to project knowledge (the project-knowledge copy is manually synced and lags).
