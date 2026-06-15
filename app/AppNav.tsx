import Link from "next/link";
import type { QuotaSnapshot } from "@/lib/quota";

const TABS: { href: string; label: string; key: string }[] = [
  { href: "/app", label: "Actions", key: "actions" },
  { href: "/dashboard", label: "Dashboard", key: "dashboard" },
  { href: "/dashboard/hot", label: "🔥 Hot leads", key: "hot" },
  { href: "/settings", label: "Settings", key: "settings" },
];

export default function AppNav({
  active,
  quota,
  email,
}: {
  active: string;
  quota?: QuotaSnapshot;
  email?: string;
}) {
  return (
    <>
      <nav className="appnav">
        {TABS.map((t, i) => (
          <span key={t.key} style={{ display: "flex", gap: 14, alignItems: "center" }}>
            {i > 0 && <span className="sep">·</span>}
            <Link href={t.href} className={active === t.key ? "active" : ""}>
              {t.label}
            </Link>
          </span>
        ))}
      </nav>
      {quota && (
        <div className="usage-strip">
          <span>
            <span className="dot" />
            <b style={{ textTransform: "capitalize" }}>{quota.plan}</b>
          </span>
          {email && <span className="mono">{email}</span>}
          <span>
            Leads scraped today: <b>{quota.leads.used}</b> / {quota.leads.cap}
          </span>
          <span>
            Sends today: <b>{quota.sendsDay.used}</b> / {quota.sendsDay.cap}
          </span>
          <span>
            Sends this month: <b>{quota.sendsMonth.used}</b> / {quota.sendsMonth.cap}
          </span>
        </div>
      )}
    </>
  );
}
