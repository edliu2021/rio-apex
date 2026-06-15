import { NextResponse } from "next/server";
import { getDb, currentBatch } from "@/lib/db";
import { isAuthed } from "@/lib/auth";

export type DraftRow = {
  prospect_id: number;
  business_name: string;
  email: string | null;
  email_status: string;
  subject: string;
  body: string;
  state: string;
  edited: number;
  preview_code: string | null;
  preview_slug: string | null;
  has_preview: number;
};

export async function GET(req: Request) {
  if (!isAuthed()) return NextResponse.json({ ok: false }, { status: 401 });
  const scope = new URL(req.url).searchParams.get("scope") || "current";
  const db = getDb();

  let where = "1=1";
  const args: unknown[] = [];
  if (scope === "current") {
    const batch = currentBatch();
    if (!batch) return NextResponse.json({ ok: true, drafts: [] });
    where = "p.batch_id = ?";
    args.push(batch.id);
  } else if (scope === "unsent") {
    where = "d.state IN ('draft','ready')";
  } else if (scope === "sent") {
    where = "d.state = 'sent'";
  }

  const drafts = db
    .prepare(
      `SELECT d.prospect_id, p.business_name, p.email, p.email_status,
              d.subject, d.body, d.state, d.edited,
              p.preview_code, p.preview_slug,
              (p.preview_html IS NOT NULL) AS has_preview
       FROM drafts d JOIN prospects p ON p.id = d.prospect_id
       WHERE ${where}
       ORDER BY d.created_at DESC`
    )
    .all(...args) as DraftRow[];

  return NextResponse.json({ ok: true, drafts });
}

export async function PATCH(req: Request) {
  if (!isAuthed()) return NextResponse.json({ ok: false }, { status: 401 });
  const { prospectId, subject, body, state } = (await req.json()) as {
    prospectId?: number;
    subject?: string;
    body?: string;
    state?: "draft" | "ready" | "skipped";
  };
  if (!prospectId) {
    return NextResponse.json({ ok: false, error: "prospectId required" }, { status: 400 });
  }
  const db = getDb();

  if (subject !== undefined || body !== undefined) {
    const cur = db
      .prepare("SELECT subject, body FROM drafts WHERE prospect_id = ?")
      .get(prospectId) as { subject: string; body: string } | undefined;
    if (!cur) return NextResponse.json({ ok: false, error: "no draft" }, { status: 404 });
    db.prepare(
      "UPDATE drafts SET subject = ?, body = ?, edited = 1 WHERE prospect_id = ?"
    ).run(subject ?? cur.subject, body ?? cur.body, prospectId);
  }
  if (state !== undefined) {
    db.prepare("UPDATE drafts SET state = ? WHERE prospect_id = ?").run(state, prospectId);
  }

  return NextResponse.json({ ok: true });
}
