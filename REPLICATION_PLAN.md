# Jaguar AI — Replication Plan (v2)

Goal: bring the local `jaguar-v1` repo to **feature + pixel parity** with the live app at
`market.jaguarai.ai`. This is a file-by-file implementation spec to approve **before** any
code is written.

The live app is a more opinionated evolution of what this repo already has. The pipeline
primitives (scrape, verify, generate, send, track) all exist and are reusable. The work is
(a) a richer data model — services, batches, editable drafts, quotas, signature — and
(b) four new UI surfaces matching the live app's information architecture.

---

## 1. What the live app actually is

A single-operator cold-outreach engine. The pitch: *"Other tools send emails. We send demos."*
It scrapes a niche from Google Maps, generates a personalized landing-page redesign per
prospect, sends a cold email whose link text is the prospect's **own domain**, and tracks
opens/clicks. Recipients who click land on a redesign of their own site with an Activate CTA.

Observed account state (read-only): Solo plan, `edisonliu999@gmail.com`, caps of 100 leads/day,
30 sends/day, 500 sends/month, ~13 campaigns run, ~42 sent, ~41 delivered, 17 hot leads.

### Routes / nav (the target IA)
Top nav on every app page: **Actions · Dashboard · 🔥 Hot leads · Settings**

| Route | Purpose |
|---|---|
| `/app` | **Actions** — the 4-step pipeline wizard |
| `/dashboard` | **Funnel** — metric cards + conversion bars + interpretation guide |
| `/dashboard/hot` | **Hot leads** — opened/clicked queue with phone + Preview/Reply |
| `/settings` | **Email signature** editor + live preview |
| `/p/<code>/<slug>` | Per-prospect preview page (two-segment path) |
| `/` `/#how-it-works` `/#pricing` `/#faq` | Marketing site |
| `/activate` | Paste access code (gate) |

---

## 2. Design system (extracted from the live app — for pixel parity)

Pulled from computed styles on the live site. These become CSS variables in `globals.css`.

```
--bg:            #08080a   /* near-black page background (rgb 8,8,10) */
--ink:           #f4f4f5   /* primary text, zinc-100 */
--muted:         rgba(244,244,245,0.55)
--panel-bg:      rgba(255,255,255,0.016)
--panel-border:  rgba(255,255,255,0.06)
--violet-1:      #8b5cf6   /* gradient start */
--violet-2:      #6d28d9   /* gradient end   */
--gold:          #d4a661   /* step labels, "We send demos" heading, accents */
--radius-panel:  12px
--radius-btn:    6px
font-family:     ui-sans-serif, system-ui, sans-serif  (system stack, no web fonts)
```

Component conventions observed:
- **Primary button**: `linear-gradient(135deg,#8b5cf6,#6d28d9)`, white text, radius 6px,
  padding 8px 16px, font-weight 500, faint gold border `rgba(212,166,97,0.3)`. Prefixed with `▶`.
- **Panels / cards**: translucent white fill `0.016`, hairline border `0.06`, radius 12px.
- **Step labels**: gold `#d4a661`, 11px, uppercase, letter-spacing ~0.32em (`STEP 01 · SCRAPE…`).
- **Section headings (`h1`)**: 24px / 600, zinc-100.
- **Pills/badges**: small rounded, muted fill (e.g. `clicked`, `opened`, email-status chips).
- **Funnel bars**: horizontal bars with a violet→gold gradient, value label inset, % on the right.
- **Marketing hero**: huge headline; second line ("We send demos.") in gold.

Note: the live app appears to be Tailwind-based, but this repo uses a hand-rolled
`globals.css` with utility-ish classes. Plan keeps the repo's approach and encodes the tokens
above as CSS variables + a small set of component classes, so we hit the same pixels without
adding a Tailwind migration. (Flag if you'd rather I migrate to Tailwind to match their
class structure 1:1.)

---

## 3. Gap analysis — existing vs. needed

| Capability | Repo today | Live app | Action |
|---|---|---|---|
| Scrape (Places + CSV) | ✅ `lib/places.ts` | ✅ | reuse; add service + batch tagging |
| Email verify (Bouncer) | ✅ `lib/verify.ts` | ✅ | reuse; surface verified counts |
| Preview generation | ✅ `lib/generate.ts` (web redesign) | web redesign **+ IG posting** | add IG variant + booking CTA |
| Send + DRY_RUN + webhook | ✅ `lib/email.ts`, `webhooks/resend` | ✅ | reuse; add signature + service copy |
| Per-prospect preview page | ✅ `/p/[slug]` | `/p/<code>/<slug>` | restructure to 2-segment + Book CTA |
| Auth gate | ✅ `lib/auth.ts` | ✅ | reuse |
| **Services** (web / IG) | ❌ | ✅ | **new** |
| **Batches** (current/unsent/sent) | ❌ | ✅ | **new** |
| **Editable drafts** (compose step) | ❌ (email built at send) | ✅ inline edit + Skip | **new** |
| **Pre-generate previews** (separate step) | partial (generate==preview) | ✅ explicit cache step | **new** split |
| **Quotas** (day/month caps) | ❌ | ✅ meters + enforcement | **new** |
| **Plan tier** (Solo/Pro/Agency) | ❌ | ✅ | **new** |
| **Signature settings** | ❌ (settings = API keys) | ✅ name/email/phone/addr/booking | **new** |
| **Phone capture** | ❌ | ✅ (hot-leads calling) | **new** column + scrape |
| Actions wizard UI | ❌ (campaign dashboard) | ✅ 4 steps | **rebuild** |
| Funnel dashboard `/dashboard` | ❌ | ✅ | **new** |
| Hot leads `/dashboard/hot` | ❌ | ✅ | **new** |
| Marketing parity (Solo/Pro/Agency, FAQ) | partial `app/page.tsx` | ✅ | **update** |

---

## 4. New data model

Extend `lib/db.ts`. Keep the single-SQLite, single-operator model. New/changed tables:

```sql
-- batches: each "Continue — scrape another batch" creates one
CREATE TABLE batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service TEXT NOT NULL DEFAULT 'web_redesign',  -- web_redesign | ig_posting
  industry TEXT, city TEXT, source TEXT,         -- google_maps | csv
  requested INTEGER, scraped INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- prospects: ADD columns
ALTER TABLE prospects ADD COLUMN batch_id INTEGER REFERENCES batches(id);
ALTER TABLE prospects ADD COLUMN service TEXT NOT NULL DEFAULT 'web_redesign';
ALTER TABLE prospects ADD COLUMN phone TEXT;
ALTER TABLE prospects ADD COLUMN preview_code TEXT;   -- random code for /p/<code>/<slug>

-- drafts: the composed, editable email per prospect (Step 2 output)
CREATE TABLE drafts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prospect_id INTEGER NOT NULL UNIQUE REFERENCES prospects(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'draft',   -- draft | ready | skipped | sent
  edited INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- usage: rolling quota counters keyed by day/month
CREATE TABLE usage (
  day TEXT PRIMARY KEY,        -- YYYY-MM-DD
  leads_scraped INTEGER DEFAULT 0,
  sends INTEGER DEFAULT 0
);
-- monthly sends derived by SUM over the month; plan caps live in settings.
```

Settings KV gains signature + plan keys (no schema change — reuses `settings` table):
`SIG_NAME, REPLY_EMAIL, SIG_PHONE, MAILING_ADDRESS, BOOKING_LINK, PLAN` (+ existing API keys).

Plan caps (constant table in code, selected by `PLAN`):
```
solo:   { emailsPerMonth: 500,  previewsPerMonth: 500,  leadsPerDay: 100, sendsPerDay: 30  }
pro:    { emailsPerMonth: 2500, previewsPerMonth: 2500, leadsPerDay: 500, sendsPerDay: 150 }
agency: { emailsPerMonth:10000, previewsPerMonth:10000, leadsPerDay:1500, sendsPerDay: 500 }
```

Status funnel is unchanged: `new → generated → sent → delivered → opened → clicked → replied|bounced`.
Draft `state` is orthogonal (a prospect can be `new` with a `ready` draft before sending).

---

## 5. Library layer — file by file

- **`lib/db.ts`** — add the tables above; add types `Batch`, `Draft`; add helpers:
  `getOrCreateUsageRow(day)`, `incLeads(n)`, `incSends(n)`, `monthSends()`, `currentBatch()`,
  `planCaps()`, `getSignature()`. Keep server-only.
- **`lib/quota.ts`** *(new)* — `canScrape(n)`, `canSend(n)`, `remaining()` returning the numbers
  the meters render (`0/100`, `0/30`, `42/500`). Enforced in the scrape/send routes.
- **`lib/places.ts`** — extend Places field mask to also request
  `places.nationalPhoneNumber`; map into `phone`. Keep CSV path (add optional `phone` column).
- **`lib/verify.ts`** — unchanged (reuse).
- **`lib/compose.ts`** *(new)* — builds the **editable draft** (subject + body) per prospect,
  service-aware, using the signature ("I'm {name} based in {city}", closing "— {name}",
  CAN-SPAM mailing address, booking link). This is the live "Compose" step, split out of send.
- **`lib/generate.ts`** — keep web-redesign path; add `service: 'ig_posting'` branch (Instagram
  mockup grid instead of homepage); swap the injected bar to use **Booking link** ("Book 15 min
  with you →") with Activate/$297 as secondary; support `/p/<code>/<slug>` hrefs.
- **`lib/email.ts`** — `sendEmail` now sends a **stored draft** (subject/body from `drafts`)
  rather than building copy inline; append rendered signature block; keep DRY_RUN + Resend tags.
- **`lib/auth.ts`** — unchanged (reuse).

---

## 6. API routes — file by file

- **`/api/scrape`** *(rename of leads/scrape)* — body `{service, source, industry, city, count}`;
  enforces `canScrape`; creates a `batch`; runs Places/CSV; verifies; captures phone; increments
  `usage.leads_scraped`; returns batch summary (`scraped`, `verified`).
- **`/api/compose`** — body `{batchId|scope}`; writes one `draft` per verified, unsent prospect
  in the current batch; returns drafts for inline review.
- **`/api/drafts`** — `PATCH` to edit subject/body (sets `edited=1`) or set `state`
  (`ready`/`skipped`); `GET` filtered by `current batch | all unsent | sent (catch-up)`.
- **`/api/previews/generate`** — pre-generates + caches preview HTML for a scope (the explicit
  Step 3); reuses `lib/generate.ts`.
- **`/api/send`** — body `{scope, cap}`; enforces `canSend` + day/month caps; only sends drafts
  in `ready` state with a sendable email; increments `usage.sends`; **requires the confirm flag**
  (matches the live "confirmation prompt before any email leaves").
- **`/api/webhooks/resend`** — reuse; also flips `drafts.state` history if needed.
- **`/api/settings`** — split: keep API-key management, **add** signature keys
  (`SIG_NAME, REPLY_EMAIL, SIG_PHONE, MAILING_ADDRESS, BOOKING_LINK, PLAN`).
- **`/p/[code]/[slug]/route.ts`** *(restructured)* — serve preview by `(code, slug)`, log click.

---

## 7. UI surfaces — file by file

Shared: **`app/(app)/Nav.tsx`** *(new)* — the `Actions · Dashboard · 🔥 Hot leads · Settings`
tab bar + the plan/usage strip (`Solo · email · Leads 0/100 · Sends 0/30 · Month 42/500`).
**`app/globals.css`** — encode the §2 tokens + panel/button/pill/funnel-bar classes.

- **`app/app/page.tsx` + `Actions.tsx`** *(rebuild)* — the 4-step wizard:
  1. **Scrape** — service toggle (🖥️ Web redesign / 📸 IG posting), source toggle
     (📍 Google Maps / 📂 Paste CSV), industry + city + count inputs, batch status line
     ("N waiting · M from older scrapes · up to 30/day"), send-cap progress bar, `▶ Continue`.
  2. **Compose** — `▶ Compose for N verified`, draft list with **inline-editable** subject/body,
     per-row **Skip**, tabs *Current batch / All unsent / Sent (catch-up)*, "N ready to send".
  3. **Pre-generate previews** — `✨ Pre-generate N previews` (~$0.014 each), same tabs.
  4. **Send** — scope (Current batch / All ready), "How many (cap)" input, `🚀 Send for real…`
     with confirmation modal. Below: **Your campaigns** table (When · Industry·City · Scraped ·
     Verified · Sent · Delivered · Opens · Clicks · Bounced) with expandable rows.
- **`app/dashboard/page.tsx`** *(new)* — funnel: 8 metric cards (Scraped, Verified, Sent,
  Delivered, Bounce rate, Open rate, Click rate, Reply rate) + horizontal **conversion funnel**
  bars (Scraped→Verified→Sent→Delivered→Opened→Clicked with %s) + the "What you're looking at"
  interpretation guide. Server-rendered from `events`/`prospects`.
- **`app/dashboard/hot/page.tsx`** *(new)* — summary cards (Clicked, Opened, With phone, Total
  hot) + table (Business · Signal · Phone · Sent[time-ago] · Preview↗ / Reply↗) sorted by
  recency, clicked above opened + the "Why call instead of email-again?" guidance block.
- **`app/settings/page.tsx` + `SignatureForm.tsx`** *(new, distinct from current API-key page)* —
  Name, Reply email, Phone, Mailing address, Booking link, **Save signature**, and a live
  **signature-block preview**. (Keep the existing API-key settings reachable, e.g. `/settings/keys`.)
- **`app/page.tsx`** *(update)* — marketing parity: hero ("Other tools send emails. / We send
  demos." with gold 2nd line), stat row (40–50% open, up to 100% click, 0 fabricated, <30s),
  How it works (3 steps), the email-mockup "magic moment", **Pricing Solo $99 / Pro $399 /
  Agency $799** with the exact feature bullets, FAQ accordion, footer. Code `EARLY30`.
- **`app/layout.tsx` / `app/Header.tsx`** — marketing header; app pages use `Nav.tsx`.

---

## 8. Quota & plan system

`PLAN` setting selects a caps object (§4). `lib/quota.ts` reads `usage` for today + month-to-date
and exposes remaining counts. The Actions header strip and Step 1/Step 4 meters render these.
Scrape and Send routes **hard-enforce** caps (return `{ok:false, error:'cap reached'}`) so the UI
can't exceed them — matching the live "3% of daily send cap" / "you can send up to 30/day" copy.

---

## 9. Suggested build order (phased, even though we'll execute as one approved plan)

1. **Data model + libs** — `db.ts` tables, `quota.ts`, `compose.ts`, `generate.ts` IG variant,
   `email.ts` signature, `places.ts` phone. (No UI yet; verifiable via a seed script.)
2. **Actions wizard** — the `/app` 4-step flow + campaigns table + meters.
3. **Dashboard + Hot leads** — read-only analytics routes.
4. **Settings (signature)** + preview-page `/p/<code>/<slug>` restructure.
5. **Marketing parity** — `/` hero, pricing, FAQ.
6. **Design pass** — apply §2 tokens everywhere; screenshot-diff against the live app.

Each phase ends green on `npm run typecheck` and `npm run build`. DRY_RUN stays `true`
throughout — **no real emails are sent during development.**

---

## 10. Decisions I need from you

1. **Styling approach** — encode the live tokens into the repo's existing hand-rolled CSS
   (faster, no migration), or migrate to **Tailwind** to mirror their class structure 1:1?
2. **Multi-batch history** — the live "Your campaigns" table shows every batch. Keep all batches
   forever (current plan) — yes?
3. **IG posting** — replicate as a static Instagram-style mockup grid, or is there a specific
   format you want? (I only saw the web-redesign preview live.)
4. **Real keys** — should the build assume your real Anthropic/Resend/Places/Bouncer keys go in
   `.env` (so previews/sends are real once DRY_RUN flips), or stay fully in dev-fallback mode?
5. **Marketing site** — full parity now, or defer (it's the least functional surface)?

Once you confirm these, I'll execute §9 phase by phase.
