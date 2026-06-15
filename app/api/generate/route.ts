import { NextResponse } from "next/server";
import { getDb, advanceStatus, getSetting, type Prospect } from "@/lib/db";
import { isAuthed } from "@/lib/auth";
import { generatePreview } from "@/lib/generate";

function activateHref(): string {
  const url = getSetting("ACTIVATE_URL");
  if (url) return url;
  const reply = getSetting("REPLY_TO");
  return reply ? `mailto:${reply}?subject=Activate%20my%20redesign` : "#";
}

async function fetchSiteText(url?: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const u = url.startsWith("http") ? url : `https://${url}`;
    const res = await fetch(u, { signal: AbortSignal.timeout(8000) });
    const html = await res.text();
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 5000);
  } catch {
    return null;
  }
}

async function generateOne(p: Prospect) {
  const siteText = await fetchSiteText(p.website_url);
  const html = await generatePreview({
    businessName: p.business_name,
    city: p.city,
    rating: p.rating,
    websiteUrl: p.website_url,
    currentSiteText: siteText,
    activateHref: activateHref(),
    activatePrice: getSetting("ACTIVATE_PRICE") || "$297/mo",
  });
  getDb().prepare("UPDATE prospects SET preview_html = ? WHERE id = ?").run(html, p.id);
  advanceStatus(p.id, "generated");
}

export async function POST(req: Request) {
  if (!isAuthed()) return NextResponse.json({ ok: false }, { status: 401 });
  const { prospectId, campaignId } = (await req.json()) as {
    prospectId?: number;
    campaignId?: number;
  };
  const db = getDb();

  try {
    if (prospectId) {
      const p = db.prepare("SELECT * FROM prospects WHERE id = ?").get(prospectId) as Prospect | undefined;
      if (!p) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
      await generateOne(p);
      return NextResponse.json({ ok: true, generated: 1 });
    }
    if (campaignId) {
      const rows = db
        .prepare("SELECT * FROM prospects WHERE campaign_id = ? AND preview_html IS NULL")
        .all(campaignId) as Prospect[];
      for (const p of rows) await generateOne(p);
      return NextResponse.json({ ok: true, generated: rows.length });
    }
    return NextResponse.json({ ok: false, error: "prospectId or campaignId required" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "generate failed" },
      { status: 500 }
    );
  }
}
