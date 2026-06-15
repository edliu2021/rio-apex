import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

// Single SQLite file. Single-operator tool — no multi-tenant complexity.
const DATA_DIR = join(process.cwd(), "data");
mkdirSync(DATA_DIR, { recursive: true });

declare global {
  // eslint-disable-next-line no-var
  var __jaguarDb: Database.Database | undefined;
}

// Adds a column to a table only if it doesn't already exist (idempotent migration).
function ensureColumn(db: Database.Database, table: string, column: string, ddl: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

function init(db: Database.Database) {
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      niche TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Each "Continue — scrape another batch" creates one batch row.
    CREATE TABLE IF NOT EXISTS batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service TEXT NOT NULL DEFAULT 'web_redesign', -- web_redesign | ig_posting
      industry TEXT,
      city TEXT,
      source TEXT,                                  -- google_maps | csv
      requested INTEGER,
      scraped INTEGER NOT NULL DEFAULT 0,
      verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS prospects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
      batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL,
      service TEXT NOT NULL DEFAULT 'web_redesign',
      business_name TEXT NOT NULL,
      website_url TEXT,
      email TEXT,
      phone TEXT,
      city TEXT,
      rating REAL,
      email_status TEXT NOT NULL DEFAULT 'unverified', -- unverified|valid|risky|invalid
      preview_code TEXT,
      preview_slug TEXT,
      preview_html TEXT,
      status TEXT NOT NULL DEFAULT 'new', -- new|generated|sent|opened|clicked|replied|bounced
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- The composed, editable cold email per prospect (Step 2 output).
    CREATE TABLE IF NOT EXISTS drafts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prospect_id INTEGER NOT NULL UNIQUE REFERENCES prospects(id) ON DELETE CASCADE,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'ready', -- draft | ready | skipped | sent
      edited INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prospect_id INTEGER NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
      type TEXT NOT NULL, -- sent|delivered|opened|clicked|replied|bounced
      meta TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Rolling quota counters, one row per day.
    CREATE TABLE IF NOT EXISTS usage (
      day TEXT PRIMARY KEY,                    -- YYYY-MM-DD
      leads_scraped INTEGER NOT NULL DEFAULT 0,
      sends INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Idempotent column migrations for DBs created on the old schema. MUST run
  // before any index that references a new column (e.g. idx_prospects_batch),
  // otherwise CREATE INDEX fails with "no such column" on an existing DB.
  ensureColumn(db, "prospects", "campaign_id", "campaign_id INTEGER REFERENCES campaigns(id)");
  ensureColumn(db, "prospects", "batch_id", "batch_id INTEGER REFERENCES batches(id)");
  ensureColumn(db, "prospects", "service", "service TEXT NOT NULL DEFAULT 'web_redesign'");
  ensureColumn(db, "prospects", "phone", "phone TEXT");
  ensureColumn(db, "prospects", "preview_code", "preview_code TEXT");

  // The original schema made campaign_id NOT NULL. Batch-based scraping inserts
  // rows with no campaign, so rebuild the table to drop that constraint if present.
  const cols = db.prepare("PRAGMA table_info(prospects)").all() as {
    name: string;
    notnull: number;
  }[];
  const campaignCol = cols.find((c) => c.name === "campaign_id");
  if (campaignCol && campaignCol.notnull === 1) {
    db.pragma("foreign_keys = OFF");
    db.exec(`
      CREATE TABLE prospects_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
        batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL,
        service TEXT NOT NULL DEFAULT 'web_redesign',
        business_name TEXT NOT NULL,
        website_url TEXT,
        email TEXT,
        phone TEXT,
        city TEXT,
        rating REAL,
        email_status TEXT NOT NULL DEFAULT 'unverified',
        preview_code TEXT,
        preview_slug TEXT,
        preview_html TEXT,
        status TEXT NOT NULL DEFAULT 'new',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO prospects_new
        (id, campaign_id, batch_id, service, business_name, website_url, email, phone,
         city, rating, email_status, preview_code, preview_slug, preview_html, status, created_at)
        SELECT id, campaign_id, batch_id, service, business_name, website_url, email, phone,
               city, rating, email_status, preview_code, preview_slug, preview_html, status, created_at
        FROM prospects;
      DROP TABLE prospects;
      ALTER TABLE prospects_new RENAME TO prospects;
    `);
  }

  // Indexes created after migrations so new columns exist.
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_prospects_campaign ON prospects(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_prospects_batch ON prospects(batch_id);
    CREATE INDEX IF NOT EXISTS idx_events_prospect ON events(prospect_id);
    CREATE INDEX IF NOT EXISTS idx_drafts_prospect ON drafts(prospect_id);
  `);

  // Backfill preview_code for any legacy rows so the /p/<code>/<slug> route matches.
  const legacy = db
    .prepare("SELECT id FROM prospects WHERE preview_code IS NULL")
    .all() as { id: number }[];
  if (legacy.length) {
    const set = db.prepare("UPDATE prospects SET preview_code = ? WHERE id = ?");
    for (const r of legacy) set.run(Math.random().toString(36).slice(2, 8), r.id);
  }
}

export function getDb(): Database.Database {
  if (!global.__jaguarDb) {
    const db = new Database(join(DATA_DIR, "jaguar.db"));
    init(db);
    global.__jaguarDb = db;
  }
  return global.__jaguarDb;
}

// ---- Types ----
export type Service = "web_redesign" | "ig_posting";

export type Prospect = {
  id: number;
  campaign_id: number | null;
  batch_id: number | null;
  service: Service;
  business_name: string;
  website_url: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  rating: number | null;
  email_status: string;
  preview_code: string | null;
  preview_slug: string | null;
  preview_html: string | null;
  status: string;
  created_at: string;
};

export type Batch = {
  id: number;
  service: Service;
  industry: string | null;
  city: string | null;
  source: string | null;
  requested: number | null;
  scraped: number;
  verified: number;
  created_at: string;
};

export type Draft = {
  id: number;
  prospect_id: number;
  subject: string;
  body: string;
  state: "draft" | "ready" | "skipped" | "sent";
  edited: number;
  created_at: string;
};

export type Campaign = {
  id: number;
  name: string;
  niche: string | null;
  created_at: string;
};

// ---- Events / funnel ----
export function recordEvent(prospectId: number, type: string, meta?: unknown) {
  getDb()
    .prepare("INSERT INTO events (prospect_id, type, meta) VALUES (?, ?, ?)")
    .run(prospectId, type, meta ? JSON.stringify(meta) : null);
}

// Status only ever moves forward through the funnel.
const RANK: Record<string, number> = {
  new: 0,
  generated: 1,
  sent: 2,
  delivered: 2,
  opened: 3,
  clicked: 4,
  replied: 5,
  bounced: 5,
};

export function advanceStatus(prospectId: number, next: string) {
  const db = getDb();
  const row = db
    .prepare("SELECT status FROM prospects WHERE id = ?")
    .get(prospectId) as { status: string } | undefined;
  if (!row) return;
  if ((RANK[next] ?? 0) >= (RANK[row.status] ?? 0)) {
    db.prepare("UPDATE prospects SET status = ? WHERE id = ?").run(next, prospectId);
  }
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// Short random code used in the per-prospect preview path /p/<code>/<slug>.
export function previewCode(): string {
  return Math.random().toString(36).slice(2, 8);
}

// ---- Batches ----
export function createBatch(b: {
  service: Service;
  industry?: string | null;
  city?: string | null;
  source?: string | null;
  requested?: number | null;
}): number {
  const info = getDb()
    .prepare(
      "INSERT INTO batches (service, industry, city, source, requested) VALUES (?, ?, ?, ?, ?)"
    )
    .run(b.service, b.industry ?? null, b.city ?? null, b.source ?? null, b.requested ?? null);
  return Number(info.lastInsertRowid);
}

export function updateBatchCounts(batchId: number, scraped: number, verified: number) {
  getDb()
    .prepare("UPDATE batches SET scraped = ?, verified = ? WHERE id = ?")
    .run(scraped, verified, batchId);
}

export function currentBatch(): Batch | undefined {
  return getDb()
    .prepare("SELECT * FROM batches ORDER BY created_at DESC, id DESC LIMIT 1")
    .get() as Batch | undefined;
}

// ---- Drafts ----
export function upsertDraft(prospectId: number, subject: string, body: string) {
  getDb()
    .prepare(
      `INSERT INTO drafts (prospect_id, subject, body, state) VALUES (?, ?, ?, 'ready')
       ON CONFLICT(prospect_id) DO UPDATE SET subject = excluded.subject, body = excluded.body
       WHERE drafts.edited = 0`
    )
    .run(prospectId, subject, body);
}

export function getDraft(prospectId: number): Draft | undefined {
  return getDb()
    .prepare("SELECT * FROM drafts WHERE prospect_id = ?")
    .get(prospectId) as Draft | undefined;
}

// ---- Usage / quota counters ----
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function ensureUsage(day: string) {
  getDb().prepare("INSERT OR IGNORE INTO usage (day) VALUES (?)").run(day);
}

export function incLeads(n: number) {
  const day = today();
  ensureUsage(day);
  getDb().prepare("UPDATE usage SET leads_scraped = leads_scraped + ? WHERE day = ?").run(n, day);
}

export function incSends(n: number) {
  const day = today();
  ensureUsage(day);
  getDb().prepare("UPDATE usage SET sends = sends + ? WHERE day = ?").run(n, day);
}

export function leadsToday(): number {
  const row = getDb().prepare("SELECT leads_scraped FROM usage WHERE day = ?").get(today()) as
    | { leads_scraped: number }
    | undefined;
  return row?.leads_scraped ?? 0;
}

export function sendsToday(): number {
  const row = getDb().prepare("SELECT sends FROM usage WHERE day = ?").get(today()) as
    | { sends: number }
    | undefined;
  return row?.sends ?? 0;
}

export function sendsThisMonth(): number {
  const month = today().slice(0, 7); // YYYY-MM
  const row = getDb()
    .prepare("SELECT COALESCE(SUM(sends),0) AS n FROM usage WHERE substr(day,1,7) = ?")
    .get(month) as { n: number } | undefined;
  return row?.n ?? 0;
}

// ---- Plan caps ----
export type PlanCaps = {
  emailsPerMonth: number;
  previewsPerMonth: number;
  leadsPerDay: number;
  sendsPerDay: number;
};

export const PLAN_CAPS: Record<string, PlanCaps> = {
  solo: { emailsPerMonth: 500, previewsPerMonth: 500, leadsPerDay: 100, sendsPerDay: 30 },
  pro: { emailsPerMonth: 2500, previewsPerMonth: 2500, leadsPerDay: 500, sendsPerDay: 150 },
  agency: { emailsPerMonth: 10000, previewsPerMonth: 10000, leadsPerDay: 1500, sendsPerDay: 500 },
};

export function planName(): string {
  return (getSetting("PLAN") || "solo").toLowerCase();
}

export function planCaps(): PlanCaps {
  return PLAN_CAPS[planName()] ?? PLAN_CAPS.solo;
}

// Service-specific Activate price. Web redesign pitches $297/mo; IG posting $1,500/mo
// (matching market.jaguarai.ai). Both overridable via settings.
export function priceFor(service: Service): string {
  if (service === "ig_posting") return getSetting("ACTIVATE_PRICE_IG") || "$1,500/mo";
  return getSetting("ACTIVATE_PRICE") || "$297/mo";
}

// ---- Signature ----
export type Signature = {
  name: string;
  replyEmail: string;
  phone: string;
  mailingAddress: string;
  bookingLink: string;
  city: string;
};

export function getSignature(): Signature {
  const mailing = getSetting("MAILING_ADDRESS") || "";
  // City is the comma-part right before the "STATE ZIP" tail. Handles both
  // "995 Market St, San Francisco, CA 94103" and
  // "Rio Crest LLC, 17350 State Hwy 249, Ste 220, Houston, TX 77064".
  const parts = mailing.split(",").map((s) => s.trim()).filter(Boolean);
  const city = parts.length >= 3 ? parts[parts.length - 2] : parts.length === 2 ? parts[1] : "";
  return {
    name: getSetting("SIG_NAME") || "",
    replyEmail: getSetting("REPLY_EMAIL") || getSetting("REPLY_TO") || "",
    phone: getSetting("SIG_PHONE") || "",
    mailingAddress: mailing,
    bookingLink: getSetting("BOOKING_LINK") || "",
    city,
  };
}

// ---- Settings KV ----
export function getSetting(key: string): string | undefined {
  const row = getDb()
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row?.value ?? process.env[key] ?? undefined;
}

export function setSetting(key: string, value: string): void {
  getDb()
    .prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .run(key, value);
}

export function getAllSettings(): Record<string, string> {
  const rows = getDb()
    .prepare("SELECT key, value FROM settings")
    .all() as { key: string; value: string }[];
  const out: Record<string, string> = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}

export function deleteSetting(key: string): void {
  getDb().prepare("DELETE FROM settings WHERE key = ?").run(key);
}
