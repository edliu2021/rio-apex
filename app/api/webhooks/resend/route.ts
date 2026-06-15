import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getDb, advanceStatus, recordEvent, getSetting } from "@/lib/db";

// Resend event types -> our funnel stage.
const MAP: Record<string, string> = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.opened": "opened",
  "email.clicked": "clicked",
  "email.bounced": "bounced",
  "email.complained": "bounced",
};

type ResendPayload = {
  type?: string;
  data?: {
    to?: string | string[];
    tags?: Array<{ name: string; value: string }> | Record<string, string>;
    email_id?: string;
  };
};

// Resend signs webhooks with Svix. Verify HMAC-SHA256 over `${id}.${timestamp}.${body}`
// using the base64 secret (the part after the `whsec_` prefix). Returns true if valid,
// or if no secret is configured (dev passthrough).
function verifySignature(secret: string | undefined, headers: Headers, rawBody: string): boolean {
  if (!secret) return true; // not configured — allow (dev)
  const id = headers.get("svix-id") || headers.get("webhook-id");
  const timestamp = headers.get("svix-timestamp") || headers.get("webhook-timestamp");
  const signature = headers.get("svix-signature") || headers.get("webhook-signature");
  if (!id || !timestamp || !signature) return false;

  // Reject stale messages (>5 min) to prevent replay.
  const ts = Number(timestamp);
  if (Number.isFinite(ts) && Math.abs(Date.now() / 1000 - ts) > 300) return false;

  const key = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let secretBytes: Buffer;
  try {
    secretBytes = Buffer.from(key, "base64");
  } catch {
    return false;
  }
  const signedContent = `${id}.${timestamp}.${rawBody}`;
  const expected = crypto.createHmac("sha256", secretBytes).update(signedContent).digest("base64");

  // Header is space-separated list of `v1,<sig>` (possibly multiple signatures).
  const provided = signature.split(" ").map((s) => (s.includes(",") ? s.split(",")[1] : s));
  return provided.some((s) => {
    try {
      const a = Buffer.from(s);
      const b = Buffer.from(expected);
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    } catch {
      return false;
    }
  });
}

function prospectIdFrom(payload: ResendPayload): number | null {
  const db = getDb();
  const tags = payload.data?.tags;
  if (Array.isArray(tags)) {
    const t = tags.find((x) => x.name === "prospect_id");
    if (t) return Number(t.value);
  } else if (tags && typeof tags === "object" && "prospect_id" in tags) {
    return Number((tags as Record<string, string>).prospect_id);
  }
  const to = Array.isArray(payload.data?.to) ? payload.data?.to[0] : payload.data?.to;
  if (to) {
    const row = db.prepare("SELECT id FROM prospects WHERE email = ?").get(to) as
      | { id: number }
      | undefined;
    if (row) return row.id;
  }
  return null;
}

export async function POST(req: Request) {
  // Read the raw body first — signature verification needs the exact bytes.
  const rawBody = await req.text();

  const secret = getSetting("RESEND_WEBHOOK_SECRET");
  if (!verifySignature(secret, req.headers, rawBody)) {
    return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 401 });
  }

  let payload: ResendPayload;
  try {
    payload = JSON.parse(rawBody) as ResendPayload;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const stage = payload.type ? MAP[payload.type] : undefined;
  if (!stage) return NextResponse.json({ ok: true, ignored: payload.type });

  const prospectId = prospectIdFrom(payload);
  if (!prospectId) return NextResponse.json({ ok: true, unmatched: true });

  recordEvent(prospectId, stage, { type: payload.type });
  advanceStatus(prospectId, stage);
  return NextResponse.json({ ok: true });
}
