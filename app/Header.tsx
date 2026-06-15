"use client";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#08080a]/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2 no-underline">
          <span
            className="text-xl font-bold"
            style={{
              background:
                "linear-gradient(135deg, #a78bfa 0%, #6d28d9 50%, #d4a661 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Rio Apex
          </span>
        </a>

        {/* Nav links — hidden on mobile */}
        <nav className="hidden items-center gap-8 text-sm text-[#a3a3a3] md:flex">
          <a href="/#how-it-works" className="transition hover:text-white no-underline">
            How it works
          </a>
          <a href="/#pricing" className="transition hover:text-white no-underline">
            Pricing
          </a>
          <a href="/#faq" className="transition hover:text-white no-underline">
            FAQ
          </a>
        </nav>

        {/* CTA — hidden on small screens */}
        <a
          href="/app"
          className="hidden rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#08080a] transition hover:bg-white/90 no-underline sm:inline-block"
        >
          Launch app&nbsp;&rarr;
        </a>
      </div>
    </header>
  );
}
