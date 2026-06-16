import { Resend } from "resend";
import { getSetting, getSignature, type Prospect, type Draft } from "./db";
import { PREVIEW_TOKEN, buildDraft } from "./compose";

export type SendResult = {
  ok: boolean;
  id?: string;
  dryRun?: boolean;
  error?: string;
};

export function previewUrl(prospect: Prospect): string {
  const base = (getSetting("APP_BASE_URL") || "http://localhost:3000").replace(/\/+$/, "");
  if (prospect.preview_code && prospect.preview_slug) {
    return `${base}/p/${prospect.preview_code}/${prospect.preview_slug}`;
  }
  return `${base}/p/${prospect.preview_slug}`;
}

function displayDomain(prospect: Prospect): string {
  const raw = prospect.website_url || prospect.business_name;
  return raw.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// The styled "their domain" button — display text is THEIR domain, href is YOUR preview.
function linkButton(url: string, domain: string): string {
  return `<p style="margin:24px 0">
    <a href="${url}" style="display:inline-block;padding:14px 22px;background:#0a0a0a;color:#fff;text-decoration:none;border-radius:10px;font-weight:600">
      ${esc(domain)} — your preview ↗
    </a>
  </p>`;
}

// Rendered signature block (managed in /settings). Appended to every email.
function signatureBlock(): string {
  const sig = getSignature();
  if (!sig.name && !sig.replyEmail) return "";
  const contact = [sig.replyEmail, sig.phone].filter(Boolean).join(" · ");
  const booking = sig.bookingLink
    ? `<p style="margin:6px 0"><a href="${sig.bookingLink}" style="color:#6d28d9">Book a call with me →</a></p>`
    : "";
  const addr = sig.mailingAddress
    ? `<p style="font-size:12px;color:#999;margin:12px 0 0">${esc(sig.mailingAddress)}</p>`
    : "";
  return `<div style="margin-top:24px">
    <p style="margin:0">— ${esc(sig.name)} · Rio Apex</p>
    ${contact ? `<p style="margin:4px 0;color:#555;font-size:13px">${esc(contact)}</p>` : ""}
    ${booking}
    ${addr}
  </div>`;
}

// Turn the editable plain-text draft body into HTML, swapping the preview token
// for the styled link button.
function renderBody(body: string, url: string, domain: string): { html: string; text: string } {
  const paragraphs = body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const htmlParts: string[] = [];
  const textParts: string[] = [];
  for (const p of paragraphs) {
    if (p.includes(PREVIEW_TOKEN)) {
      htmlParts.push(linkButton(url, domain));
      textParts.push(`${domain}: ${url}`);
    } else {
      htmlParts.push(`<p>${esc(p)}</p>`);
      textParts.push(p);
    }
  }
  return { html: htmlParts.join("\n"), text: textParts.join("\n\n") };
}

export function renderEmail(
  prospect: Prospect,
  draft: { subject: string; body: string }
): { subject: string; html: string; text: string } {
  const url = previewUrl(prospect);
  const domain = displayDomain(prospect);
  const { html: bodyHtml, text: bodyText } = renderBody(draft.body, url, domain);
  const sig = getSignature();

  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.6;color:#111;max-width:560px">
  ${bodyHtml}
  ${signatureBlock()}
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
  <p style="font-size:12px;color:#888">
    You received this because your business is publicly listed. Not interested?
    <a href="${url}?unsubscribe=1" style="color:#888">Unsubscribe</a>.
  </p>
</div>`;

  const text = `${bodyText}

— ${sig.name} · Rio Apex
${[sig.replyEmail, sig.phone].filter(Boolean).join(" · ")}

Not interested? Unsubscribe: ${url}?unsubscribe=1`;

  return { subject: draft.subject, html, text };
}

export async function sendEmail(prospect: Prospect, draft?: Draft | null): Promise<SendResult> {
  if (!prospect.email) return { ok: false, error: "no email" };
  const d = draft ?? buildDraft(prospect);
  const { subject, html, text } = renderEmail(prospect, d);

  const dryRun = (getSetting("DRY_RUN") ?? "true") !== "false";
  const resendKey = getSetting("RESEND_API_KEY");
  if (dryRun || !resendKey) {
    console.log(`\n[DRY_RUN] would send to ${prospect.email}\nsubject: ${subject}\n`);
    return { ok: true, dryRun: true, id: `dry_${Date.now()}` };
  }

  const resend = new Resend(resendKey);
  const from = getSetting("RESEND_FROM") || "Rio Apex <hello@rioapex.com>";
  const replyTo = getSignature().replyEmail || getSetting("REPLY_TO") || undefined;

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: prospect.email,
      subject,
      html,
      text,
      replyTo,
      tags: [{ name: "prospect_id", value: String(prospect.id) }],
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data?.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "send failed" };
  }
}
