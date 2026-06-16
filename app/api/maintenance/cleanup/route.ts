import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isAuthed } from "@/lib/auth";

// One-off data hygiene for stats polluted before the click-tracking fix:
//   1. Drop dry-run "sent" events (they never actually emailed anyone).
//   2. Drop engagement events (clicked/opened/delivered/replied/bounced) for
//      prospects that were never really sent — these are self-views from
//      reviewing your own previews, not real prospect intent.
//   3. Un-burn drafts that were marked "sent" only by a dry run, so they can
//      be sent for real later.
//   4. Recompute every prospect's funnel status from the surviving events.
//
// POST /api/maintenance/cleanup            → apply the cleanup
// POST /api/maintenance/cleanup {dry:true} → report what WOULD change only
//
// Safe to run repeatedly (idempotent).

const RANK_BY_EVENT: Record<string, number> = {
  sent: 2,
  delivered: 2,
  opened: 3,
  clicked: 4,
  replied: 5,
  bounced: 5,
};

export async function POST(req: Request) {
  if (!isAuthed()) return NextResponse.json({ ok: false }, { status: 401 });

  let preview = false;
  try {
    const body = (await req.json()) as { dry?: boolean } | null;
    preview = !!body?.dry;
  } catch {
    // no body — apply for real
  }

  const db = getDb();

  // 1. Identify dry-run sent events (meta carries the dryRun marker, or the
  //    old "dry_" id prefix from before we stopped writing them at all).
  const dryRunSent = db
    .prepare(
      `SELECT id FROM events
       WHERE type = 'sent'
         AND (meta LIKE '%"dryRun":true%' OR meta LIKE '%"id":"dry_%')`
    )
    .all() as { id: number }[];

  // 2. After removing those, which prospects have a REAL sent event?
  const reallySent = new Set(
    (
      db
        .prepare(
          `SELECT DISTINCT prospect_id FROM events
           WHERE type = 'sent'
             AND id NOT IN (SELECT id FROM events WHERE type = 'sent'
               AND (meta LIKE '%"dryRun":true%' OR meta LIKE '%"id":"dry_%'))`
        )
        .all() as { prospect_id: number }[]
    ).map((r) => r.prospect_id)
  );

  // Engagement events belonging to never-really-sent prospects = phantom.
  const phantomEngagement = (
    db
      .prepare(
        `SELECT id, prospect_id, type FROM events
         WHERE type IN ('clicked','opened','delivered','replied','bounced')`
      )
      .all() as { id: number; prospect_id: number; type: string }[]
  ).filter((e) => !reallySent.has(e.prospect_id));

  const report = {
    dryRunSentRemoved: dryRunSent.length,
    phantomEngagementRemoved: phantomEngagement.length,
    draftsUnburned: 0,
    statusesRecomputed: 0,
  };

  if (preview) {
    return NextResponse.json({ ok: true, preview: true, wouldChange: report });
  }

  const tx = db.transaction(() => {
    // 1 + 2: delete the bad events.
    const delEvent = db.prepare("DELETE FROM events WHERE id = ?");
    for (const e of dryRunSent) delEvent.run(e.id);
    for (const e of phantomEngagement) delEvent.run(e.id);

    // 3: un-burn drafts marked sent without a surviving real sent event.
    const burned = db
      .prepare(
        `SELECT prospect_id FROM drafts WHERE state = 'sent'
           AND prospect_id NOT IN (SELECT DISTINCT prospect_id FROM events WHERE type = 'sent')`
      )
      .all() as { prospect_id: number }[];
    const unburn = db.prepare("UPDATE drafts SET state = 'ready' WHERE prospect_id = ?");
    for (const d of burned) unburn.run(d.prospect_id);
    report.draftsUnburned = burned.length;

    // 4: recompute prospect.status from surviving events + preview presence.
    const prospects = db
      .prepare("SELECT id, preview_html FROM prospects")
      .all() as { id: number; preview_html: string | null }[];
    const setStatus = db.prepare("UPDATE prospects SET status = ? WHERE id = ?");
    for (const p of prospects) {
      const evTypes = (
        db.prepare("SELECT DISTINCT type FROM events WHERE prospect_id = ?").all(p.id) as {
          type: string;
        }[]
      ).map((r) => r.type);

      let best = p.preview_html ? "generated" : "new";
      let bestRank = p.preview_html ? 1 : 0;
      for (const t of evTypes) {
        const r = RANK_BY_EVENT[t] ?? 0;
        if (r > bestRank) {
          bestRank = r;
          best = t;
        }
      }
      setStatus.run(best, p.id);
      report.statusesRecomputed++;
    }
  });

  tx();

  return NextResponse.json({ ok: true, cleaned: report });
}
