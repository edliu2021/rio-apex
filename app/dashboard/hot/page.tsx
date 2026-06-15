import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { getSetting } from "@/lib/db";
import { snapshot } from "@/lib/quota";
import { hotLeads, hotSummary } from "@/lib/stats";
import AppNav from "../../AppNav";

export const dynamic = "force-dynamic";

function previewHref(code: string | null, slug: string | null): string {
  if (!slug) return "#";
  return code ? `/p/${code}/${slug}` : `/p/${slug}`;
}

function ago(h: number | null): string {
  if (h === null) return "—";
  return `${h}h ago`;
}

export default function HotPage() {
  if (!isAuthed()) redirect("/activate");

  const leads = hotLeads();
  const sum = hotSummary();
  const quota = snapshot();
  const email = getSetting("REPLY_EMAIL") || getSetting("REPLY_TO") || undefined;

  return (
    <div className="container">
      <AppNav active="hot" quota={quota} email={email} />
      <div className="step-label">High-intent followup queue</div>
      <h1>Hot leads.</h1>
      <p className="muted" style={{ marginBottom: 22, maxWidth: 620 }}>
        Recipients who opened or clicked your email — the ~5–15% with real intent. A single contextual phone call here closes orders of magnitude better than another email blast.
      </p>

      <div className="metric-grid" style={{ marginBottom: 24 }}>
        <Metric k="Clicked" v={sum.clicked} gold />
        <Metric k="Opened" v={sum.opened} />
        <Metric k="With phone" v={`${sum.withPhone} / ${sum.total}`} s="phone column populated by scraper" />
        <Metric k="Total hot" v={sum.total} />
      </div>

      <div className="panel" style={{ padding: 6 }}>
        <table>
          <thead>
            <tr><th>Business</th><th>Signal</th><th>Phone</th><th>Sent</th><th style={{ textAlign: "right" }}>Actions</th></tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr><td colSpan={5} className="faint">No hot leads yet. They appear here once a recipient opens or clicks.</td></tr>
            ) : (
              leads.map((l) => (
                <tr key={l.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{l.business_name}</div>
                    <div className="faint" style={{ fontSize: 12 }}>
                      {l.email ?? "—"}
                      {l.website_url ? <> · <a className="link" href={l.website_url.startsWith("http") ? l.website_url : `https://${l.website_url}`} target="_blank" rel="noreferrer">site ↗</a></> : null}
                    </div>
                  </td>
                  <td><span className={`pill ${l.signal}`}>{l.signal}</span></td>
                  <td className="mono">{l.phone ? `📞 ${l.phone}` : "—"}</td>
                  <td className="muted">{ago(l.hoursAgo)}</td>
                  <td style={{ textAlign: "right" }}>
                    <a className="link" href={previewHref(l.preview_code, l.preview_slug)} target="_blank" rel="noreferrer" style={{ marginRight: 12 }}>Preview ↗</a>
                    <a className="link" href={l.email ? `mailto:${l.email}` : "#"}>Reply ↗</a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="step-label" style={{ marginTop: 26 }}>Why call instead of email-again?</div>
      <div className="panel">
        <ul className="muted" style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.8 }}>
          <li>They already looked at your work — that&apos;s 90% of the cold-call objection gone.</li>
          <li>A 2-minute call with context (&quot;noticed you checked out the mockup — want a 5-min walkthrough?&quot;) closes 5–15× better than a second email.</li>
          <li>Best time to call: 10am–11am local or 2pm–4pm. Worst: lunch rush (12–1:30pm) and dinner service (5pm+).</li>
        </ul>
      </div>
    </div>
  );
}

function Metric({ k, v, s, gold }: { k: string; v: number | string; s?: string; gold?: boolean }) {
  return (
    <div className="metric">
      <div className="k">{k}</div>
      <div className={`v ${gold ? "gold" : ""}`}>{v}</div>
      {s ? <div className="s">{s}</div> : null}
    </div>
  );
}
