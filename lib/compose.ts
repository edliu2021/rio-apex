import { getSignature, priceFor, type Prospect, type Service } from "./db";

// Builds the editable cold-email DRAFT (subject + body) for one prospect.
// This is the output of Step 2 (Compose). The operator can edit it inline.
// The preview link and signature block are injected at SEND time (see lib/email.ts),
// so the body stays clean and editable. {{PREVIEW_LINK}} marks where the link goes.

export const PREVIEW_TOKEN = "{{PREVIEW_LINK}}";

export function buildDraft(prospect: Prospect): { subject: string; body: string } {
  const service = (prospect.service as Service) || "web_redesign";
  const sig = getSignature();
  const price = priceFor(service);
  const biz = prospect.business_name;

  // Lead with relevance, not the sender's location — position yourself as someone
  // who does exactly what this prospect needs. Personalization comes from their
  // real city + rating below.
  const first = sig.name ? sig.name.split(" ")[0] : "";
  const intro =
    service === "ig_posting"
      ? (first ? `I'm ${first} — I help local businesses grow on Instagram.` : "I help local businesses grow on Instagram.")
      : (first ? `I'm ${first} — I redesign websites for local businesses.` : "I redesign websites for local businesses.");
  const inCity = prospect.city ? ` in ${prospect.city}` : "";
  const ratingBit = prospect.rating
    ? ` — your ${prospect.rating}★ stood out, you're clearly doing something right`
    : "";
  // Only promise a call link if a booking link is actually configured.
  const chatLine = sig.bookingLink
    ? "Prefer to chat first? The same page has a link to book a quick call."
    : null;

  if (service === "ig_posting") {
    const subject = `Made you 9 Instagram post concepts — ${biz}`;
    const body = [
      "Hi 👋",
      `${intro} Came across ${biz}${inCity} on Google${ratingBit}, and thought your feed could pop a little more.`,
      "So I mocked up a full 9-post grid as a freebie. Click below to see the concepts:",
      PREVIEW_TOKEN,
      `Yours to keep, no charge. If you'd like a full month of posts done for you, one click gets it started — ${price}. No sales call required.`,
      chatLine,
    ].filter(Boolean).join("\n\n");
    return { subject, body };
  }

  // web_redesign (default)
  const subject = `Made you a free homepage redesign — ${biz}`;
  const body = [
    "Hi 👋",
    `${intro} Came across ${biz}${inCity} on Google${ratingBit}, and felt yours should match.`,
    "So I built a fresh homepage concept as a freebie. Click below to see it side by side with your current site:",
    PREVIEW_TOKEN,
    `Yours to keep, no charge. If you like what you see, one click takes it live this week — ${price}, $0 down. No sales call required.`,
    chatLine,
  ].filter(Boolean).join("\n\n");
  return { subject, body };
}
