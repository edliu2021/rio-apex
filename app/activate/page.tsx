"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../Header";

export default function Activate() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    setBusy(false);
    if (res.ok) router.push("/app");
    else setError("That code didn't work.");
  }

  return (
    <>
      <Header />
      <div className="center" style={{ paddingTop: 60 }}>
        <form className="panel card-narrow" onSubmit={submit}>
          <h1>Activate Rio Apex</h1>
          <p className="muted" style={{ marginTop: 0 }}>
            Paste your access code to open the dashboard.
          </p>
          <input
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Access code"
            style={{ width: "100%", margin: "12px 0" }}
          />
          {error && <p style={{ color: "var(--red)", marginTop: 0 }}>{error}</p>}
          <button type="submit" disabled={busy || !code} style={{ width: "100%" }}>
            {busy ? "Checking…" : "Activate"}
          </button>

          <div style={{ marginTop: 24, textAlign: "center" }}>
            <p className="muted" style={{ marginBottom: 8, fontSize: 13 }}>
              Don&apos;t have a code yet?
            </p>
            <a
              href="/app"
              style={{
                display: "inline-block",
                fontSize: 14,
                fontWeight: 600,
                color: "#d4a661",
                textDecoration: "none",
              }}
            >
              Get one — $99/mo &rarr;
            </a>
            <br />
            <a
              href="mailto:hello@rioapex.com"
              className="muted"
              style={{ fontSize: 13, marginTop: 6, display: "inline-block" }}
            >
              questions?
            </a>
          </div>
        </form>
      </div>
    </>
  );
}
