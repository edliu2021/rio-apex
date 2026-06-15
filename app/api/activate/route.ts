import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { checkCode, sessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  const { code } = (await req.json()) as { code?: string };
  if (!code || !checkCode(code)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  cookies().set(sessionCookie());
  return NextResponse.json({ ok: true });
}
