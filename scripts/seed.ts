// Seeds a demo batch with two prospects + default signature so you can click
// through the whole pipeline (compose -> pre-generate -> send in DRY_RUN)
// without any API keys. Run: npm run seed
import { getDb, slugify, previewCode, createBatch, setSetting } from "../lib/db";

const db = getDb();

// Default signature + plan so drafts compose nicely out of the box.
const defaults: Record<string, string> = {
  PLAN: "solo",
  SIG_NAME: "Edison",
  REPLY_EMAIL: "hello@rioapex.com",
  SIG_PHONE: "2142187004",
  MAILING_ADDRESS: "Rio Crest LLC, 17350 State Hwy 249, Ste 220 #33750, Houston, TX 77064",
  ACTIVATE_PRICE: "$297/mo",
};
for (const [k, v] of Object.entries(defaults)) {
  const exists = db.prepare("SELECT 1 FROM settings WHERE key = ?").get(k);
  if (!exists) setSetting(k, v);
}

const batchId = createBatch({
  service: "web_redesign",
  industry: "restaurant",
  city: "San Francisco, CA",
  source: "csv",
  requested: 2,
});

const demo = [
  { business_name: "Maison Noir", website_url: "maisonnoir-sf.com", email: "hello@maisonnoir-sf.com", phone: "(415) 555-0142", city: "San Francisco", rating: 4.9 },
  { business_name: "Blue Fig Cafe", website_url: "bluefigcafe.com", email: "team@bluefigcafe.com", phone: "(415) 555-0177", city: "San Francisco", rating: 4.6 },
];

const insert = db.prepare(
  `INSERT INTO prospects
     (batch_id, service, business_name, website_url, email, phone, city, rating, email_status, preview_code, preview_slug)
   VALUES (?, 'web_redesign', ?, ?, ?, ?, ?, ?, 'unverified', ?, ?)`
);

let added = 0;
for (const d of demo) {
  const slug = slugify(d.website_url);
  const dup = db.prepare("SELECT 1 FROM prospects WHERE preview_slug = ?").get(slug);
  if (!dup) {
    insert.run(batchId, d.business_name, d.website_url, d.email, d.phone, d.city, d.rating, previewCode(), slug);
    added++;
  }
}

db.prepare("UPDATE batches SET scraped = ?, verified = ? WHERE id = ?").run(added, added, batchId);

console.log(`Seeded demo batch (${added} prospects). Run \`npm run dev\` and open http://localhost:3000`);
