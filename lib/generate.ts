import Anthropic from "@anthropic-ai/sdk";
import { getSetting, type Service } from "./db";

export type GenerateInput = {
  service?: Service; // web_redesign | ig_posting
  businessName: string;
  city?: string | null;
  rating?: number | null;
  websiteUrl?: string | null;
  currentSiteText?: string | null; // optional scraped copy for grounding
  activateHref: string;
  activatePrice: string; // e.g. "$297/mo"
  bookingHref?: string | null; // cal.com / Calendly — primary CTA
};

const SYSTEM_WEB = `You are a senior web designer. You produce a single, self-contained, production-quality HTML homepage redesign for a small business.

Hard requirements:
- Return ONE complete HTML document only. No markdown, no code fences, no commentary.
- All CSS in a single <style> tag in <head>. No external CSS/JS/font files, no frameworks, no <script>.
- Mobile-first and responsive. Modern, clean, fast. System font stack only.
- Use ONLY the real business facts provided. Do not invent awards, phone numbers, addresses, or fake reviews.
- Sections: hero with the business name + a strong tagline, a short about, 3 service/feature blocks, a testimonial or rating callout if a rating is given, and a contact/CTA section.
- Leave a placeholder comment <!--ACTIVATE_BAR--> as the very first child of <body>; the host app injects a sticky CTA there.`;

const SYSTEM_IG = `You are a senior social-media designer. You produce a single, self-contained, production-quality HTML page showing a mock Instagram profile grid for a small business.

Hard requirements:
- Return ONE complete HTML document only. No markdown, no code fences, no commentary.
- All CSS in a single <style> tag in <head>. No external CSS/JS/font files, no frameworks, no <script>.
- The grid MUST contain EXACTLY NINE post tiles arranged 3 columns × 3 rows (a 3x3 Instagram grid). Number them 1/9 through 9/9. Do NOT produce 6 — produce all NINE. On mobile, collapse to 1 column.
- Each tile is a square with a CSS gradient background, a category label, an overlaid post caption idea, and a short hashtag line. No real images — use tasteful CSS gradients and typography.
- Use ONLY the real business facts provided. Captions should be specific to this business and niche.
- Any count you mention in copy must say "9" / "nine" (e.g. "Nine scroll-stopping concepts"), never six.
- Include a short hero line at top ("A month of posts for {business}, ready to go") and a closing CTA section.
- Leave a placeholder comment <!--ACTIVATE_BAR--> as the very first child of <body>; the host app injects a sticky CTA there.`;

function buildUserPrompt(input: GenerateInput): string {
  const facts = [
    `Business name: ${input.businessName}`,
    input.city ? `City: ${input.city}` : null,
    input.rating ? `Google rating: ${input.rating} stars` : null,
    input.websiteUrl ? `Current website: ${input.websiteUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const grounding = input.currentSiteText
    ? `\n\nHere is text scraped from their current site (use it to infer what they offer; do not copy verbatim):\n"""\n${input.currentSiteText.slice(0, 4000)}\n"""`
    : "";

  const task =
    input.service === "ig_posting"
      ? "Create the mock Instagram feed of 6 post concepts for this business."
      : "Redesign the homepage for this business.";

  return `${task}\n\n${facts}${grounding}\n\nReturn the full HTML document now.`;
}

// Guaranteed sticky CTA bar — injected regardless of model output so the
// primary CTA is never missing. Booking link is primary; Activate is secondary.
function activateBar(input: GenerateInput): string {
  const booking = input.bookingHref
    ? `<a href="${input.bookingHref}" style="background:#fff;color:#0a0a0a;text-decoration:none;font-weight:700;padding:8px 16px;border-radius:8px;white-space:nowrap">Book a call →</a>`
    : "";
  const activate = `<a href="${input.activateHref}" style="background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:#fff;text-decoration:none;font-weight:700;padding:8px 16px;border-radius:8px;white-space:nowrap">Activate · ${input.activatePrice}</a>`;
  return `<div style="position:sticky;top:0;z-index:9999;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 16px;background:#0a0a0a;color:#fff;font-family:system-ui,-apple-system,sans-serif;font-size:14px">
  <span style="opacity:.85">Like this? Take it live this week.</span>
  <span style="display:flex;gap:8px">${booking}${activate}</span>
</div>`;
}

function injectBar(html: string, input: GenerateInput): string {
  const bar = activateBar(input);
  if (html.includes("<!--ACTIVATE_BAR-->")) {
    return html.replace("<!--ACTIVATE_BAR-->", bar);
  }
  const m = html.match(/<body[^>]*>/i);
  if (m) {
    return html.replace(m[0], `${m[0]}\n${bar}`);
  }
  return bar + html;
}

export async function generatePreview(input: GenerateInput): Promise<string> {
  const key = getSetting("ANTHROPIC_API_KEY");
  if (!key) {
    // Dev fallback so the pipeline runs without a key.
    return injectBar(placeholderHtml(input), input);
  }
  const client = new Anthropic({ apiKey: key });
  const model = getSetting("ANTHROPIC_MODEL") || "claude-sonnet-4-6";
  const system = input.service === "ig_posting" ? SYSTEM_IG : SYSTEM_WEB;

  const msg = await client.messages.create({
    model,
    max_tokens: 8000,
    system,
    messages: [{ role: "user", content: buildUserPrompt(input) }],
  });

  const raw = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  const html = stripFences(raw);
  return injectBar(html, input);
}

function stripFences(s: string): string {
  const fence = s.match(/```(?:html)?\s*([\s\S]*?)```/i);
  const body = fence ? fence[1] : s;
  const start = body.search(/<!doctype html|<html/i);
  return start >= 0 ? body.slice(start).trim() : body.trim();
}

function placeholderHtml(input: GenerateInput): string {
  if (input.service === "ig_posting") return placeholderIg(input);
  const stars = input.rating ? `★ ${input.rating}` : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${input.businessName} — redesign preview</title>
<style>
  :root{--bg:#fafaf9;--ink:#0a0a0a;--accent:#1a1a1a}
  *{box-sizing:border-box;margin:0} body{font-family:system-ui,-apple-system,sans-serif;color:var(--ink);background:var(--bg);line-height:1.6}
  .wrap{max-width:980px;margin:0 auto;padding:0 24px}
  header{padding:96px 0 64px;text-align:center}
  h1{font-size:clamp(36px,7vw,64px);letter-spacing:-.02em;margin-bottom:16px}
  .sub{font-size:20px;opacity:.7;max-width:640px;margin:0 auto}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px;padding:48px 0}
  .card{background:#fff;border:1px solid #eee;border-radius:16px;padding:28px}
  .card h3{margin-bottom:8px} .badge{display:inline-block;margin-top:16px;padding:6px 14px;border:1px solid #ddd;border-radius:999px;font-size:14px}
  footer{padding:72px 0;text-align:center;opacity:.6;font-size:14px}
</style></head>
<body>
<!--ACTIVATE_BAR-->
<header class="wrap">
  <h1>${input.businessName}</h1>
  <p class="sub">A faster, cleaner home for ${input.city ?? "your business"}. This is a preview built just for you${stars ? ` — ${stars} on Google` : ""}.</p>
  ${stars ? `<span class="badge">${stars} · loved by locals</span>` : ""}
</header>
<section class="wrap grid">
  <div class="card"><h3>What you do</h3><p>Clear, scannable services up top so visitors act in seconds.</p></div>
  <div class="card"><h3>Why you</h3><p>Social proof and your rating front-and-center to build trust fast.</p></div>
  <div class="card"><h3>Get in touch</h3><p>One obvious call-to-action on every screen size.</p></div>
</section>
<footer class="wrap">Preview generated for ${input.businessName}. Set ANTHROPIC_API_KEY to generate real redesigns.</footer>
</body></html>`;
}

function placeholderIg(input: GenerateInput): string {
  const gradients = [
    "linear-gradient(135deg,#f97316,#db2777)",
    "linear-gradient(135deg,#8b5cf6,#6d28d9)",
    "linear-gradient(135deg,#10b981,#0ea5e9)",
    "linear-gradient(135deg,#f59e0b,#ef4444)",
    "linear-gradient(135deg,#6366f1,#ec4899)",
    "linear-gradient(135deg,#14b8a6,#6366f1)",
    "linear-gradient(135deg,#e11d48,#7c3aed)",
    "linear-gradient(135deg,#0ea5e9,#22c55e)",
    "linear-gradient(135deg,#a855f7,#f59e0b)",
  ];
  const captions = [
    "Behind the scenes today ✨",
    `Why locals love ${input.businessName}`,
    "New this week →",
    "Meet the team 👋",
    "Your weekend plan, sorted",
    "Tag someone who needs this",
    "A little before & after 🔁",
    "Q&A: your questions answered",
    "Book your spot this week 📅",
  ];
  const tiles = gradients
    .map(
      (g, i) => `<div class="tile" style="background:${g}">
      <div class="cap">${captions[i]}</div>
      <div class="tag">#${(input.city ?? "local").toString().toLowerCase().replace(/[^a-z]/g, "")} #smallbusiness</div>
    </div>`
    )
    .join("\n");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${input.businessName} — Instagram concepts</title>
<style>
  *{box-sizing:border-box;margin:0} body{font-family:system-ui,-apple-system,sans-serif;color:#0a0a0a;background:#fafaf9;line-height:1.6}
  .wrap{max-width:900px;margin:0 auto;padding:0 24px}
  header{padding:72px 0 32px;text-align:center}
  h1{font-size:clamp(28px,6vw,48px);letter-spacing:-.02em;margin-bottom:12px}
  .sub{font-size:18px;opacity:.7;max-width:560px;margin:0 auto}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:32px 0}
  @media(max-width:640px){.grid{grid-template-columns:1fr}}
  .tile{aspect-ratio:1;border-radius:14px;color:#fff;padding:18px;display:flex;flex-direction:column;justify-content:space-between}
  .cap{font-size:20px;font-weight:700;text-shadow:0 1px 8px rgba(0,0,0,.25)}
  .tag{font-size:12px;opacity:.9}
  footer{padding:64px 0;text-align:center;opacity:.6;font-size:14px}
</style></head>
<body>
<!--ACTIVATE_BAR-->
<header class="wrap">
  <h1>A month of posts for ${input.businessName}</h1>
  <p class="sub">Nine ready-to-publish concepts, built just for you${input.city ? ` in ${input.city}` : ""}.</p>
</header>
<section class="wrap grid">
${tiles}
</section>
<footer class="wrap">Concepts generated for ${input.businessName}. Set ANTHROPIC_API_KEY to generate real ones.</footer>
</body></html>`;
}
