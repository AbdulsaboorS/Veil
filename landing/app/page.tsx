"use client";
import { useState } from "react";

/* ── Panel mockup ─────────────────────────────────────────────── */
function PanelMockup() {
  return (
    <div className="relative flex items-center justify-center">
      {/* Glow bloom behind panel */}
      <div
        className="absolute inset-0 -z-10 rounded-full"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(124,111,247,0.18) 0%, transparent 65%)",
          transform: "scale(1.4)",
        }}
      />

      {/* Panel window */}
      <div
        className="w-[300px] overflow-visible rounded-2xl border border-white/[0.07] bg-bg"
        style={{
          boxShadow:
            "0 32px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.03)",
        }}
      >
        {/* Browser chrome dots */}
        <div className="flex items-center gap-1.5 border-b border-white/5 bg-[#0A0A10] px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
          <span className="flex-1 text-center text-[10px] text-white/20">
            Side Panel
          </span>
        </div>

        {/* Extension header */}
        <div className="flex items-center justify-between border-b border-white/5 bg-surface/70 px-3 py-2.5 backdrop-blur-md">
          <div className="flex items-center gap-1">
            <img
              src="/veil-icon.svg"
              alt="Veil"
              width={24}
              height={24}
              className="rounded-[7px] border border-white/35 bg-white/10 p-[1px] shadow-[0_8px_20px_rgba(0,0,0,0.45)]"
            />
            <span className="font-brand text-sm font-semibold text-text-primary">
              Veil
            </span>
          </div>
          <div className="relative flex items-center gap-1.5 rounded-full border border-white/10 bg-elevated px-2.5 py-1 text-xs font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
            <span className="text-text-secondary">JJK · S1E4</span>

            {/* Annotation: Auto-detected (anchored to the episode pill) */}
            <div className="pointer-events-none absolute left-full top-1/2 ml-2 flex -translate-y-1/2 items-center gap-2 text-[11px] text-text-secondary">
              <span className="w-8 border-t border-dashed border-white/20" />
              <span>Auto-detected</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="space-y-2 p-3">
          <div className="relative flex w-full justify-end">
            <div className="max-w-[80%] rounded-2xl rounded-br-[4px] bg-accent px-3.5 py-2 text-[13px] leading-snug text-white">
              Who is Gojo Satoru?
            </div>

            {/* Annotation: You ask (anchored to the first user bubble) */}
            <div className="pointer-events-none absolute left-full top-1/2 ml-2 flex -translate-y-1/2 items-center gap-2 text-[11px] text-text-secondary">
              <span className="w-8 border-t border-dashed border-white/20" />
              <span>You ask</span>
            </div>
          </div>
          <div className="relative flex w-full justify-start">
            <div className="max-w-[90%] rounded-2xl rounded-bl-[4px] bg-elevated px-3.5 py-2 text-[13px] leading-relaxed text-text-primary">
              Gojo is the strongest jujutsu sorcerer alive — a teacher at Jujutsu
              High known for his Six Eyes and Limitless technique. 💜
            </div>

            {/* Annotation: Safe answer (anchored to the assistant response bubble) */}
            <div className="pointer-events-none absolute left-full top-1/2 ml-2 flex -translate-y-1/2 items-center gap-2 text-[11px] text-text-secondary">
              <span className="w-8 border-t border-dashed border-white/20" />
              <span>Safe answer</span>
            </div>
          </div>
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-2xl rounded-br-[4px] bg-accent px-3.5 py-2 text-[13px] leading-snug text-white">
              Does Yuji die?
            </div>
          </div>
          <div className="relative flex w-full justify-start">
            <div className="max-w-[90%] rounded-2xl rounded-bl-[4px] bg-elevated px-3.5 py-2 text-[13px] leading-relaxed text-text-primary">
              Hmm, I&apos;d rather not say — you&apos;ll enjoy finding that one
              out yourself 😄
            </div>

            {/* Annotation: Spoiler blocked (anchored to the refusal bubble) */}
            <div className="pointer-events-none absolute left-full top-1/2 ml-2 flex -translate-y-1/2 items-center gap-2 text-[11px] text-text-secondary">
              <span className="w-8 border-t border-dashed border-white/20" />
              <span>🛡️ Spoiler blocked</span>
            </div>
          </div>
        </div>

        {/* Status bar */}
        <div className="flex items-center gap-1.5 px-3 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-accent/60" />
          <span className="text-[11px] text-text-muted">Shielding up to S1 E4</span>
        </div>

        {/* Input */}
        <div className="px-3 pb-3">
          <div className="relative">
            <div className="w-full rounded-full border border-white/[0.08] bg-surface px-4 py-2 pr-10 text-[13px] text-text-muted">
              Ask about Jujutsu Kaisen…
            </div>
            <div className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-accent/40">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M6 10V2M2 6L6 2L10 6"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Nav ──────────────────────────────────────────────────────── */
function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 md:px-12"
      style={{ background: "rgba(13,13,20,0.8)", backdropFilter: "blur(12px)" }}>
      <div className="flex items-center gap-1">
        <img
          src="/veil-icon.svg"
          alt="Veil"
          width={30}
          height={30}
          className="rounded-[8px] border border-white/35 bg-white/10 p-[1px] shadow-[0_10px_24px_rgba(0,0,0,0.45)]"
        />
        <span className="font-brand text-sm font-semibold text-text-primary">
          Veil
        </span>
      </div>
      <div className="flex items-center gap-1.5 rounded-full border border-border px-4 py-1.5 text-xs text-text-muted">
        Coming to Chrome Web Store
      </div>
    </nav>
  );
}

/* ── Hero ─────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="relative flex min-h-screen items-center pt-20">
      {/* Dot grid background */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(rgba(124,111,247,0.07) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      {/* Radial violet bloom — right side */}
      <div
        className="pointer-events-none absolute right-0 top-0 -z-10 h-full w-1/2"
        style={{
          background:
            "radial-gradient(ellipse at 70% 40%, rgba(124,111,247,0.10) 0%, transparent 60%)",
        }}
      />

      <div className="mx-auto w-full max-w-6xl px-6 md:px-12">
        <div className="grid grid-cols-1 items-center gap-16 md:grid-cols-2">
          {/* Left: text */}
          <div className="flex flex-col gap-6">
            {/* Platform pill */}
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Chrome Extension · Side Panel
            </div>

            <h1 className="font-brand text-5xl font-bold leading-[1.08] tracking-tight text-text-primary md:text-6xl">
              Safe answers for every
              <br />
              <span className="text-accent">mid-episode question.</span>
              <br />
              Zero spoilers.
            </h1>

            <p className="max-w-md text-base leading-relaxed text-text-secondary">
              If you get confused while watching a show, Veil is here for you.
              No more fearing the search bar and staying confused mid-episode.
              No more going to Reddit or asking a friend a question that might spoil you.
              Just ask Veil. He is rooting for you to have the best possible viewing experience.
            </p>

            <div className="flex items-center gap-3">
              <button
                disabled
                className="flex cursor-not-allowed items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white opacity-60"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2v9M4 7l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Add to Chrome
              </button>
              <span className="text-xs text-text-muted">Coming soon</span>
            </div>
          </div>

          {/* Right: panel mockup */}
          <div className="flex justify-center md:justify-end">
            <PanelMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── How it works ─────────────────────────────────────────────── */
const steps = [
  {
    n: "01",
    title: "Open any show",
    body: "Navigate to Crunchyroll. Veil detects your show and episode automatically — no searching, no typing, no setup.",
    tag: "Auto-detected",
  },
  {
    n: "02",
    title: "Ask in plain English",
    body: "Who's that character? What just happened? What's this power? Type anything in the panel. No special commands, no format required.",
    tag: "Just ask",
  },
  {
    n: "03",
    title: "Get a safe answer",
    body: "Veil knows exactly where you are in the story. Ask about characters, powers, lore — he answers what's safe and refuses what isn't. Playfully. Never robotically.",
    tag: "Spoiler-proof",
  },
];

function HowItWorks() {
  return (
    <section className="border-t border-border/40 bg-surface py-24">
      <div className="mx-auto max-w-6xl px-6 md:px-12">
        <div className="mb-14 text-center">
          <p className="mb-3 font-brand text-xs font-semibold uppercase tracking-widest text-accent">
            How it works
          </p>
          <h2 className="font-brand text-4xl font-bold text-text-primary">
            Designed to disappear
          </h2>
          <p className="mt-3 text-base text-text-secondary">
            The less you think about it, the better it&apos;s working.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.n}
              className="relative overflow-hidden rounded-2xl border border-border/60 bg-bg p-6"
            >
              {/* Large muted step number */}
              <span className="font-brand pointer-events-none absolute right-4 top-2 select-none text-7xl font-bold text-text-muted/10">
                {step.n}
              </span>

              <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent">
                {step.tag}
              </div>

              <h3 className="font-brand mb-2 text-lg font-semibold text-text-primary">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-text-secondary">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Automation flow ──────────────────────────────────────────── */
const flow = [
  { label: "You open a show", you: true },
  { label: "Episode detected", you: false },
  { label: "Recap loaded", you: false },
  { label: "Shield armed", you: false },
  { label: "You ask", you: true },
  { label: "Safe answer", you: false },
];

function AutomationFlow() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-6xl px-6 md:px-12">
        <div className="mb-12 text-center">
          <p className="mb-3 font-brand text-xs font-semibold uppercase tracking-widest text-accent">
            The experience
          </p>
          <h2 className="font-brand text-4xl font-bold text-text-primary">
            Everything else is handled.
          </h2>
          <p className="mt-3 max-w-xl mx-auto text-base text-text-secondary">
            From the moment you open a show, Veil is already working.
            The only thing you need to worry about is getting your question answered.
          </p>
        </div>

        {/* Flow */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {flow.map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium ${
                  step.you
                    ? "border-border bg-surface text-text-primary"
                    : "border-accent/30 bg-accent/10 text-accent"
                }`}
              >
                {!step.you && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
                    auto
                  </span>
                )}
                {step.label}
              </div>
              {i < flow.length - 1 && (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-text-muted">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          ))}
        </div>

        {/* Callout */}
        <div className="mt-12 rounded-2xl border border-accent/15 bg-accent/5 p-8 text-center">
          <p className="font-brand text-xl font-semibold text-text-primary">
            Just ask. Veil&apos;s got the rest.
          </p>
          <p className="mt-2 text-sm text-text-secondary">
            No episode setup. No pasting recaps. No configuration.
            Open a show, open the panel, ask anything.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ── Platform icons ───────────────────────────────────────────── */
function CrunchyrollIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#F47521" />
      <circle cx="16" cy="16" r="10" fill="none" stroke="white" strokeWidth="2.5" />
      <circle cx="20" cy="12" r="3.5" fill="white" />
    </svg>
  );
}

function NetflixIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="0" y="0" width="32" height="32" rx="8" fill="#141414" />
      <path d="M9 6H12.3L20 22.2V26H16.7L9 9.8V6Z" fill="#B00610" />
      <path d="M19.7 6H23V26H19.7V6Z" fill="#E50914" />
      <path d="M9 6H12.3V26H9V6Z" fill="#E50914" />
      <path d="M12.3 6H15.6L23 22.2V26H19.7L12.3 9.8V6Z" fill="#7A020A" />
    </svg>
  );
}

/* ── Platforms ────────────────────────────────────────────────── */
const platforms = [
  {
    name: "Crunchyroll",
    status: "Live",
    live: true,
    tooltip: null,
    Icon: CrunchyrollIcon,
  },
  {
    name: "Netflix",
    status: "Coming soon",
    live: false,
    tooltip: "Netflix hides episode info inside the player overlay — we're building a reliable way to capture it.",
    Icon: NetflixIcon,
  },
  {
    name: "Pirate Sites",
    status: "Coming soon",
    live: false,
    tooltip: "We see you. 👀 Support is in the works — we'll keep it quiet. 🤫",
    Icon: () => <div className="flex h-8 w-8 items-center justify-center text-2xl">🤫</div>,
  },
];

function Platforms() {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <section className="border-t border-border/40 bg-surface py-20">
      <div className="mx-auto max-w-6xl px-6 md:px-12">
        <p className="mb-10 text-center font-brand text-xs font-semibold uppercase tracking-widest text-text-muted">
          Works where you watch
        </p>
        <div className="flex flex-wrap items-start justify-center gap-4">
          {platforms.map((p) => (
            <div
              key={p.name}
              className={`relative flex flex-col items-center gap-3 rounded-2xl border p-6 transition-all duration-200 ${
                p.live
                  ? "border-border/60 bg-bg"
                  : "border-border/30 bg-bg opacity-50 hover:opacity-80 cursor-default"
              }`}
              style={{ minWidth: 140 }}
              onMouseEnter={() => !p.live && setHovered(p.name)}
              onMouseLeave={() => setHovered(null)}
            >
              <p.Icon />
              <div className="text-center">
                <p className="font-brand text-sm font-semibold text-text-primary">
                  {p.name}
                </p>
                <p
                  className={`mt-1 text-xs font-medium ${
                    p.live ? "text-green-400" : "text-text-muted"
                  }`}
                >
                  {p.status}
                </p>
              </div>

              {/* Hover tooltip for coming-soon platforms */}
              {!p.live && hovered === p.name && p.tooltip && (
                <div className="absolute bottom-full left-1/2 mb-3 w-56 -translate-x-1/2 rounded-xl border border-border/60 bg-elevated p-3 text-xs leading-relaxed text-text-secondary shadow-xl">
                  {p.tooltip}
                  <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-elevated" />
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-text-muted">
          Hover the dimmed platforms to learn more.
        </p>
      </div>
    </section>
  );
}

/* ── Footer / CTA ─────────────────────────────────────────────── */
function Footer() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) setSubmitted(true);
  };

  return (
    <footer className="border-t border-border/40 py-24">
      <div className="mx-auto max-w-2xl px-6 text-center md:px-12">
        {/* Logo */}
        <img
          src="/veil-icon.svg"
          alt="Veil"
          width={64}
          height={64}
          className="mx-auto rounded-2xl border border-white/35 bg-white/10 p-1 shadow-[0_12px_30px_rgba(0,0,0,0.45)]"
        />

        <h2 className="font-brand mt-6 text-4xl font-bold text-text-primary">
          Be the first to know.
        </h2>
        <p className="mt-3 text-base text-text-secondary">
          Veil is coming to the Chrome Web Store soon.
          Drop your email and we&apos;ll let you know the moment it&apos;s ready.
        </p>

        {submitted ? (
          <div className="mt-8 flex items-center justify-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-6 py-3 text-sm font-medium text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            You&apos;re on the list — we&apos;ll be in touch!
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 flex gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="flex-1 rounded-full border border-border bg-surface px-5 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent/40"
            />
            <button
              type="submit"
              className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Notify me
            </button>
          </form>
        )}

        <p className="mt-16 text-xs text-text-muted">
          © 2026 Veil · Built for anime fans
        </p>
      </div>
    </footer>
  );
}

/* ── Page ─────────────────────────────────────────────────────── */
export default function Page() {
  return (
    <div className="min-h-screen bg-bg font-sans text-text-primary">
      <Nav />
      <Hero />
      <HowItWorks />
      <AutomationFlow />
      <Platforms />
      <Footer />
    </div>
  );
}
