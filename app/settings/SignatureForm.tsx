"use client";

import { useState } from "react";

type Sig = {
  name: string;
  replyEmail: string;
  phone: string;
  mailingAddress: string;
  bookingLink: string;
};

const FIELDS: { key: keyof Sig; label: string; hint: string; placeholder: string }[] = [
  { key: "name", label: "Your name", hint: "First name is substituted into both 'I'm [name]' and the closing '— [name]'.", placeholder: "Edison Liu" },
  { key: "replyEmail", label: "Reply email", hint: "Emails send FROM your verified sender, but recipient replies route to this address. Recipients also see it in your signature.", placeholder: "you@gmail.com" },
  { key: "phone", label: "Phone", hint: "Shown in the signature next to your email.", placeholder: "2142187004" },
  { key: "mailingAddress", label: "Mailing address", hint: "Required by CAN-SPAM for cold email. City is auto-extracted for the 'based in X' line.", placeholder: "Rio Crest LLC, 17350 State Hwy 249, Houston, TX 77064" },
  { key: "bookingLink", label: "Booking link", hint: "Your cal.com / Calendly URL. Powers the primary 'Book a call' CTA on every preview page. Blank falls back to a mailto.", placeholder: "https://calendly.com/yourhandle/30min" },
];

export default function SignatureForm({ initial }: { initial: Sig }) {
  const [sig, setSig] = useState<Sig>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function set(key: keyof Sig, value: string) {
    setSig((p) => ({ ...p, [key]: value }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    try {
      const settings: Record<string, string> = {
        SIG_NAME: sig.name,
        REPLY_EMAIL: sig.replyEmail,
        SIG_PHONE: sig.phone,
        MAILING_ADDRESS: sig.mailingAddress,
        BOOKING_LINK: sig.bookingLink,
      };
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const data = await res.json();
      if (!data.ok) alert(`Error: ${data.error}`);
      else setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  const firstName = sig.name.split(" ")[0] || "[name]";
  const contact = [sig.replyEmail, sig.phone].filter(Boolean).join(" · ");

  return (
    <>
      <div className="panel">
        {FIELDS.map((f) => (
          <div key={f.key} className="settings-field">
            <div className="settings-label"><label>{f.label}</label></div>
            <input
              value={sig[f.key]}
              placeholder={f.placeholder}
              onChange={(e) => set(f.key, e.target.value)}
              style={{ width: "100%" }}
            />
            <p className="faint" style={{ fontSize: 12, margin: "4px 0 0" }}>{f.hint}</p>
          </div>
        ))}
        <div style={{ marginTop: 16 }}>
          <button disabled={saving} onClick={save}>{saving ? "Saving…" : saved ? "Saved ✓" : "Save signature"}</button>
        </div>
      </div>

      <div className="step-label">Preview of the signature block</div>
      <div className="panel">
        <p style={{ margin: 0 }}>— {sig.name || "[your name]"} · Rio Apex</p>
        {contact && <p className="muted" style={{ margin: "4px 0", fontSize: 13 }}>{contact}</p>}
        {sig.bookingLink && <p style={{ margin: "4px 0" }}><a className="link" href={sig.bookingLink}>Book a call with {firstName} →</a></p>}
        {sig.mailingAddress && <p className="faint" style={{ fontSize: 12, margin: "10px 0 0" }}>{sig.mailingAddress}</p>}
      </div>
    </>
  );
}
