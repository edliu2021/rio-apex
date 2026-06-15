# Jaguar v1 — demo sender

Scrape a niche → AI-generate a redesign preview per prospect → send a tracked cold email →
watch each prospect move new → generated → sent → opened → clicked → replied. Every preview
has a sticky **Activate** button so prospects can pay without a call.

This is the **single-operator v1**: just you, one access code, a local SQLite database.

## Quick start

```bash
npm install
cp .env.example .env       # fill in what you have — it runs with nothing set
npm run seed               # optional: adds a demo campaign with 2 prospects
npm run dev                # http://localhost:3000
```

Open the app, paste your `ACCESS_CODE` (default `let-me-in`), and you're in.

## Try the whole pipeline with zero API keys

With the defaults (`DRY_RUN=true`, no keys):

1. **Create a campaign** (or use the seeded demo).
2. **Import leads** — paste CSV, or use the seeded prospects.
3. **Generate all** — produces a styled placeholder preview (real redesigns need `ANTHROPIC_API_KEY`).
4. Click **open ↗** to view a prospect's preview page (this logs a "clicked" event).
5. **Send all** — logs the email to the console instead of sending (DRY_RUN).

## Going live (in order — don't skip)

| Step | What | Env |
|---|---|---|
| 1 | Real redesigns | `ANTHROPIC_API_KEY` |
| 2 | Lead scraping | `GOOGLE_PLACES_API_KEY` (or just use CSV) |
| 3 | Email verification | `BOUNCER_API_KEY` (protects deliverability) |
| 4 | Sending domain | Verify a domain in Resend, set `RESEND_API_KEY`, `RESEND_FROM`, `REPLY_TO` |
| 5 | Tracking | Add a Resend webhook → `https://yourdomain.com/api/webhooks/resend` |
| 6 | Activate offer | `ACTIVATE_URL` (Stripe Payment Link / Cal.com), `ACTIVATE_PRICE` |
| 7 | Flip the switch | `DRY_RUN=false` — only after warming the domain (see below) |

## ⚠️ Deliverability — the part that actually matters

Gmail/Yahoo/Microsoft now **reject** unauthenticated bulk mail. Before sending for real:
- Set up **SPF + DKIM + DMARC** on a **separate** sending domain (not your main brand).
- **Warm up** the new domain: 5–10 sends/day, ramping over 4–6 weeks.
- Keep spam complaints **< 0.1%** and bounces **< 2%** (verify every address with Bouncer).
- Honor unsubscribes (the email + preview already include a one-click link).

The code is the easy 20%. Deliverability discipline is the other 80%.

## Architecture

See `CLAUDE.md` for the file-by-file map and the prospect status funnel.
