import { NextResponse } from "next/server";
import {
  getDb,
  advanceStatus,
  recordEvent,
  incSends,
  currentBatch,
  type Prospect,
  type Draft,
} from "@/lib/db";
import { isAuthed } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { isSendable } from "@/lib/verify";
import { allowedSend } from "@/lib/quota";

type Row = Prospect & {
  d_subject: string;
  d_body: string;
};

async function sendOne(p: Row): Promise<{ id: number; ok: boolean; error?: string }> {
  if (!p.email) return { id: p.id, ok: false, error: "no email" };
  if (!isSendable(p.email_status)) return { id: p.id, ok: false, error: "email invalid — blocked" };

  const draft = { id: 0, prospect_id: p.id, subject: p.d_subject, body: p.d_body, state: "ready", edited: 0, created_at: "" } as Draft;
  const res = await sendEmail(p, draft);
  if (res.ok) {
    recordEvent(p.id, "sent", { id: res.id, dryRun: res.dryRun });
    advanceStatus(p.id, "sent");
    getDb().prepare("UPDATE drafts SET state = 'sent' WHERE prospect_id = ?").run(p.id);
    return { id: p.id, ok: true };
  }
  return { id: p.id, ok: false, error: res.error };
}

export async function POST(req: Request) {
  if (!isAuthed()) return NextResponse.json({ ok: false }, { status: 401 });
  const { scope, cap, confirm, prospectId } = (await req.json()) as {
    scope?: "current" | "all_ready";
    cap?: number;
    confirm?: boolean;
    prospectId?: number;
  };

  if (!confirm) {
    return NextResponse.json(
      { ok: false, error: "Confirmation required before any email is sent." },
      { status: 400 }
    );
  }

  const db = getDb();

  // Eligible: a READY draft, sendable email, not already sent.
  let where =
    "d.state = 'ready' AND p.email IS NOT NULL AND p.email_status != 'invalid' AND NOT EXISTS (SELECT 1 FROM events e WHERE e.prospect_id = p.id AND e.type = 'sent')";
  const args: unknown[] = [];

  if (prospectId) {
    where += " AND p.id = ?";
    args.push(prospectId);
  } else if (scope === "current") {
    const batch = currentBatch();
    if (!batch) return NextResponse.json({ ok: true, sent: 0, results: [] });
    where += " AND p.batch_id = ?";
    args.push(batch.id);
  }

  let rows = db
    .prepare(
      `SELECT p.*, d.subject AS d_subject, d.body AS d_body
       FROM prospects p JOIN drafts d ON d.prospect_id = p.id
       WHERE ${where} ORDER BY p.id ASC`
    )
    .all(...args) as Row[];

  // Apply the requested cap, then the plan/quota cap.
  const requested = cap && cap > 0 ? Math.min(cap, rows.length) : rows.length;
  const limit = allowedSend(requested);
  if (limit <= 0) {
    return NextResponse.json(
      { ok: false, error: "Send cap reached (daily or monthly)." },
      { status: 429 }
    );
  }
  rows = rows.slice(0, limit);

  const results = [];
  for (const r of rows) results.push(await sendOne(r));
  const sent = results.filter((r) => r.ok).length;
  if (sent > 0) incSends(sent);

  return NextResponse.json({ ok: true, sent, results });
}
