"use client";
import { useState } from "react";

/* ── Shared: Shield SVG logo ──────────────────────────────────── */
function ShieldLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7C6FF7" />
          <stop offset="100%" stopColor="#A78BFA" />
        </linearGradient>
      </defs>
      <path
        d="M12 2.5C10.5 2.5 5 4.5 5 4.5V11.5C5 16.5 8.2 20.4 12 22C15.8 20.4 19 16.5 19 11.5V4.5C19 4.5 13.5 2.5 12 2.5Z"
        fill="url(#sg)"
      />
      <path
        d="M12 8.5L12.65 10.85L15 11.5L12.65 12.15L12 14.5L11.35 12.15L9 11.5L11.35 10.85L12 8.5Z"
        fill="white"
        fillOpacity="0.9"
        className="animate-breathe"
        style={{ transformOrigin: "12px 11.5px" }}
      />
    </svg>
  );
}

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

      {/* Floating badge — top right */}
      <div className="animate-float absolute -top-4 -right-6 flex items-center gap-1.5 rounded-full border border-white/10 bg-elevated px-3 py-1.5 text-[11px] text-text-primary shadow-lg"
        style={{ animationDelay: "0.5s" }}>
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        Auto-detected
      </div>

      {/* Floating badge — bottom left */}
      <div className="animate-float absolute -bottom-3 -left-6 flex items-center gap-1.5 rounded-full border border-white/10 bg-elevated px-3 py-1.5 text-[11px] text-text-primary shadow-lg"
        style={{ animationDelay: "1.2s" }}>
        🛡️ Spoiler blocked
      </div>

      {/* Panel window */}
      <div
        className="w-[300px] overflow-hidden rounded-2xl border border-white/[0.07] bg-bg"
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
          <div className="flex items-center gap-2">
            <ShieldLogo size={20} />
            <span className="font-brand text-sm font-semibold text-text-primary">
              spoilershield
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-elevated px-2.5 py-1 text-xs font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
            <span className="text-text-secondary">JJK · S1E4</span>
          </div>
        </div>

        {/* Messages */}
        <div className="space-y-2 p-3">
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-2xl rounded-br-[4px] bg-accent px-3.5 py-2 text-[13px] leading-snug text-white">
              Who is Gojo Satoru?
            </div>
          </div>
          <div className="flex justify-start">
            <div className="max-w-[90%] rounded-2xl rounded-bl-[4px] bg-elevated px-3.5 py-2 text-[13px] leading-relaxed text-text-primary">
              Gojo is the strongest jujutsu sorcerer alive — a teacher at Jujutsu
              High known for his Six Eyes and Limitless technique. 💜
            </div>
          </div>
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-2xl rounded-br-[4px] bg-accent px-3.5 py-2 text-[13px] leading-snug text-white">
              Does Yuji die?
            </div>
          </div>
          <div className="flex justify-start">
            <div className="max-w-[90%] rounded-2xl rounded-bl-[4px] bg-elevated px-3.5 py-2 text-[13px] leading-relaxed text-text-primary">
              Hmm, I&apos;d rather not say — you&apos;ll enjoy finding that one
              out yourself 😄
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
      <div className="flex items-center gap-2">
        <ShieldLogo size={22} />
        <span className="font-brand text-sm font-semibold text-text-primary">
          spoilershield
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
              Crunchyroll &amp; Netflix
            </div>

            <h1 className="font-brand text-5xl font-bold leading-[1.08] tracking-tight text-text-primary md:text-6xl">
              Watch anime.
              <br />
              Ask anything.
              <br />
              <span className="text-accent">Zero spoilers.</span>
            </h1>

            <p className="max-w-md text-base leading-relaxed text-text-secondary">
              spoilershield lives in your browser&apos;s side panel. It detects your
              show, locks in your episode, and answers your questions — keeping
              everything ahead of you safely locked away.
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
    body: "Navigate to Crunchyroll or Netflix. spoilershield detects your show and episode automatically — no searching, no typing, no setup.",
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
    body: "The shield knows exactly where you are in the story. It answers what's safe and refuses what isn't — playfully, never robotically.",
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
            From the moment you open a show, spoilershield is already working.
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
            The only thing you need to do is ask.
          </p>
          <p className="mt-2 text-sm text-text-secondary">
            No manual episode entry. No pasting recaps. No configuration.
            Open a show, open the panel, start asking.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ── Platforms ────────────────────────────────────────────────── */
function Platforms() {
  return (
    <section className="border-t border-border/40 bg-surface py-20">
      <div className="mx-auto max-w-6xl px-6 md:px-12">
        <p className="mb-10 text-center font-brand text-xs font-semibold uppercase tracking-widest text-text-muted">
          Works where you watch
        </p>
        <div className="flex flex-wrap items-center justify-center gap-6">
          {["Crunchyroll", "Netflix"].map((p) => (
            <div
              key={p}
              className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-bg px-6 py-4"
            >
              <span className="h-2 w-2 rounded-full bg-accent/60" />
              <span className="font-brand text-base font-medium text-text-secondary">
                {p}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-border/40 px-6 py-4">
            <span className="text-sm text-text-muted">More coming</span>
          </div>
        </div>
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
        <ShieldLogo size={40} />

        <h2 className="font-brand mt-6 text-4xl font-bold text-text-primary">
          Be the first to know.
        </h2>
        <p className="mt-3 text-base text-text-secondary">
          spoilershield is coming to the Chrome Web Store. Drop your email and
          we&apos;ll notify you the moment it&apos;s live.
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
          © 2026 spoilershield · Built for anime fans
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
