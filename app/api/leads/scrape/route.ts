import { NextResponse } from "next/server";
import { getDb, slugify } from "@/lib/db";
import { isAuthed } from "@/lib/auth";
import { searchPlaces, findEmailOnSite } from "@/lib/places";
import { verifyEmail } from "@/lib/verify";

export async function POST(req: Request) {
  if (!isAuthed()) return NextResponse.json({ ok: false }, { status: 401 });
  const { campaignId, query, limit } = (await req.json()) as {
    campaignId?: number;
    query?: string;
    limit?: number;
  };
  if (!campaignId || !query?.trim()) {
    return NextResponse.json({ ok: false, error: "campaignId and query required" }, { status: 400 });
  }

  let leads;
  try {
    leads = await searchPlaces(query.trim(), limit ?? 20);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "scrape failed" },
      { status: 400 }
    );
  }

  const db = getDb();
  const insert = db.prepare(
    `INSERT INTO prospects (campaign_id, business_name, website_url, email, city, rating, email_status, preview_slug)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  let added = 0;
  for (const lead of leads) {
    let email = lead.email ?? null;
    if (!email && lead.website_url) email = await findEmailOnSite(lead.website_url);
    const status = email ? await verifyEmail(email) : "unverified";
    const base = slugify(lead.website_url || lead.business_name) || `lead-${Date.now()}`;
    let slug = base;
    let n = 1;
    while (db.prepare("SELECT 1 FROM prospects WHERE preview_slug = ?").get(slug)) {
      slug = `${base}-${n++}`;
    }
    insert.run(
      campaignId,
      lead.business_name,
      lead.website_url ?? null,
      email,
      lead.city ?? null,
      lead.rating ?? null,
      status,
      slug
    );
    added++;
  }

  return NextResponse.json({ ok: true, added });
}
