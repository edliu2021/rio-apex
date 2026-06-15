import Header from "./Header";
import VideoWalkthrough from "./VideoWalkthrough";

export default function Home() {
  return (
    <>
      <Header />

      {/* Noise overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-40 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
        }}
      />

      <main className="bg-[#08080a] text-white">
        {/* ─── HERO ─── */}
        <section className="relative mx-auto max-w-4xl px-6 pb-20 pt-32 text-center">
          <span className="mb-6 inline-block rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs tracking-wide text-[#a3a3a3]">
            For designers &amp; lead-gen operators
          </span>

          <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Other tools send emails.{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, #d4a661 0%, #b08d57 100%)",
              }}
            >
              We send demos.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#a3a3a3]">
            Rio Apex scrapes your niche, generates a personalized landing page
            preview for each prospect, and sends the cold email — so when they
            click, they see what their own site could look like.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="/app"
              className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-[#08080a] transition hover:bg-white/90 no-underline"
            >
              Try it — $99/mo&nbsp;&rarr;
            </a>
            <a
              href="/app"
              className="rounded-lg border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08] no-underline"
            >
              Launch app&nbsp;&rarr;
            </a>
          </div>

          <p className="mt-4 text-xs text-[#a3a3a3]">
            Use code{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[#d4a661]">
              EARLY30
            </code>{" "}
            for 30% off forever — first 14 founders only.
          </p>
        </section>

        {/* ─── METRICS ─── */}
        <section className="mx-auto max-w-4xl px-6 py-16">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {[
              { value: "40–50%", label: "Open rate" },
              { value: "up to 100%", label: "Peak click rate (real client batch)" },
              { value: "0", label: "Fabricated emails — Bouncer verified" },
              { value: "< 30s", label: "Per AI-rendered page" },
            ].map((m) => (
              <div key={m.label} className="text-center">
                <div
                  className="text-3xl font-bold sm:text-4xl"
                  style={{
                    background:
                      "linear-gradient(135deg, #d4a661 0%, #b08d57 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {m.value}
                </div>
                <div className="mt-1 text-xs text-[#a3a3a3]">{m.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── VIDEO ─── */}
        <section className="mx-auto max-w-4xl px-6 py-16 text-center">
          <p className="mb-1 text-xs tracking-widest text-[#a3a3a3] uppercase">
            90-second walkthrough
          </p>
          <h2 className="mb-8 text-3xl font-bold">Watch one batch go out.</h2>
          <VideoWalkthrough />
        </section>

        {/* ─── HOW IT WORKS ─── */}
        <section id="how-it-works" className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="mb-12 text-center text-3xl font-bold">
            How it works
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Scrape your niche",
                desc: "Google Maps → real businesses + websites + verified emails. No fabricated domains.",
              },
              {
                step: "02",
                title: "AI-generate landing pages",
                desc: "One personalized redesign concept per prospect. Their domain in the display link triggers the curiosity click.",
              },
              {
                step: "03",
                title: "Send + track",
                desc: "Cold email through your own sender. Resend webhook updates open / click / reply per recipient — visible per-customer in your dashboard.",
              },
            ].map((c) => (
              <div
                key={c.step}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8"
              >
                <span
                  className="mb-4 inline-block text-xs font-bold tracking-widest"
                  style={{
                    background:
                      "linear-gradient(135deg, #a78bfa 0%, #6d28d9 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  STEP {c.step}
                </span>
                <h3 className="mb-2 text-xl font-semibold">{c.title}</h3>
                <p className="text-sm leading-relaxed text-[#a3a3a3]">
                  {c.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── PRODUCT DEMO ─── */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold">The 7-second magic moment.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-[#a3a3a3]">
              Your prospect sees their own domain inside a cold email. They click
              out of curiosity. They land on a redesign of their own site — with
              a button to take it live.
            </p>
          </div>

          <div className="grid items-start gap-8 lg:grid-cols-2">
            {/* Gmail mockup */}
            <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#111113] p-6">
              <div className="mb-4 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-[#f87171]" />
                <div className="h-2 w-2 rounded-full bg-[#fbbf24]" />
                <div className="h-2 w-2 rounded-full bg-[#4ade80]" />
                <span className="ml-2 text-xs text-[#a3a3a3]">Gmail</span>
              </div>
              <div className="mb-1 text-xs text-[#a3a3a3]">
                <strong className="text-white">Edison</strong>{" "}
                &lt;hello@rioapex.com&gt;
              </div>
              <div className="mb-4 text-sm font-medium">
                Made you a free homepage redesign — Maison Noir
              </div>
              <div className="text-sm leading-relaxed text-[#a3a3a3]">
                <p>
                  Hi 👋 I&apos;m Edison, a designer in Houston. Came across
                  Maison Noir on Google — 4.9★ + a NYT review — and felt the food
                  deserved a site that lived up to the room.
                </p>
                <p className="mt-3">
                  I put together a quick redesign concept — takes 10 seconds to
                  see:
                </p>
                <p className="mt-3">
                  <a
                    href="/samples/maison-noir-v2.html"
                    className="text-[#60a5fa] underline"
                  >
                    rioapex.com/p/&hellip;/your-business
                  </a>
                </p>
              </div>
            </div>

            {/* Preview iframe */}
            <div className="overflow-hidden rounded-2xl border border-white/[0.06]">
              <iframe
                src="/samples/maison-noir-v2.html"
                className="h-[500px] w-full border-0"
                title="Preview — Maison Noir"
              />
            </div>
          </div>
        </section>

        {/* ─── PRICING ─── */}
        <section id="pricing" className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="mb-12 text-center text-3xl font-bold">Pricing</h2>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Solo */}
            <div className="flex flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
              <h3 className="text-xl font-semibold">Solo</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold">$99</span>
                <span className="text-[#a3a3a3]">/mo</span>
              </div>
              <p className="mt-2 text-sm text-[#a3a3a3]">
                Validate your first 100 prospects.
              </p>
              <ul className="mt-6 flex-1 space-y-3 text-sm">
                {[
                  "500 emails / month",
                  "500 AI-rendered previews / month",
                  "100 leads / day · 30 sends / day",
                  "Shared sender (@rioapex.com)",
                  "Reply-To your inbox",
                  "Open / click / reply tracking",
                ].map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-[#4ade80]">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href="/app"
                className="mt-8 block rounded-lg bg-white px-6 py-3 text-center text-sm font-semibold text-[#08080a] transition hover:bg-white/90 no-underline"
              >
                Start — $99/mo&nbsp;&rarr;
              </a>
              <p className="mt-2 text-center text-xs text-[#a3a3a3]">
                Apply <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-[#d4a661]">EARLY30</code> at checkout
              </p>
            </div>

            {/* Pro */}
            <div className="relative flex flex-col rounded-2xl border-2 border-[#6d28d9] bg-white/[0.02] p-8">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#6d28d9] px-3 py-0.5 text-xs font-semibold text-white">
                Most popular
              </span>
              <h3 className="text-xl font-semibold">Pro</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold">$399</span>
                <span className="text-[#a3a3a3]">/mo</span>
              </div>
              <p className="mt-2 text-sm text-[#a3a3a3]">
                Full-time freelancers running 2k+ touches.
              </p>
              <ul className="mt-6 flex-1 space-y-3 text-sm">
                {[
                  "2,500 emails / month",
                  "2,500 AI previews + IG mockups / month",
                  "500 leads / day · 150 sends / day",
                  "Custom Reply-To domain",
                  "Priority Bouncer verification",
                  "CSV import + Google Maps scraping",
                ].map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-[#4ade80]">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href="/api/checkout/pro"
                className="mt-8 block rounded-lg bg-[#6d28d9] px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#5b21b6] no-underline"
              >
                Start — $399/mo&nbsp;&rarr;
              </a>
            </div>

            {/* Agency */}
            <div className="flex flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
              <h3 className="text-xl font-semibold">Agency</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold">$799</span>
                <span className="text-[#a3a3a3]">/mo</span>
              </div>
              <p className="mt-2 text-sm text-[#a3a3a3]">
                Multi-seat shops &amp; white-label resellers.
              </p>
              <ul className="mt-6 flex-1 space-y-3 text-sm">
                {[
                  "10,000 emails / month",
                  "10,000 AI artifacts / month",
                  "1,500 leads / day · 500 sends / day",
                  "Bring your own domain (custom From)",
                  "White-label sender + signature",
                  "Priority support · roadmap input",
                ].map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-[#4ade80]">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href="mailto:hello@rioapex.com"
                className="mt-8 block rounded-lg border border-white/10 bg-white/[0.04] px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/[0.08] no-underline"
              >
                Book a call&nbsp;&rarr;
              </a>
            </div>
          </div>

          <p className="mt-8 text-center text-xs text-[#a3a3a3]">
            All tiers month-to-month · cancel anytime · prices in USD ·{" "}
            <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-[#d4a661]">
              EARLY30
            </code>{" "}
            for 30% off forever on Solo (first 14 founders).
          </p>
        </section>

        {/* ─── FAQ ─── */}
        <section id="faq" className="mx-auto max-w-3xl px-6 py-20">
          <h2 className="mb-12 text-center text-3xl font-bold">FAQ</h2>
          <div className="space-y-4">
            {[
              {
                q: "Will my prospects know it's AI?",
                a: "The redesign is a working HTML page that anyone could build by hand — there's nothing 'AI-looking' about it. The copy is personalized to their business, rating, and city. We also never send to fabricated emails (every address is run through Bouncer first).",
              },
              {
                q: "Do I need my own email domain?",
                a: "No. Solo uses the shared @rioapex.com sender with replies forwarded to your inbox. Pro lets you set a custom Reply-To; Agency lets you bring your own domain so the From: address is yours.",
              },
              {
                q: "What happens if a prospect clicks the preview link?",
                a: "They land on a personalized page rendered just for them (their domain in the URL display, their business in the headline). There's a one-click 'Activate' button at the top that lets them pay you directly — no sales call required.",
              },
            ].map((item) => (
              <details
                key={item.q}
                className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-5"
              >
                <summary className="flex cursor-pointer items-center justify-between text-base font-medium [&::-webkit-details-marker]:hidden list-none">
                  {item.q}
                  <span className="ml-4 text-xl text-[#a3a3a3] transition-transform duration-200 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-4 text-sm leading-relaxed text-[#a3a3a3]">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* ─── FINAL CTA ─── */}
        <section className="relative mx-auto max-w-4xl px-6 py-24 text-center">
          <div
            className="pointer-events-none absolute inset-0 -z-10 rounded-3xl"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(109,40,217,0.15) 0%, transparent 70%)",
            }}
          />
          <h2 className="text-3xl font-bold sm:text-4xl">
            Stop sending emails.{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, #d4a661 0%, #b08d57 100%)",
              }}
            >
              Start sending demos.
            </span>
          </h2>
          <p className="mt-4 text-[#a3a3a3]">
            Activate in 60 seconds. First batch out tonight.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="/app"
              className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-[#08080a] transition hover:bg-white/90 no-underline"
            >
              Start — $99/mo&nbsp;&rarr;
            </a>
            <a
              href="#pricing"
              className="rounded-lg border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08] no-underline"
            >
              Compare plans
            </a>
          </div>
        </section>

        {/* ─── FOOTER ─── */}
        <footer className="border-t border-white/[0.06] bg-[#08080a]">
          <div className="mx-auto grid max-w-5xl gap-12 px-6 py-16 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <span
                className="text-lg font-bold"
                style={{
                  background:
                    "linear-gradient(135deg, #a78bfa 0%, #6d28d9 50%, #d4a661 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Rio Apex
              </span>
              <p className="mt-3 text-sm text-[#a3a3a3]">
                Demos that close. Built in Houston for the next 1,000
                one-person shops.
              </p>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#a3a3a3]">
                Product
              </h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#pricing" className="text-[#a3a3a3] transition hover:text-white no-underline">Pricing</a></li>
                <li><a href="#faq" className="text-[#a3a3a3] transition hover:text-white no-underline">FAQ</a></li>
                <li><a href="/activate" className="text-[#a3a3a3] transition hover:text-white no-underline">Activate code</a></li>
                <li><a href="/app" className="text-[#a3a3a3] transition hover:text-white no-underline">Launch app</a></li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#a3a3a3]">
                Company
              </h4>
              <ul className="space-y-2 text-sm">
                <li><a href="mailto:hello@rioapex.com" className="text-[#a3a3a3] transition hover:text-white no-underline">Contact</a></li>
                <li><a href="/app" className="text-[#a3a3a3] transition hover:text-white no-underline">Buy Solo</a></li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#a3a3a3]">
                Legal
              </h4>
              <p className="text-sm text-[#a3a3a3]">
                Rio Crest LLC<br />
                17350 State Hwy 249, Ste 220 #33750<br />
                Houston, TX 77064
              </p>
            </div>
          </div>

          <div className="border-t border-white/[0.06] py-6 text-center text-xs text-[#a3a3a3]">
            &copy; 2026 Rio Crest LLC &nbsp;·&nbsp;{" "}
            <a href="mailto:hello@rioapex.com" className="text-[#a3a3a3] hover:text-white no-underline">
              hello@rioapex.com
            </a>
          </div>
        </footer>
      </main>
    </>
  );
}
