import { getSetting } from "./db";

// Fetches themed square photo URLs from Pexels for the IG-grid tiles.
// Returns [] if no PEXELS_API_KEY is set (caller falls back to gradient tiles).
export async function fetchPexelsPhotos(query: string, count: number): Promise<string[]> {
  const key = getSetting("PEXELS_API_KEY");
  if (!key) return [];
  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(
      query
    )}&per_page=${count}&orientation=square`;
    const res = await fetch(url, {
      headers: { Authorization: key },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      photos?: Array<{ src?: { medium?: string; large?: string; original?: string } }>;
    };
    return (data.photos ?? [])
      .map((p) => p.src?.large || p.src?.medium || p.src?.original)
      .filter((u): u is string => !!u)
      .slice(0, count);
  } catch {
    return [];
  }
}
