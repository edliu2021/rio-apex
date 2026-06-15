import { NextResponse } from "next/server";
import { getDb, currentBatch, upsertDraft, type Prospect } from "@/lib/db";
import { isAuthed } from "@/lib/auth";
import { buildDraft } from "@/lib/compose";

export async function POST(req: Request) {
  if (!isAuthed()) return NextResponse.json({ ok: false }, { status: 401 });
  const { scope } = (await req.json()) as { scope?: "current" | "unsent" };
  const db = getDb();

  // Sendable + not yet sent + no existing draft (ready/sent) yet.
  let where = "p.email IS NOT NULL AND p.email_status != 'invalid'";
  const args: unknown[] = [];
  if (scope === "current") {
    const batch = currentBatch();
    if (!batch) return NextResponse.json({ ok: true, composed: 0 });
    where += " AND p.batch_id = ?";
    args.push(batch.id);
  }
  where +=
    " AND NOT EXISTS (SELECT 1 FROM drafts d WHERE d.prospect_id = p.id AND d.state IN ('ready','sent'))";
  where += " AND NOT EXISTS (SELECT 1 FROM events e WHERE e.prospect_id = p.id AND e.type = 'sent')";

  const rows = db
    .prepare(`SELECT p.* FROM prospects p WHERE ${where}`)
    .all(...args) as Prospect[];

  for (const p of rows) {
    const { subject, body } = buildDraft(p);
    upsertDraft(p.id, subject, body);
  }

  return NextResponse.json({ ok: true, composed: rows.length });
}
