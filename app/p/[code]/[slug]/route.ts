import { getDb, advanceStatus, recordEvent, type Prospect } from "@/lib/db";

// Serves the per-prospect preview at /p/<code>/<slug>.
// A visit means they clicked the email link — we log it.
export async function GET(
  req: Request,
  { params }: { params: { code: string; slug: string } }
) {
  const db = getDb();
  const p = db
    .prepare("SELECT * FROM prospects WHERE preview_code = ? AND preview_slug = ?")
    .get(params.code, params.slug) as Prospect | undefined;

  if (!p || !p.preview_html) {
    return new Response("Preview not found.", {
      status: 404,
      headers: { "Content-Type": "text/plain" },
    });
  }

  const url = new URL(req.url);
  if (url.searchParams.get("unsubscribe") === "1") {
    recordEvent(p.id, "replied", { unsubscribe: true });
    return new Response(unsubscribePage(p.business_name), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // Only log a real click. Skip:
  //  - prefetches (Next.js Link / browser link-prefetch) — no human opened it
  //  - obvious bots/crawlers/link-scanners (incl. mail-security pre-fetchers)
  //  - prospects we haven't actually emailed yet (so reviewing your own
  //    previews can't inflate CLICKS or create phantom hot leads)
  if (countableClick(req.headers, p.id)) {
    recordEvent(p.id, "clicked");
    advanceStatus(p.id, "clicked");
  }

  return new Response(p.preview_html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function isPrefetch(headers: Headers): boolean {
  const purpose = (
    headers.get("sec-purpose") ||
    headers.get("purpose") ||
    headers.get("x-purpose") ||
    headers.get("x-moz") ||
    ""
  ).toLowerCase();
  if (purpose.includes("prefetch") || purpose.includes("preview")) return true;
  if (headers.get("next-router-prefetch") || headers.get("x-middleware-prefetch")) return true;
  return false;
}

function isBot(headers: Headers): boolean {
  const ua = (headers.get("user-agent") || "").toLowerCase();
  if (!ua) return true; // no UA → almost always a script/scanner
  return /bot|crawl|spider|slurp|preview|scan|monitor|fetch|curl|wget|python-requests|headless|facebookexternalhit|whatsapp|slackbot|telegrambot|discordbot|bingpreview|google-read-aloud|proofpoint|barracuda|mimecast|microsoft|outlook|safelinks/.test(
    ua
  );
}

function hasBeenSent(prospectId: number): boolean {
  const row = getDb()
    .prepare("SELECT 1 FROM events WHERE prospect_id = ? AND type = 'sent' LIMIT 1")
    .get(prospectId);
  return !!row;
}

function countableClick(headers: Headers, prospectId: number): boolean {
  if (isPrefetch(headers)) return false;
  if (isBot(headers)) return false;
  if (!hasBeenSent(prospectId)) return false;
  return true;
}

function unsubscribePage(name: string): string {
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<div style="font-family:system-ui,sans-serif;max-width:480px;margin:15vh auto;padding:0 24px;text-align:center">
<h1 style="font-size:22px">You're unsubscribed</h1>
<p style="color:#555">We won't email ${name} again. Sorry for the interruption.</p>
</div>`;
}
