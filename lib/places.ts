// Lead engine. Two paths:
//   1) CSV import (always works, no API key) — paste businesses you already have.
//   2) Google Places Text Search (needs GOOGLE_PLACES_API_KEY).
// Places returns name/website/rating but NOT email — we scrape the site for a
// mailto: as a best-effort. For volume, swap in an enrichment provider.

export type RawLead = {
  business_name: string;
  website_url?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  rating?: number | null;
};

// ---- CSV import ----
// Expected header (case-insensitive): business_name,website_url,email,city,rating
export function parseCsv(csv: string): RawLead[] {
  const lines = csv.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  const header = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);
  const out: RawLead[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const get = (n: string) => {
      const j = idx(n);
      return j >= 0 ? (cells[j] ?? "").trim() : "";
    };
    const name = get("business_name") || get("name");
    if (!name) continue;
    const ratingStr = get("rating");
    out.push({
      business_name: name,
      website_url: get("website_url") || get("website") || null,
      email: get("email") || null,
      phone: get("phone") || null,
      city: get("city") || null,
      rating: ratingStr ? Number(ratingStr) : null,
    });
  }
  return out;
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      result.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result;
}

// ---- Google Places Text Search (New) ----
export async function searchPlaces(query: string, limit = 20): Promise<RawLead[]> {
  const { getSetting } = await import("./db");
  const key = getSetting("GOOGLE_PLACES_API_KEY");
  if (!key) {
    throw new Error("GOOGLE_PLACES_API_KEY is not set — use CSV import instead.");
  }
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      // Field mask keeps cost down — only request what we use.
      "X-Goog-FieldMask":
        "places.displayName,places.websiteUri,places.rating,places.formattedAddress,places.nationalPhoneNumber",
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: Math.min(limit, 20) }),
  });
  if (!res.ok) {
    throw new Error(`Places API error ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as {
    places?: Array<{
      displayName?: { text?: string };
      websiteUri?: string;
      rating?: number;
      formattedAddress?: string;
      nationalPhoneNumber?: string;
    }>;
  };
  return (data.places ?? []).map((p) => ({
    business_name: p.displayName?.text ?? "Unknown",
    website_url: p.websiteUri ?? null,
    rating: p.rating ?? null,
    city: extractCity(p.formattedAddress),
    phone: p.nationalPhoneNumber ?? null,
    email: null,
  }));
}

function extractCity(addr?: string): string | null {
  if (!addr) return null;
  const parts = addr.split(",").map((s) => s.trim());
  // crude: second-to-last-ish chunk is usually the city
  return parts.length >= 2 ? parts[parts.length - 3] ?? parts[0] : parts[0];
}

// Best-effort: pull a mailto: / first email from a homepage.
export async function findEmailOnSite(url: string): Promise<string | null> {
  try {
    const u = url.startsWith("http") ? url : `https://${url}`;
    const res = await fetch(u, { signal: AbortSignal.timeout(8000) });
    const html = await res.text();
    const mailto = html.match(/mailto:([^"'?\s>]+)/i);
    if (mailto) return mailto[1];
    const generic = html.match(
      /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i
    );
    return generic ? generic[0] : null;
  } catch {
    return null;
  }
}
