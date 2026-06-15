import { getDb, type Prospect } from "./db";

// Source of truth: prospects (scraped/verified) + events (sent/delivered/...).
// "Verified" = has an email that isn't invalid (sendable). With Bouncer configured,
// invalid addresses are excluded — matching the live "% pass Bouncer" metric.

export type Funnel = {
  scraped: number;
  verified: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  replied: number;
  drafts: number; // composed, not yet sent
  ready: number; // ready to send
};

function distinctWithEvent(type: string): number {
  const row = getDb()
    .prepare("SELECT COUNT(DISTINCT prospect_id) AS n FROM events WHERE type = ?")
    .get(type) as { n: number };
  return row.n;
}

export function funnel(): Funnel {
  const db = getDb();
  const scraped = (db.prepare("SELECT COUNT(*) AS n FROM prospects").get() as { n: number }).n;
  const verified = (
    db
      .prepare("SELECT COUNT(*) AS n FROM prospects WHERE email IS NOT NULL AND email_status != 'invalid'")
      .get() as { n: number }
  ).n;
  const drafts = (
    db.prepare("SELECT COUNT(*) AS n FROM drafts WHERE state IN ('draft')").get() as { n: number }
  ).n;
  const ready = (
    db.prepare("SELECT COUNT(*) AS n FROM drafts WHERE state = 'ready'").get() as { n: number }
  ).n;
  return {
    scraped,
    verified,
    sent: distinctWithEvent("sent"),
    delivered: distinctWithEvent("delivered"),
    opened: distinctWithEvent("opened"),
    clicked: distinctWithEvent("clicked"),
    bounced: distinctWithEvent("bounced"),
    replied: distinctWithEvent("replied"),
    drafts,
    ready,
  };
}

export function pct(num: number, den: number): number {
  if (!den) return 0;
  return Math.round((num / den) * 100);
}

// ---- Hot leads: anyone who opened or clicked ----
export type HotLead = {
  id: number;
  business_name: string;
  email: string | null;
  website_url: string | null;
  phone: string | null;
  signal: "clicked" | "opened";
  hoursAgo: number | null;
  preview_code: string | null;
  preview_slug: string | null;
};

export function hotLeads(): HotLead[] {
  const db = getDb();
  // Prospects with at least an open or click. clicked outranks opened.
  const rows = db
    .prepare(
      `SELECT p.*,
        (SELECT COUNT(*) FROM events e WHERE e.prospect_id = p.id AND e.type = 'clicked') AS clicks,
        (SELECT COUNT(*) FROM events e WHERE e.prospect_id = p.id AND e.type = 'opened') AS opens,
        (SELECT MIN(created_at) FROM events e WHERE e.prospect_id = p.id AND e.type = 'sent') AS sent_at
       FROM prospects p
       WHERE EXISTS (SELECT 1 FROM events e WHERE e.prospect_id = p.id AND e.type IN ('opened','clicked'))`
    )
    .all() as (Prospect & { clicks: number; opens: number; sent_at: string | null })[];

  const now = Date.now();
  const leads: HotLead[] = rows.map((p) => ({
    id: p.id,
    business_name: p.business_name,
    email: p.email,
    website_url: p.website_url,
    phone: p.phone,
    signal: p.clicks > 0 ? "clicked" : "opened",
    hoursAgo: p.sent_at ? Math.round((now - new Date(p.sent_at + "Z").getTime()) / 3.6e6) : null,
    preview_code: p.preview_code,
    preview_slug: p.preview_slug,
  }));

  // clicked first, then opened; within a group, most recent (smallest hoursAgo) first.
  const rank = { clicked: 0, opened: 1 } as const;
  leads.sort((a, b) => {
    if (rank[a.signal] !== rank[b.signal]) return rank[a.signal] - rank[b.signal];
    return (a.hoursAgo ?? 1e9) - (b.hoursAgo ?? 1e9);
  });
  return leads;
}

export function hotSummary() {
  const leads = hotLeads();
  return {
    clicked: leads.filter((l) => l.signal === "clicked").length,
    opened: leads.filter((l) => l.signal === "opened").length,
    withPhone: leads.filter((l) => !!l.phone).length,
    total: leads.length,
  };
}

// ---- Campaigns table on /app: one row per batch ----
export type BatchRow = {
  id: number | null;
  when: string;
  industry: string | null;
  city: string | null;
  scraped: number;
  verified: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
};

export function batchRows(): BatchRow[] {
  const db = getDb();
  const batches = db
    .prepare("SELECT * FROM batches ORDER BY created_at DESC, id DESC")
    .all() as {
    id: number;
    industry: string | null;
    city: string | null;
    created_at: string;
  }[];

  const rowFor = (batchId: number | null): BatchRow => {
    const cond = batchId === null ? "p.batch_id IS NULL" : "p.batch_id = ?";
    const args = batchId === null ? [] : [batchId];
    const base = db
      .prepare(
        `SELECT
          COUNT(*) AS scraped,
          SUM(CASE WHEN p.email IS NOT NULL AND p.email_status != 'invalid' THEN 1 ELSE 0 END) AS verified
         FROM prospects p WHERE ${cond}`
      )
      .get(...args) as { scraped: number; verified: number };
    const ev = (type: string) =>
      (
        db
          .prepare(
            `SELECT COUNT(DISTINCT e.prospect_id) AS n FROM events e
             JOIN prospects p ON p.id = e.prospect_id
             WHERE e.type = ? AND ${cond}`
          )
          .get(type, ...args) as { n: number }
      ).n;
    return {
      id: batchId,
      when: "",
      industry: null,
      city: null,
      scraped: base.scraped ?? 0,
      verified: base.verified ?? 0,
      sent: ev("sent"),
      delivered: ev("delivered"),
      opened: ev("opened"),
      clicked: ev("clicked"),
      bounced: ev("bounced"),
    };
  };

  const rows: BatchRow[] = batches.map((b) => {
    const r = rowFor(b.id);
    r.when = b.created_at;
    r.industry = b.industry;
    r.city = b.city;
    return r;
  });

  // Legacy prospects with no batch (e.g. seeded/imported before batches existed).
  const legacyCount = (
    db.prepare("SELECT COUNT(*) AS n FROM prospects WHERE batch_id IS NULL").get() as { n: number }
  ).n;
  if (legacyCount > 0) {
    const r = rowFor(null);
    r.industry = "earlier leads";
    rows.push(r);
  }

  return rows;
}
