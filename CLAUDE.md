# CLAUDE.md — project context for Claude Code

## What this is
A single-operator tool that scrapes a niche, AI-generates a personalized website-redesign
preview for each prospect, sends a tracked cold email, and shows engagement in a dashboard.
Each preview has a sticky "Activate" CTA so prospects can pay without a sales call.
(v1 = just one operator — no multi-tenant auth or operator billing yet.)

## Stack
- Next.js 14 (App Router) + TypeScript
- SQLite via better-sqlite3 (file at `data/jaguar.db`, created on first run)
- Anthropic SDK for preview generation
- Resend for sending + open/click webhooks
- Google Places (optional) + Bouncer (optional) for the lead engine

## Layout (v2 — replicates market.jaguarai.ai)
- `lib/db.ts` — schema, types, status funnel, batches/drafts/usage, quota + signature helpers
- `lib/quota.ts` — plan caps + remaining leads/sends (Solo/Pro/Agency)
- `lib/places.ts` — CSV import + Google Places search (now captures phone) + email scrape
- `lib/verify.ts` — Bouncer email verification (passthrough if no key)
- `lib/compose.ts` — builds the editable per-prospect draft (Step 2), service-aware
- `lib/generate.ts` — Anthropic web-redesign **and** IG-posting previews + booking/Activate bar
- `lib/email.ts` — renders a stored draft → HTML + signature block, Resend send (DRY_RUN aware)
- `lib/stats.ts` — funnel metrics, hot-leads queue, per-batch campaign rows
- `lib/auth.ts` — access-code cookie gate
- `app/AppNav.tsx` — Actions · Dashboard · 🔥 Hot leads · Settings tab bar + usage strip
- `app/app` — **Actions**: 4-step pipeline (server `page.tsx` + `Actions.tsx` client)
- `app/dashboard` — funnel metrics + conversion bars; `app/dashboard/hot` — hot-leads queue
- `app/settings` — email-signature editor (API keys live at `app/app/settings`)
- `app/p/[code]/[slug]` — serves the per-prospect preview HTML, logs the click
- `app/api/*` — scrape, compose, drafts, previews/generate, send, settings, webhooks/resend
  (legacy `campaigns`, `leads/import`, `leads/scrape`, `generate` routes remain but are unused)

## The pipeline (live-app parity)
Scrape (service + source + batch) → Compose editable drafts → Pre-generate previews → Send.
Drafts have their own state: draft | ready | skipped | sent (orthogonal to prospect.status).
Quotas are enforced per plan in `lib/quota.ts` (leads/day, sends/day, emails/month).

## The funnel (prospect.status)
new → generated → sent → (delivered) → opened → clicked → replied | bounced
Status only moves forward (see `advanceStatus` / `RANK` in `lib/db.ts`).

## Run it
1. `npm install`
2. `cp .env.example .env` and fill what you have (works with none — DRY_RUN + dev fallbacks)
3. `npm run seed` (optional demo data)
4. `npm run dev` → http://localhost:3000 → enter ACCESS_CODE

## Safe defaults
- `DRY_RUN=true` logs emails instead of sending. Flip to `false` only with a warmed domain.
- No ANTHROPIC_API_KEY → generator returns a styled placeholder page (pipeline still works).
- No GOOGLE_PLACES_API_KEY → use CSV import.
- No BOUNCER_API_KEY → emails marked `unverified` (still sendable; `invalid` is blocked).

## Conventions
- Keep all DB access in `lib/db.ts` helpers or route handlers (server only — never import in client components).
- API routes return `{ ok: boolean, ... }`. The client refreshes via `router.refresh()`.

## Next things to build (post-v1)
- Svix signature verification on the Resend webhook (RESEND_WEBHOOK_SECRET)
- Stripe Payment Link wired to the Activate button + an activations table
- Per-day send caps / throttling for deliverability
- Multi-tenant operators + auth + billing
