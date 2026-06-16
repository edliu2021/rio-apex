import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { getSetting } from "@/lib/db";
import { snapshot } from "@/lib/quota";
import { funnel, pct } from "@/lib/stats";
import AppNav from "../AppNav";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  if (!isAuthed()) redirect("/activate");

  const f = funnel();
  const quota = snapshot();
  const email = getSetting("REPLY_EMAIL") || getSetting("REPLY_TO") || undefined;

  const bounceRate = pct(f.bounced, f.sent);
  const openRate = pct(f.opened, f.delivered);
  // Clicks are tracked by our own preview-page hits, so base click rate on
  // sends (not opens — opens only arrive via the Resend webhook, which may
  // not be wired yet, and clicked/0-opens is a meaningless divide-by-zero).
  const clickRate = pct(f.clicked, f.sent);
  const replyRate = pct(f.replied, f.delivered);

  const steps = [
    { label: "Scraped", n: f.scraped, pctOfPrev: null as number | null },
    { label: "Verified OK", n: f.verified, pctOfPrev: pct(f.verified, f.scraped) },
    { label: "Sent", n: f.sent, pctOfPrev: pct(f.sent, f.verified) },
    { label: "Delivered", n: f.delivered, pctOfPrev: pct(f.delivered, f.sent) },
    { label: "Opened", n: f.opened, pctOfPrev: pct(f.opened, f.delivered) },
    { label: "Clicked", n: f.clicked, pctOfPrev: pct(f.clicked, f.sent) },
  ];
  const max = Math.max(f.scraped, 1);

  return (
    <div className="container">
      <AppNav active="dashboard" quota={quota} email={email} />
      <h1>Your funnel</h1>
      <p className="muted" style={{ marginBottom: 22 }}>
        Updated live from Resend webhooks.{email ? <> Logged in as <span className="mono">{email}</span> · {quota.plan}</> : null}
      </p>

      <div className="metric-grid" style={{ marginBottom: 14 }}>
        <Metric k="Scraped" v={f.scraped} s="businesses pulled from Google Maps" />
        <Metric k="Verified" v={f.verified} s={`${pct(f.verified, f.scraped)}% pass Bouncer`} />
        <Metric k="Sent" v={f.sent} s={`${f.drafts} drafts + ${f.ready} ready waiting`} />
        <Metric k="Delivered" v={f.delivered} s={`${pct(f.delivered, f.sent)}% reached inbox`} />
      </div>
      <div className="metric-grid">
        <Metric k="Bounce rate" v={`${bounceRate.toFixed(1)}%`} gold s={bounceRate < 2 ? "✅ healthy" : "⚠️ watch this"} />
        <Metric k="Open rate" v={`${openRate}%`} gold s={`${f.opened} / ${f.delivered} delivered`} />
        <Metric k="Click rate" v={`${clickRate}%`} gold s={`${f.clicked} / ${f.sent} sent`} />
        <Metric k="Reply rate" v={`${replyRate}%`} gold s="not tracked yet — Gmail/IMAP poll coming" />
      </div>

      <div className="step-label" style={{ marginTop: 30 }}>Conversion funnel</div>
      <div className="panel">
        {steps.map((s) => (
          <div key={s.label} className="funnel-row">
            <span className="muted">{s.label}</span>
            <div className="funnel-track">
              <div className="funnel-fill" style={{ width: `${Math.max(4, (s.n / max) * 100)}%` }}>{s.n}</div>
            </div>
            <span className="funnel-pct">{s.pctOfPrev === null ? "" : `${s.pctOfPrev}%`}</span>
          </div>
        ))}
      </div>

      <div className="step-label" style={{ marginTop: 26 }}>What you&apos;re looking at</div>
      <div className="panel">
        <ul className="muted" style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.8 }}>
          <li><b style={{ color: "var(--ink)" }}>Scraped → Verified OK</b> = how good your scrape niche is. Below 20% means try a different city or tighter industry term.</li>
          <li><b style={{ color: "var(--ink)" }}>Verified → Sent</b> = how often you flip drafts to READY and send. Below 80% means review is bottlenecking.</li>
          <li><b style={{ color: "var(--ink)" }}>Sent → Opened &gt; 30%</b> = subject is working. Below = rewrite the subject.</li>
          <li><b style={{ color: "var(--ink)" }}>Sent → Clicked &gt; 5%</b> = body + CTA is working. Below = preview link isn&apos;t earning the click. (Opens need the Resend webhook configured.)</li>
        </ul>
      </div>
    </div>
  );
}

function Metric({ k, v, s, gold }: { k: string; v: number | string; s: string; gold?: boolean }) {
  return (
    <div className="metric">
      <div className="k">{k}</div>
      <div className={`v ${gold ? "gold" : ""}`}>{v}</div>
      <div className="s">{s}</div>
    </div>
  );
}
