import { NextResponse } from "next/server";
import {
  getDb,
  advanceStatus,
  getSetting,
  getSignature,
  priceFor,
  currentBatch,
  type Prospect,
} from "@/lib/db";
import { isAuthed } from "@/lib/auth";
import { generatePreview } from "@/lib/generate";
import { fetchPexelsPhotos } from "@/lib/pexels";

// For IG previews, themed photos for the 9 tiles. Query from the batch's
// industry (falls back to the business name). Empty if no PEXELS_API_KEY.
async function igPhotosFor(p: Prospect): Promise<string[]> {
  if (p.service !== "ig_posting") return [];
  const batch = p.batch_id
    ? (getDb().prepare("SELECT industry FROM batches WHERE id = ?").get(p.batch_id) as
        | { industry: string | null }
        | undefined)
    : undefined;
  const query = (batch?.industry || p.business_name || "small business").toString();
  return fetchPexelsPhotos(query, 9);
}

function activateHref(): string {
  const url = getSetting("ACTIVATE_URL");
  if (url) return url;
  const reply = getSignature().replyEmail || getSetting("REPLY_TO");
  return reply ? `mailto:${reply}?subject=Activate%20my%20preview` : "#";
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
  const igImages = await igPhotosFor(p);
  const html = await generatePreview({
    service: p.service,
    businessName: p.business_name,
    city: p.city,
    rating: p.rating,
    websiteUrl: p.website_url,
    currentSiteText: siteText,
    activateHref: activateHref(),
    activatePrice: priceFor(p.service),
    bookingHref: getSignature().bookingLink || null,
    igImages,
  });
  getDb().prepare("UPDATE prospects SET preview_html = ? WHERE id = ?").run(html, p.id);
  advanceStatus(p.id, "generated");
}

export async function POST(req: Request) {
  if (!isAuthed()) return NextResponse.json({ ok: false }, { status: 401 });
  const { scope, prospectId } = (await req.json()) as {
    scope?: "current" | "unsent";
    prospectId?: number;
  };
  const db = getDb();

  try {
    if (prospectId) {
      const p = db.prepare("SELECT * FROM prospects WHERE id = ?").get(prospectId) as
        | Prospect
        | undefined;
      if (!p) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
      await generateOne(p);
      return NextResponse.json({ ok: true, generated: 1 });
    }

    let where = "preview_html IS NULL AND email IS NOT NULL AND email_status != 'invalid'";
    const args: unknown[] = [];
    if (scope === "current") {
      const batch = currentBatch();
      if (!batch) return NextResponse.json({ ok: true, generated: 0 });
      where += " AND batch_id = ?";
      args.push(batch.id);
    }
    const rows = db.prepare(`SELECT * FROM prospects WHERE ${where}`).all(...args) as Prospect[];
    for (const p of rows) await generateOne(p);
    return NextResponse.json({ ok: true, generated: rows.length });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "generate failed" },
      { status: 500 }
    );
  }
}
