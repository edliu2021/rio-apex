import { cookies } from "next/headers";
import { getSetting } from "./db";

const COOKIE = "jaguar_session";

function accessCode(): string {
  return getSetting("ACCESS_CODE") || "let-me-in";
}

export function checkCode(code: string): boolean {
  return code.trim() === accessCode();
}

export function isAuthed(): boolean {
  const c = cookies().get(COOKIE)?.value;
  return c === accessCode();
}

export function sessionCookie() {
  return {
    name: COOKIE,
    value: accessCode(),
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}
