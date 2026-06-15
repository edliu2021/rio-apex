import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { getDb, currentBatch, getSetting, type Service } from "@/lib/db";
import { snapshot } from "@/lib/quota";
import { batchRows } from "@/lib/stats";
import AppNav from "../AppNav";
import Actions from "./Actions";

export const dynamic = "force-dynamic";

export default function AppPage() {
  if (!isAuthed()) redirect("/activate");

  const db = getDb();
  const quota = snapshot();
  const batch = currentBatch();

  const sendableUnsent = (cond: string, args: unknown[] = []) =>
    (
      db
        .prepare(
          `SELECT COUNT(*) AS n FROM prospects p
           WHERE p.email IS NOT NULL AND p.email_status != 'invalid'
           AND NOT EXISTS (SELECT 1 FROM events e WHERE e.prospect_id = p.id AND e.type = 'sent')
           AND ${cond}`
        )
        .get(...args) as { n: number }
    ).n;

  const waiting = batch ? sendableUnsent("p.batch_id = ?", [batch.id]) : 0;
  const older = batch
    ? sendableUnsent("(p.batch_id IS NULL OR p.batch_id != ?)", [batch.id])
    : sendableUnsent("1=1");

  const ready = (
    db.prepare("SELECT COUNT(*) AS n FROM drafts WHERE state = 'ready'").get() as { n: number }
  ).n;

  const verifiedToCompose = batch
    ? (
        db
          .prepare(
            `SELECT COUNT(*) AS n FROM prospects p
             WHERE p.batch_id = ? AND p.email IS NOT NULL AND p.email_status != 'invalid'
             AND NOT EXISTS (SELECT 1 FROM drafts d WHERE d.prospect_id = p.id AND d.state IN ('ready','sent'))
             AND NOT EXISTS (SELECT 1 FROM events e WHERE e.prospect_id = p.id AND e.type = 'sent')`
          )
          .get(batch.id) as { n: number }
      ).n
    : 0;

  // Same as verifiedToCompose but across ALL batches (older scrapes included).
  const unsentToCompose = (
    db
      .prepare(
        `SELECT COUNT(*) AS n FROM prospects p
         WHERE p.email IS NOT NULL AND p.email_status != 'invalid'
         AND NOT EXISTS (SELECT 1 FROM drafts d WHERE d.prospect_id = p.id AND d.state IN ('ready','sent'))
         AND NOT EXISTS (SELECT 1 FROM events e WHERE e.prospect_id = p.id AND e.type = 'sent')`
      )
      .get() as { n: number }
  ).n;

  const previewsNeeded = (
    db
      .prepare(
        `SELECT COUNT(*) AS n FROM prospects p
         WHERE p.preview_html IS NULL AND p.email IS NOT NULL AND p.email_status != 'invalid'
         ${batch ? "AND p.batch_id = ?" : ""}`
      )
      .get(...(batch ? [batch.id] : [])) as { n: number }
  ).n;

  const initialDrafts = (
    db
      .prepare(
        `SELECT d.prospect_id, p.business_name, p.email, p.email_status, d.subject, d.body, d.state, d.edited,
                p.preview_code, p.preview_slug, (p.preview_html IS NOT NULL) AS has_preview
         FROM drafts d JOIN prospects p ON p.id = d.prospect_id
         ${batch ? "WHERE p.batch_id = ?" : ""}
         ORDER BY d.created_at DESC`
      )
      .all(...(batch ? [batch.id] : []))
  ) as never[];

  return (
    <div className="container">
      <AppNav active="actions" quota={quota} email={getSetting("REPLY_EMAIL") || getSetting("REPLY_TO") || undefined} />
      <h1>Actions</h1>
      <p className="muted" style={{ marginBottom: 22 }}>
        Scrape your niche → compose → send. Watch <a className="link" href="/dashboard">/dashboard</a> for live results.
      </p>

      <Actions
        quota={quota}
        currentService={(batch?.service as Service) ?? "web_redesign"}
        currentIndustry={batch?.industry ?? ""}
        currentCity={batch?.city ?? ""}
        counts={{ waiting, older, ready, verifiedToCompose, unsentToCompose, previewsNeeded }}
        initialDrafts={initialDrafts}
        batches={batchRows()}
      />
    </div>
  );
}
