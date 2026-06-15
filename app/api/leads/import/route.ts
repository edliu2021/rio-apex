import { NextResponse } from "next/server";
import { getDb, slugify } from "@/lib/db";
import { isAuthed } from "@/lib/auth";
import { parseCsv } from "@/lib/places";
import { verifyEmail } from "@/lib/verify";

export async function POST(req: Request) {
  if (!isAuthed()) return NextResponse.json({ ok: false }, { status: 401 });
  const { campaignId, csv } = (await req.json()) as { campaignId?: number; csv?: string };
  if (!campaignId || !csv) {
    return NextResponse.json({ ok: false, error: "campaignId and csv required" }, { status: 400 });
  }

  const leads = parseCsv(csv);
  const db = getDb();
  const insert = db.prepare(
    `INSERT INTO prospects (campaign_id, business_name, website_url, email, city, rating, email_status, preview_slug)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  let added = 0;
  for (const lead of leads) {
    const status = lead.email ? await verifyEmail(lead.email) : "unverified";
    const base = slugify(lead.website_url || lead.business_name) || `lead-${Date.now()}`;
    // ensure unique slug
    let slug = base;
    let n = 1;
    while (db.prepare("SELECT 1 FROM prospects WHERE preview_slug = ?").get(slug)) {
      slug = `${base}-${n++}`;
    }
    insert.run(
      campaignId,
      lead.business_name,
      lead.website_url ?? null,
      lead.email ?? null,
      lead.city ?? null,
      lead.rating ?? null,
      status,
      slug
    );
    added++;
  }

  return NextResponse.json({ ok: true, added });
}
