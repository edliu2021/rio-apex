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

  recordEvent(p.id, "clicked");
  advanceStatus(p.id, "clicked");

  return new Response(p.preview_html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function unsubscribePage(name: string): string {
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<div style="font-family:system-ui,sans-serif;max-width:480px;margin:15vh auto;padding:0 24px;text-align:center">
<h1 style="font-size:22px">You're unsubscribed</h1>
<p style="color:#555">We won't email ${name} again. Sorry for the interruption.</p>
</div>`;
}
