import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isAuthed } from "@/lib/auth";

export async function POST(req: Request) {
  if (!isAuthed()) return NextResponse.json({ ok: false }, { status: 401 });
  const { name, niche } = (await req.json()) as { name?: string; niche?: string };
  if (!name?.trim()) return NextResponse.json({ ok: false, error: "name required" }, { status: 400 });
  const info = getDb()
    .prepare("INSERT INTO campaigns (name, niche) VALUES (?, ?)")
    .run(name.trim(), niche?.trim() || null);
  return NextResponse.json({ ok: true, id: info.lastInsertRowid });
}
