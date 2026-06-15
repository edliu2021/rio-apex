"use client";

import { useState } from "react";

// ── Walkthrough videos ────────────────────────────────────────────────
// Record your OWN walkthrough screen captures and paste the Loom (or any
// embed) IDs here. Do NOT reuse another product's recording — these should
// be your own videos. Until set, each tab shows a "record & paste" placeholder.
const WEB_LOOM_ID = ""; // <-- paste your Web-redesign walkthrough Loom ID
const IG_LOOM_ID = ""; // <-- paste your IG-posting walkthrough Loom ID

type Tab = "web" | "ig";

export default function VideoWalkthrough() {
  const [tab, setTab] = useState<Tab>("web");
  const loomId = tab === "web" ? WEB_LOOM_ID : IG_LOOM_ID;

  return (
    <div>
      {/* service toggle */}
      <div className="mb-6 inline-flex gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1">
        <button
          onClick={() => setTab("web")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            tab === "web" ? "bg-white text-[#08080a]" : "text-[#a3a3a3] hover:text-white"
          }`}
        >
          🖥️ Web redesign
        </button>
        <button
          onClick={() => setTab("ig")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            tab === "ig" ? "bg-white text-[#08080a]" : "text-[#a3a3a3] hover:text-white"
          }`}
        >
          📸 IG posting
        </button>
      </div>

      <div
        className="relative mx-auto overflow-hidden rounded-2xl"
        style={{ boxShadow: "0 0 80px rgba(109,40,217,0.25)" }}
      >
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          {loomId ? (
            <iframe
              key={loomId}
              src={`https://www.loom.com/embed/${loomId}`}
              allowFullScreen
              className="absolute inset-0 h-full w-full border-0"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/[0.02] px-6 text-center">
              <span className="text-3xl">{tab === "web" ? "🖥️" : "📸"}</span>
              <p className="text-lg font-semibold text-white">
                {tab === "web" ? "Web-redesign walkthrough" : "IG-posting walkthrough"}
              </p>
              <p className="max-w-md text-sm text-[#a3a3a3]">
                Record your own 60–90s Loom of the{" "}
                {tab === "web"
                  ? "web flow (scrape → compose → the redesign preview)"
                  : "IG flow (pick IG posting → compose → the 9-tile grid)"}
                , then paste its Loom ID into{" "}
                <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-[#d4a661]">
                  {tab === "web" ? "WEB_LOOM_ID" : "IG_LOOM_ID"}
                </code>{" "}
                in{" "}
                <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-[#d4a661]">
                  app/VideoWalkthrough.tsx
                </code>
                .
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
