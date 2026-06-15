import { NextResponse } from "next/server";
import {
  getDb,
  slugify,
  previewCode,
  createBatch,
  updateBatchCounts,
  incLeads,
  type Service,
} from "@/lib/db";
import { isAuthed } from "@/lib/auth";
import { searchPlaces, parseCsv, findEmailOnSite, type RawLead } from "@/lib/places";
import { verifyEmail } from "@/lib/verify";
import { allowedScrape } from "@/lib/quota";

export async function POST(req: Request) {
  if (!isAuthed()) return NextResponse.json({ ok: false }, { status: 401 });
  const body = (await req.json()) as {
    service?: Service;
    source?: "google_maps" | "csv";
    industry?: string;
    city?: string;
    count?: number;
    csv?: string;
  };

  const service: Service = body.service === "ig_posting" ? "ig_posting" : "web_redesign";
  const source = body.source === "csv" ? "csv" : "google_maps";
  const requested = Math.max(1, Math.min(body.count ?? 20, 100));

  const allowed = allowedScrape(requested);
  if (allowed <= 0) {
    return NextResponse.json(
      { ok: false, error: "Daily lead cap reached for your plan." },
      { status: 429 }
    );
  }

  // Gather raw leads.
  let leads: RawLead[] = [];
  try {
    if (source === "csv") {
      if (!body.csv?.trim()) {
        return NextResponse.json({ ok: false, error: "Paste CSV rows first." }, { status: 400 });
      }
      leads = parseCsv(body.csv).slice(0, allowed);
    } else {
      const q = [body.industry, body.city].filter(Boolean).join(" in ");
      if (!q.trim()) {
        return NextResponse.json(
          { ok: false, error: "Industry and city required for Google Maps." },
          { status: 400 }
        );
      }
      leads = (await searchPlaces(q, allowed)).slice(0, allowed);
    }
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "scrape failed" },
      { status: 400 }
    );
  }

  try {
    const db = getDb();
    const batchId = createBatch({
      service,
      industry: body.industry ?? null,
      city: body.city ?? null,
      source,
      requested: allowed,
    });

    const insert = db.prepare(
      `INSERT INTO prospects
         (batch_id, service, business_name, website_url, email, phone, city, rating, email_status, preview_code, preview_slug)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const slugExists = db.prepare("SELECT 1 FROM prospects WHERE preview_slug = ?");

    let scraped = 0;
    let verified = 0;
    for (const lead of leads) {
      let email = lead.email ?? null;
      if (!email && lead.website_url) email = await findEmailOnSite(lead.website_url);
      const status = email ? await verifyEmail(email) : "unverified";
      if (email && status !== "invalid") verified++;

      const base = slugify(lead.website_url || lead.business_name) || `lead-${Date.now()}`;
      let slug = base;
      let n = 1;
      while (slugExists.get(slug)) slug = `${base}-${n++}`;

      insert.run(
        batchId,
        service,
        lead.business_name,
        lead.website_url ?? null,
        email,
        lead.phone ?? null,
        lead.city ?? null,
        lead.rating ?? null,
        status,
        previewCode(),
        slug
      );
      scraped++;
    }

    updateBatchCounts(batchId, scraped, verified);
    incLeads(scraped);

    return NextResponse.json({ ok: true, batchId, scraped, verified });
  } catch (e) {
    console.error("[scrape] failed:", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "scrape failed (server)" },
      { status: 500 }
    );
  }
}
