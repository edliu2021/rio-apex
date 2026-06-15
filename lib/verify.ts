// Email verification via Bouncer. If no key is set we pass through as
// 'unverified' so the app still runs end-to-end in dev. NEVER send to
// 'invalid' addresses in production — bounces wreck domain reputation.

export type VerifyResult = "valid" | "risky" | "invalid" | "unverified";

export async function verifyEmail(email: string): Promise<VerifyResult> {
  const { getSetting } = await import("./db");
  const key = getSetting("BOUNCER_API_KEY");
  if (!key) return "unverified";
  try {
    const res = await fetch(
      `https://api.usebouncer.com/v1.1/email/verify?email=${encodeURIComponent(email)}`,
      { headers: { "x-api-key": key }, signal: AbortSignal.timeout(15000) }
    );
    if (!res.ok) return "unverified";
    const data = (await res.json()) as { status?: string };
    // Bouncer returns: deliverable | risky | undeliverable | unknown
    switch (data.status) {
      case "deliverable":
        return "valid";
      case "risky":
      case "unknown":
        return "risky";
      case "undeliverable":
        return "invalid";
      default:
        return "unverified";
    }
  } catch {
    return "unverified";
  }
}

// Only valid/risky/unverified are eligible to send. invalid is blocked.
export function isSendable(status: string): boolean {
  return status !== "invalid";
}
