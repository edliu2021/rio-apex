"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { QuotaSnapshot } from "@/lib/quota";
import type { Service } from "@/lib/db";
import type { BatchRow } from "@/lib/stats";

type DraftRow = {
  prospect_id: number;
  business_name: string;
  email: string | null;
  email_status: string;
  subject: string;
  body: string;
  state: string;
  edited: number;
  preview_code: string | null;
  preview_slug: string | null;
  has_preview: number;
};
type Counts = {
  waiting: number;
  older: number;
  ready: number;
  verifiedToCompose: number;
  unsentToCompose: number;
  previewsNeeded: number;
};
type Scope = "current" | "unsent" | "sent";

export default function Actions({
  quota,
  currentService,
  currentIndustry,
  currentCity,
  counts,
  initialDrafts,
  batches,
}: {
  quota: QuotaSnapshot;
  currentService: Service;
  currentIndustry: string;
  currentCity: string;
  counts: Counts;
  initialDrafts: DraftRow[];
  batches: BatchRow[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  // Step 1 form
  const [service, setService] = useState<Service>(currentService);
  const [source, setSource] = useState<"google_maps" | "csv">("google_maps");
  const [industry, setIndustry] = useState(currentIndustry);
  const [city, setCity] = useState(currentCity);
  const [count, setCount] = useState(20);
  const [csv, setCsv] = useState("");

  // Drafts
  const [drafts, setDrafts] = useState<DraftRow[]>(initialDrafts);
  const [draftScope, setDraftScope] = useState<Scope>("current");

  // Step 4
  const [sendScope, setSendScope] = useState<"current" | "all_ready">("current");
  const [sendCap, setSendCap] = useState(Math.min(10, quota.sendsDay.cap));

  async function post(label: string, url: string, body: unknown, method = "POST") {
    setBusy(label);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      // Resilient parse: a crashed route can return an empty body.
      const text = await res.text();
      let data: { ok?: boolean; error?: string; sent?: number } = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }
      if (!res.ok || data.ok === false) {
        alert(`Error: ${data.error || res.statusText || `request failed (${res.status})`}`);
      }
      return data;
    } finally {
      setBusy(null);
    }
  }

  async function loadDrafts(scope: Scope) {
    setDraftScope(scope);
    const res = await fetch(`/api/drafts?scope=${scope}`);
    const data = await res.json();
    if (data.ok) setDrafts(data.drafts);
  }

  const readyCount = drafts.filter((d) => d.state === "ready").length;
  const sendCapPct = Math.min(100, Math.round((quota.sendsDay.used / quota.sendsDay.cap) * 100));

  return (
    <>
      {/* ---------- STEP 01 ---------- */}
      <div className="panel">
        <div className="step-label">Step 01 · Scrape verified leads</div>

        <div className="row" style={{ marginBottom: 14 }}>
          <span className="muted" style={{ width: 150 }}>Service you&apos;re offering:</span>
          <div className="toggle">
            <button className={service === "web_redesign" ? "on" : ""} onClick={() => setService("web_redesign")}>🖥️ Web redesign</button>
            <button className={service === "ig_posting" ? "on" : ""} onClick={() => setService("ig_posting")}>📸 IG posting</button>
          </div>
          <span className="faint" style={{ fontSize: 13 }}>
            {service === "ig_posting"
              ? "Recipients get a 9-tile IG concept · email pitches $1,500/mo"
              : "Recipients get a personalized landing page · email pitches $297/mo"}
          </span>
        </div>

        <div className="row" style={{ marginBottom: 14 }}>
          <span className="muted" style={{ width: 150 }}>Data source:</span>
          <div className="toggle">
            <button className={source === "google_maps" ? "on" : ""} onClick={() => setSource("google_maps")}>📍 Google Maps</button>
            <button className={source === "csv" ? "on" : ""} onClick={() => setSource("csv")}>📂 Paste CSV</button>
          </div>
        </div>

        {source === "google_maps" ? (
          <div className="row" style={{ marginBottom: 14 }}>
            <input placeholder="industry (restaurant)" value={industry} onChange={(e) => setIndustry(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
            <input placeholder="city (Miami, FL)" value={city} onChange={(e) => setCity(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
            <input type="number" value={count} min={1} max={quota.leads.cap} onChange={(e) => setCount(Number(e.target.value))} style={{ width: 90 }} />
          </div>
        ) : (
          <textarea
            placeholder={"business_name,website_url,email,phone,city,rating\nMaison Noir,maisonnoir-sf.com,hello@maisonnoir-sf.com,(415) 555-1212,San Francisco,4.9"}
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            style={{ marginBottom: 14 }}
          />
        )}

        <div className="row" style={{ justifyContent: "space-between", fontSize: 13 }}>
          <span className="muted">
            <b style={{ color: "var(--ink)" }}>{counts.waiting}</b> waiting in current batch · {counts.older} from older scrapes · you can send up to <b style={{ color: "var(--ink)" }}>{quota.sendsDay.cap}</b>/day
          </span>
          <span className="faint">{sendCapPct}% of daily send cap</span>
        </div>
        <div className="meter" style={{ margin: "8px 0 16px" }}><span style={{ width: `${sendCapPct}%` }} /></div>

        <button
          disabled={busy !== null}
          onClick={async () => {
            await post("scrape", "/api/scrape", { service, source, industry, city, count, csv });
            router.refresh();
            loadDrafts("current");
          }}
        >
          {busy === "scrape" ? "Scraping…" : "▶ Continue — scrape another batch"}
        </button>
      </div>

      {/* ---------- STEP 02 ---------- */}
      <div className="panel">
        <div className="step-label">Step 02 · Compose &amp; review drafts</div>
        <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
          Compose pulls verified leads from the current batch and writes one email per recipient. Edit subject + body inline, or Skip rows you don&apos;t want to send.
        </p>

        <div className="row">
          <button
            disabled={busy !== null || counts.verifiedToCompose === 0}
            onClick={async () => {
              await post("compose", "/api/compose", { scope: "current" });
              loadDrafts("current");
              router.refresh();
            }}
          >
            {busy === "compose"
              ? "Composing…"
              : counts.verifiedToCompose > 0
              ? `▶ Compose for ${counts.verifiedToCompose} verified`
              : "✓ Current batch composed"}
          </button>
          {counts.unsentToCompose > counts.verifiedToCompose && (
            <button
              className="ghost"
              disabled={busy !== null}
              onClick={async () => {
                await post("compose-all", "/api/compose", { scope: "unsent" });
                loadDrafts("unsent");
                router.refresh();
              }}
            >
              {busy === "compose-all"
                ? "Composing…"
                : `▶ Compose all ${counts.unsentToCompose} unsent (incl. older scrapes)`}
            </button>
          )}
        </div>

        <div className="row" style={{ justifyContent: "space-between", margin: "18px 0 12px" }}>
          <span className="muted" style={{ fontSize: 13 }}>{readyCount} ready to send</span>
          <ScopeTabs scope={draftScope} onPick={loadDrafts} />
        </div>

        {drafts.length === 0 ? (
          <p className="faint" style={{ fontSize: 13 }}>No drafts yet. Run Step 2 to compose them.</p>
        ) : (
          drafts.map((d) => (
            <DraftCard key={d.prospect_id} draft={d} onChange={(nd) => setDrafts((prev) => prev.map((x) => (x.prospect_id === nd.prospect_id ? nd : x)))} />
          ))
        )}
      </div>

      {/* ---------- STEP 03 ---------- */}
      <div className="panel">
        <div className="step-label">Step 03 · Generate previews</div>
        <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
          Pre-generate previews (~$0.014 each) so recipients land on a fully-cached page instead of waiting ~30s.
        </p>
        <button
          disabled={busy !== null}
          onClick={async () => {
            await post("previews", "/api/previews/generate", { scope: "current" });
            loadDrafts(draftScope);
            router.refresh();
          }}
        >
          {busy === "previews" ? "Generating…" : `✨ Pre-generate ${counts.previewsNeeded} previews`}
        </button>

        <div className="row" style={{ justifyContent: "space-between", margin: "18px 0 10px" }}>
          <span className="muted" style={{ fontSize: 13 }}>Spot-check the generated pages</span>
          <ScopeTabs scope={draftScope} onPick={loadDrafts} />
        </div>
        {drafts.length === 0 ? (
          <p className="faint" style={{ fontSize: 13 }}>No drafts yet — compose in Step 2 first.</p>
        ) : (
          drafts.map((d) => (
            <div
              key={d.prospect_id}
              className="row"
              style={{ justifyContent: "space-between", padding: "9px 2px", borderBottom: "1px solid var(--border)" }}
            >
              <span style={{ fontSize: 13 }}>
                {d.business_name} <span className="faint">· {d.email}</span>
              </span>
              {d.has_preview && d.preview_slug ? (
                <a
                  className="link"
                  style={{ fontSize: 13 }}
                  href={d.preview_code ? `/p/${d.preview_code}/${d.preview_slug}` : `/p/${d.preview_slug}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Preview ↗
                </a>
              ) : (
                <span className="faint" style={{ fontSize: 12 }}>not generated yet</span>
              )}
            </div>
          ))
        )}
      </div>

      {/* ---------- STEP 04 ---------- */}
      <div className="panel">
        <div className="step-label">Step 04 · Send via Resend</div>
        <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
          Click <b style={{ color: "var(--ink)" }}>Send for real</b> to fire the live send. You&apos;ll see a confirmation prompt before any email leaves.
        </p>

        <div className="row" style={{ marginBottom: 12 }}>
          <span className="muted" style={{ width: 60 }}>Scope:</span>
          <div className="toggle">
            <button className={sendScope === "current" ? "on" : ""} onClick={() => setSendScope("current")}>Current batch ({counts.waiting})</button>
            <button className={sendScope === "all_ready" ? "on" : ""} onClick={() => setSendScope("all_ready")}>All ready ({counts.ready})</button>
          </div>
        </div>
        <div className="row" style={{ marginBottom: 14 }}>
          <span className="muted" style={{ width: 110 }}>How many (cap)</span>
          <input type="number" value={sendCap} min={1} max={quota.sendsDay.remaining} onChange={(e) => setSendCap(Number(e.target.value))} style={{ width: 90 }} />
          <span className="faint" style={{ fontSize: 13 }}>of {readyCount} ready · {quota.sendsDay.cap}/day cap</span>
        </div>

        <button
          style={{ background: "rgba(248,113,113,0.15)", borderColor: "rgba(248,113,113,0.4)", color: "#fca5a5" }}
          disabled={busy !== null}
          onClick={async () => {
            const n = Math.min(sendCap, sendScope === "current" ? counts.waiting : counts.ready);
            if (!confirm(`Send ${n} real email${n === 1 ? "" : "s"} now? This cannot be undone.`)) return;
            const data = await post("send", "/api/send", { scope: sendScope, cap: sendCap, confirm: true });
            if (data?.ok) alert(`Sent ${data.sent} email(s).`);
            router.refresh();
          }}
        >
          {busy === "send" ? "Sending…" : "🚀 Send for real …"}
        </button>
      </div>

      {/* ---------- CAMPAIGNS ---------- */}
      <div className="step-label" style={{ marginTop: 30 }}>Your campaigns</div>
      <div className="panel" style={{ padding: 6 }}>
        <table>
          <thead>
            <tr>
              <th>When</th><th>Industry · City</th><th>Scraped</th><th>Verified</th><th>Sent</th><th>Delivered</th><th>Opens</th><th>Clicks</th><th>Bounced</th>
            </tr>
          </thead>
          <tbody>
            {batches.length === 0 ? (
              <tr><td colSpan={9} className="faint">No campaigns yet — scrape a batch above.</td></tr>
            ) : (
              batches.map((b, i) => (
                <tr key={b.id ?? `legacy-${i}`}>
                  <td className="muted">{b.when ? new Date(b.when + "Z").toLocaleString() : "—"}</td>
                  <td>{b.industry ?? "—"}{b.city ? ` · ${b.city}` : ""}</td>
                  <td>{b.scraped}</td>
                  <td>{b.verified}</td>
                  <td>{b.sent || "—"}</td>
                  <td>{b.delivered || "—"}</td>
                  <td>{b.opened || "—"}</td>
                  <td>{b.clicked || "—"}</td>
                  <td>{b.bounced || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ScopeTabs({ scope, onPick }: { scope: Scope; onPick: (s: Scope) => void }) {
  const tabs: { k: Scope; l: string }[] = [
    { k: "current", l: "Current batch" },
    { k: "unsent", l: "All unsent" },
    { k: "sent", l: "Sent (catch-up)" },
  ];
  return (
    <div className="toggle" style={{ fontSize: 13 }}>
      {tabs.map((t) => (
        <button key={t.k} className={scope === t.k ? "on" : ""} style={{ padding: "5px 10px" }} onClick={() => onPick(t.k)}>
          {t.l}
        </button>
      ))}
    </div>
  );
}

function DraftCard({ draft, onChange }: { draft: DraftRow; onChange: (d: DraftRow) => void }) {
  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(draft.body);

  async function patch(payload: object) {
    await fetch("/api/drafts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prospectId: draft.prospect_id, ...payload }),
    });
  }

  return (
    <div className={`draft ${draft.state === "skipped" ? "skipped" : ""}`}>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontWeight: 600 }}>{draft.business_name} <span className="faint" style={{ fontWeight: 400 }}>· {draft.email}</span></span>
        <span className="row" style={{ gap: 6 }}>
          <span className={`pill ${draft.email_status}`}>{draft.email_status}</span>
          <span className={`pill ${draft.state}`}>{draft.state}</span>
        </span>
      </div>
      <input className="subj" value={subject} onChange={(e) => setSubject(e.target.value)} onBlur={() => patch({ subject })} />
      <textarea className="body" value={body} onChange={(e) => setBody(e.target.value)} onBlur={() => patch({ body })} />
      <p className="faint" style={{ fontSize: 11, margin: "4px 0 0" }}>
        <code>{"{{PREVIEW_LINK}}"}</code> renders as a button (their domain → their preview page) when the email is sent — move it anywhere in the body.
      </p>
      <div className="row" style={{ marginTop: 8, justifyContent: "space-between" }}>
        {draft.state === "skipped" ? (
          <button className="subtle" style={{ padding: "5px 12px", fontSize: 13 }} onClick={async () => { await patch({ state: "ready" }); onChange({ ...draft, state: "ready" }); }}>Un-skip</button>
        ) : (
          <button className="ghost" style={{ padding: "5px 12px", fontSize: 13 }} onClick={async () => { await patch({ state: "skipped" }); onChange({ ...draft, state: "skipped" }); }}>Skip</button>
        )}
        {draft.has_preview && draft.preview_slug ? (
          <a
            className="link"
            style={{ fontSize: 13 }}
            href={draft.preview_code ? `/p/${draft.preview_code}/${draft.preview_slug}` : `/p/${draft.preview_slug}`}
            target="_blank"
            rel="noreferrer"
          >
            Preview ↗
          </a>
        ) : (
          <span className="faint" style={{ fontSize: 12 }}>no preview yet — run Step 3</span>
        )}
      </div>
    </div>
  );
}
