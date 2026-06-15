"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type SettingInfo = { value: string; source: "db" | "env" | "none" };
type SettingsMap = Record<string, SettingInfo>;

type Field = {
  key: string;
  label: string;
  secret?: boolean;
  placeholder?: string;
};

const SECTIONS: { title: string; description: string; fields: Field[] }[] = [
  {
    title: "General",
    description: "App-wide settings",
    fields: [
      { key: "ACCESS_CODE", label: "Access code", secret: true, placeholder: "let-me-in" },
      { key: "APP_BASE_URL", label: "App base URL", placeholder: "https://yourdomain.com" },
      { key: "DRY_RUN", label: "Dry run", placeholder: "true" },
    ],
  },
  {
    title: "Anthropic (AI generation)",
    description: "Powers the redesign previews",
    fields: [
      { key: "ANTHROPIC_API_KEY", label: "API key", secret: true, placeholder: "sk-ant-..." },
      { key: "ANTHROPIC_MODEL", label: "Model", placeholder: "claude-sonnet-4-6" },
    ],
  },
  {
    title: "Resend (email)",
    description: "Sends tracked cold emails",
    fields: [
      { key: "RESEND_API_KEY", label: "API key", secret: true, placeholder: "re_..." },
      { key: "RESEND_FROM", label: "From address", placeholder: "You <you@yourdomain.com>" },
      { key: "REPLY_TO", label: "Reply-to", placeholder: "you@gmail.com" },
      { key: "RESEND_WEBHOOK_SECRET", label: "Webhook secret", secret: true, placeholder: "whsec_..." },
    ],
  },
  {
    title: "Lead sourcing",
    description: "Google Places + email verification",
    fields: [
      { key: "GOOGLE_PLACES_API_KEY", label: "Google Places key", secret: true, placeholder: "AIza..." },
      { key: "BOUNCER_API_KEY", label: "Bouncer key", secret: true, placeholder: "..." },
    ],
  },
  {
    title: "Activate offer",
    description: "CTA bar on preview pages",
    fields: [
      { key: "ACTIVATE_PRICE", label: "Price label", placeholder: "$297/mo" },
      { key: "ACTIVATE_URL", label: "Payment link URL", placeholder: "https://buy.stripe.com/..." },
    ],
  },
];

export default function SettingsForm() {
  const [settings, setSettings] = useState<SettingsMap>({});
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setSettings(d.settings);
        setLoaded(true);
      });
  }, []);

  function setEdit(key: string, value: string) {
    setEdits((prev) => ({ ...prev, [key]: value }));
  }

  async function saveSection(fields: Field[]) {
    const sectionKey = fields[0].key;
    setSaving(sectionKey);
    const payload: Record<string, string> = {};
    for (const f of fields) {
      if (edits[f.key] !== undefined) {
        payload[f.key] = edits[f.key];
      }
    }
    if (Object.keys(payload).length === 0) {
      setSaving(null);
      return;
    }
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: payload }),
      });
      const data = await res.json();
      if (!data.ok) {
        alert(`Error: ${data.error}`);
      } else {
        // Refresh settings
        const r = await fetch("/api/settings");
        const d = await r.json();
        if (d.ok) setSettings(d.settings);
        // Clear edits for saved fields
        setEdits((prev) => {
          const next = { ...prev };
          for (const f of fields) delete next[f.key];
          return next;
        });
      }
    } finally {
      setSaving(null);
    }
  }

  function statusDot(info?: SettingInfo): { color: string; title: string } {
    if (!info || info.source === "none") return { color: "var(--border)", title: "Not configured" };
    if (info.source === "db") return { color: "var(--green)", title: "Set (saved in app)" };
    return { color: "var(--amber)", title: "Using .env default" };
  }

  function hasSectionEdits(fields: Field[]) {
    return fields.some((f) => edits[f.key] !== undefined);
  }

  if (!loaded) {
    return (
      <div className="container">
        <p className="muted">Loading settings…</p>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1>Settings</h1>
          <p className="muted">API keys and configuration. Saved values override .env defaults — no restart needed.</p>
        </div>
        <Link href="/app" style={{ color: "var(--blue)", textDecoration: "none", fontSize: 14 }}>
          ← Dashboard
        </Link>
      </div>

      {SECTIONS.map((section) => {
        const sectionSaving = saving === section.fields[0].key;
        return (
          <div key={section.title} className="panel settings-group">
            <h2>{section.title}</h2>
            <p className="muted" style={{ margin: "-6px 0 16px", fontSize: 13 }}>{section.description}</p>

            {section.fields.map((field) => {
              const info = settings[field.key];
              const dot = statusDot(info);
              const isEditing = edits[field.key] !== undefined;
              const displayValue = isEditing ? edits[field.key] : "";
              const placeholderText =
                info?.source !== "none" && info?.value
                  ? info.value
                  : field.placeholder || "";

              return (
                <div key={field.key} className="settings-field">
                  <div className="settings-label">
                    <span className="status-dot" style={{ background: dot.color }} title={dot.title} />
                    <label>{field.label}</label>
                    <span className="muted" style={{ fontSize: 12, marginLeft: 4 }}>{field.key}</span>
                  </div>
                  <input
                    type={field.secret ? "password" : "text"}
                    placeholder={placeholderText}
                    value={displayValue}
                    onChange={(e) => setEdit(field.key, e.target.value)}
                    style={{ width: "100%" }}
                  />
                  {info?.source !== "none" && !isEditing && (
                    <button
                      className="ghost"
                      style={{ padding: "4px 10px", fontSize: 12, marginTop: 4 }}
                      onClick={() => setEdit(field.key, "")}
                    >
                      Clear saved value
                    </button>
                  )}
                </div>
              );
            })}

            <div style={{ marginTop: 16 }}>
              <button
                disabled={!hasSectionEdits(section.fields) || sectionSaving}
                onClick={() => saveSection(section.fields)}
              >
                {sectionSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
