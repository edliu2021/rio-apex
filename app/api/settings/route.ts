import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getAllSettings, getSetting, setSetting, deleteSetting } from "@/lib/db";

const ALLOWED_KEYS = new Set([
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_MODEL",
  "RESEND_API_KEY",
  "RESEND_FROM",
  "REPLY_TO",
  "RESEND_WEBHOOK_SECRET",
  "GOOGLE_PLACES_API_KEY",
  "BOUNCER_API_KEY",
  "PEXELS_API_KEY",
  "ACTIVATE_PRICE",
  "ACTIVATE_PRICE_IG",
  "ACTIVATE_URL",
  "APP_BASE_URL",
  "DRY_RUN",
  "ACCESS_CODE",
  // Plan + email signature
  "PLAN",
  "SIG_NAME",
  "REPLY_EMAIL",
  "SIG_PHONE",
  "MAILING_ADDRESS",
  "BOOKING_LINK",
]);

const SECRET_KEYS = new Set([
  "ANTHROPIC_API_KEY",
  "RESEND_API_KEY",
  "GOOGLE_PLACES_API_KEY",
  "BOUNCER_API_KEY",
  "PEXELS_API_KEY",
  "RESEND_WEBHOOK_SECRET",
  "ACCESS_CODE",
]);

function mask(value: string): string {
  if (value.length <= 4) return "••••";
  return "••••" + value.slice(-4);
}

export async function GET() {
  if (!isAuthed()) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const dbSettings = getAllSettings();
  const result: Record<string, { value: string; source: "db" | "env" | "none" }> = {};

  for (const key of ALLOWED_KEYS) {
    const dbVal = dbSettings[key];
    const envVal = process.env[key];
    if (dbVal) {
      result[key] = {
        value: SECRET_KEYS.has(key) ? mask(dbVal) : dbVal,
        source: "db",
      };
    } else if (envVal) {
      result[key] = {
        value: SECRET_KEYS.has(key) ? mask(envVal) : envVal,
        source: "env",
      };
    } else {
      result[key] = { value: "", source: "none" };
    }
  }

  return NextResponse.json({ ok: true, settings: result });
}

export async function POST(req: Request) {
  if (!isAuthed()) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const body = await req.json();

  // Support bulk { settings: { KEY: value } } or single { key, value }
  const entries: [string, string][] = [];

  if (body.settings && typeof body.settings === "object") {
    for (const [k, v] of Object.entries(body.settings)) {
      entries.push([k, String(v)]);
    }
  } else if (body.key) {
    entries.push([body.key, body.value ?? ""]);
  } else {
    return NextResponse.json({ ok: false, error: "missing key or settings" }, { status: 400 });
  }

  for (const [key, value] of entries) {
    if (!ALLOWED_KEYS.has(key)) {
      return NextResponse.json({ ok: false, error: `key not allowed: ${key}` }, { status: 400 });
    }
    if (value === "") {
      deleteSetting(key);
    } else {
      setSetting(key, value);
    }
  }

  return NextResponse.json({ ok: true });
}
