"use client";
import { useState } from "react";

/* ── Veil logo ────────────────────────────────────────────────── */
function ShieldLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="vlbg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1E1C2E" />
          <stop offset="100%" stopColor="#0F0E1A" />
        </linearGradient>
        <radialGradient id="vlglow" cx="50%" cy="52%" r="40%">
          <stop offset="0%" stopColor="#7C6FF7" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#7C6FF7" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="vlp1" x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="#E2DCFF" />
          <stop offset="55%" stopColor="#9580FF" />
          <stop offset="100%" stopColor="#5B4FCF" />
        </linearGradient>
        <linearGradient id="vlp2" x1="0" y1="0.3" x2="1" y2="0.7">
          <stop offset="0%" stopColor="#C4B5FD" />
          <stop offset="55%" stopColor="#7C6FF7" />
          <stop offset="100%" stopColor="#4C42B8" />
        </linearGradient>
        <linearGradient id="vlp3" x1="0.7" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#A78BFA" />
          <stop offset="55%" stopColor="#6D5FE8" />
          <stop offset="100%" stopColor="#3D35A0" />
        </linearGradient>
      </defs>

      {/* Background rounded square */}
      <rect width="100" height="100" rx="22" fill="url(#vlbg)" />
      {/* Soft center glow */}
      <rect width="100" height="100" rx="22" fill="url(#vlglow)" />

      {/* Fabric petal 1 — points upper-right */}
      <path
        d="M 50 52 C 72 42, 78 18, 58 13 C 38 8, 28 28, 50 52 Z"
        fill="url(#vlp1)"
        opacity="0.95"
      />
      {/* Fabric petal 2 — rotated 120° */}
      <path
        d="M 50 52 C 72 42, 78 18, 58 13 C 38 8, 28 28, 50 52 Z"
        fill="url(#vlp2)"
        opacity="0.82"
        transform="rotate(120 50 52)"
      />
      {/* Fabric petal 3 — rotated 240° */}
      <path
        d="M 50 52 C 72 42, 78 18, 58 13 C 38 8, 28 28, 50 52 Z"
        fill="url(#vlp3)"
        opacity="0.70"
        transform="rotate(240 50 52)"
      />

      {/* Center highlight */}
      <circle cx="50" cy="52" r="4" fill="rgba(226,220,255,0.45)" />
    </svg>
  );
}

/* ── Platform logos ───────────────────────────────────────────── */
function CrunchyrollLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <circle cx="18" cy="18" r="18" fill="#F47521" />
      {/* Outer ring */}
      <circle cx="18" cy="18" r="11.5" fill="none" stroke="white" strokeWidth="2.8" />
      {/* Inner fill */}
      <circle cx="18" cy="18" r="6.5" fill="white" />
      {/* Center dot */}
      <circle cx="18" cy="18" r="3" fill="#F47521" />
      {/* Notch cut — right side, simulating the CR open ring */}
      <rect x="27" y="15.5" width="5" height="5" fill="#F47521" />
    </svg>
  );
}

function NetflixLogo({ size = 36 }: { size?: number }) {
  // Netflix "N" drawn as paths — no text element for reliability
  const s = size;
  const scale = s / 36;
  const w = 36 * scale;
  const h = 40 * scale;
  return (
    <svg width={w} height={h} viewBox="0 0 36 44" fill="none">
      <rect width="36" height="44" rx="5" fill="#141414" />
      {/* Left bar */}
      <rect x="6" y="6" width="7" height="32" fill="#E50914" />
      {/* Right bar */}
      <rect x="23" y="6" width="7" height="32" fill="#E50914" />
      {/* Diagonal — top-left to bottom-right */}
      <polygon points="6,6 13,6 30,38 23,38" fill="#E50914" />
    </svg>
  );
}

function PirateLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <circle cx="18" cy="18" r="18" fill="#1C1B2A" />
      {/* Skull */}
      <ellipse cx="18" cy="16" rx="8" ry="7" fill="#54516A" />
      {/* Eye sockets */}
      <circle cx="15" cy="15" r="2" fill="#0D0D14" />
      <circle cx="21" cy="15" r="2" fill="#0D0D14" />
      {/* Nose */}
      <ellipse cx="18" cy="18.5" rx="1.2" ry="1" fill="#0D0D14" />
      {/* Teeth */}
      <rect x="14.5" y="20.5" width="2" height="2.5" rx="0.5" fill="#0D0D14" />
      <rect x="17" y="20.5" width="2" height="2.5" rx="0.5" fill="#0D0D14" />
      <rect x="19.5" y="20.5" width="2" height="2.5" rx="0.5" fill="#0D0D14" />
      {/* Crossbones */}
      <line x1="7" y1="29" x2="29" y2="29" stroke="#54516A" strokeWidth="2" strokeLinecap="round" />
      <circle cx="7" cy="29" r="2" fill="#54516A" />
      <circle cx="29" cy="29" r="2" fill="#54516A" />
    </svg>
  );
}

/* ── Annotation helpers ───────────────────────────────────────── */
const DASH_STYLE = {
  background:
    "repeating-linear-gradient(to right, rgba(124,111,247,0.45) 0, rgba(124,111,247,0.45) 4px, transparent 4px, transparent 9px)",
} as const;

function AnnotationLeft({ top, label }: { top: number; label: string }) {
  return (
    <div
      className="pointer-events-none absolute hidden md:flex items-center"
      style={{ top, left: 0, right: "calc(50% + 150px)" }}
    >
      <span className="flex-1 text-right text-[11px] font-medium text-text-secondary pr-2.5 whitespace-nowrap">
        {label}
      </span>
      <div className="h-px w-7 shrink-0" style={DASH_STYLE} />
      <div className="h-1.5 w-1.5 rounded-full bg-accent/60 shrink-0" />
    </div>
  );
}

function AnnotationRight({
  top,
  label,
  accent = false,
}: {
  top: number;
  label: string;
  accent?: boolean;
}) {
  return (
    <div
      className="pointer-events-none absolute hidden md:flex items-center"
      style={{ top, left: "calc(50% + 150px)", right: 0 }}
    >
      <div className="h-1.5 w-1.5 rounded-full bg-accent/60 shrink-0" />
      <div className="h-px w-7 shrink-0" style={DASH_STYLE} />
      <span
        className={`flex-1 text-left text-[11px] font-medium pl-2.5 whitespace-nowrap ${
          accent ? "text-accent" : "text-text-secondary"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

/* ── Panel mockup ─────────────────────────────────────────────── */
function PanelMockup() {
  return (
    // Wider container on desktop to leave room for annotations
    <div className="relative mx-auto w-[300px] md:w-[560px]">
      {/* Glow */}
      <div
        className="absolute inset-0 -z-10 rounded-full"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(124,111,247,0.18) 0%, transparent 65%)",
          transform: "scale(1.4)",
        }}
      />

      {/* Annotations — each `top` value is hand-tuned to align with panel rows */}
      {/* Left: points at the episode badge in the header */}
      <AnnotationLeft top={46} label="Auto-detected" />
      {/* Right: points at the second user message */}
      <AnnotationRight top={194} label="You ask" />
      {/* Right: points at the last AI response */}
      <AnnotationRight top={246} label="Safe answer" accent />
      {/* Right: points at the status bar */}
      <AnnotationRight top={298} label="🛡️ Spoiler blocked" accent />

      {/* Panel window */}
      <div
        className="mx-auto w-[300px] overflow-hidden rounded-2xl border border-white/[0.07] bg-bg"
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
          <span className="flex-1 text-center text-[10px] text-white/20">Side Panel</span>
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
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 md:px-12"
      style={{ background: "rgba(13,13,20,0.8)", backdropFilter: "blur(12px)" }}
    >
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
      {/* Dot grid */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(rgba(124,111,247,0.07) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      {/* Violet bloom */}
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
              AI answers for
              <br />
              every question
              <br />
              <span className="text-accent">you fear to Google.</span>
            </h1>

            <p className="max-w-md text-base leading-relaxed text-text-secondary">
              spoilershield lives in your browser&apos;s side panel. It detects your show and
              locks in your episode automatically — so when you ask about characters, plot, or
              powers, it answers from exactly where you are. Nothing ahead. Ever.
            </p>

            <div className="flex items-center gap-3">
              <button
                disabled
                className="flex cursor-not-allowed items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white opacity-60"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M8 2v9M4 7l4 4 4-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
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
    body: "Navigate to Crunchyroll. spoilershield detects your show and episode automatically — no searching, no typing, no setup.",
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
              <span className="font-brand pointer-events-none absolute right-4 top-2 select-none text-7xl font-bold text-text-muted/10">
                {step.n}
              </span>
              <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent">
                {step.tag}
              </div>
              <h3 className="font-brand mb-2 text-lg font-semibold text-text-primary">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-text-secondary">{step.body}</p>
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
            From the moment you open a show, spoilershield is already working. The only thing
            you need to worry about is getting your question answered.
          </p>
        </div>

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
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="shrink-0 text-text-muted"
                >
                  <path
                    d="M3 8h10M9 4l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-accent/15 bg-accent/5 p-8 text-center">
          <p className="font-brand text-xl font-semibold text-text-primary">
            The only thing you need to do is ask.
          </p>
          <p className="mt-2 text-sm text-text-secondary">
            No manual episode entry. No pasting recaps. No configuration. Open a show, open
            the panel, start asking.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ── Platforms ────────────────────────────────────────────────── */
type Platform = {
  name: string;
  status: "live" | "soon";
  tooltip?: string;
  logo: React.ReactNode;
  tag?: React.ReactNode;
};

function PlatformCard({ platform }: { platform: Platform }) {
  const isLive = platform.status === "live";

  return (
    <div className="group relative">
      <div
        className={`flex flex-col items-center gap-3 rounded-2xl border px-8 py-6 transition-colors ${
          isLive
            ? "border-border/60 bg-bg"
            : "border-border/30 bg-bg/50 opacity-60 hover:opacity-80"
        }`}
      >
        {/* Logo */}
        <div className="relative">
          {platform.logo}
          {platform.tag && (
            <div className="absolute -top-2 -right-3">{platform.tag}</div>
          )}
        </div>

        {/* Name + status */}
        <div className="flex flex-col items-center gap-1 text-center">
          <span
            className={`font-brand text-sm font-semibold ${
              isLive ? "text-text-primary" : "text-text-muted"
            }`}
          >
            {platform.name}
          </span>
          {isLive ? (
            <span className="flex items-center gap-1 text-[11px] text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Live
            </span>
          ) : (
            <span className="text-[11px] text-text-muted">Coming soon</span>
          )}
        </div>
      </div>

      {/* Hover tooltip — only for non-live platforms */}
      {!isLive && platform.tooltip && (
        <div
          className="pointer-events-none absolute -top-2 left-1/2 z-20 w-56 -translate-x-1/2 -translate-y-full rounded-xl border border-border/80 bg-elevated px-3.5 py-2.5 text-center text-xs leading-relaxed text-text-secondary opacity-0 shadow-xl transition-opacity duration-200 group-hover:opacity-100"
          style={{ backdropFilter: "blur(8px)" }}
        >
          {platform.tooltip}
          {/* Arrow */}
          <div className="absolute -bottom-[5px] left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-b border-r border-border/80 bg-elevated" />
        </div>
      )}
    </div>
  );
}

function Platforms() {
  const platforms: Platform[] = [
    {
      name: "Crunchyroll",
      status: "live",
      logo: <CrunchyrollLogo size={42} />,
    },
    {
      name: "Netflix",
      status: "soon",
      tooltip:
        "Netflix hides episode info inside the player overlay — we're building a reliable way to capture it.",
      logo: <NetflixLogo size={42} />,
    },
    {
      name: "Pirate Sites",
      status: "soon",
      tooltip: "We see you. 👀 Support is in the works — we'll keep it quiet. 🤫",
      logo: <PirateLogo size={42} />,
      tag: <span className="text-base leading-none">🤫</span>,
    },
  ];

  return (
    <section className="border-t border-border/40 bg-surface py-20">
      <div className="mx-auto max-w-6xl px-6 md:px-12">
        <p className="mb-10 text-center font-brand text-xs font-semibold uppercase tracking-widest text-text-muted">
          Works where you watch
        </p>

        <div className="flex flex-wrap items-start justify-center gap-4">
          {platforms.map((p) => (
            <PlatformCard key={p.name} platform={p} />
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-text-muted">
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
        <ShieldLogo size={40} />

        <h2 className="font-brand mt-6 text-4xl font-bold text-text-primary">
          Be the first to know.
        </h2>
        <p className="mt-3 text-base text-text-secondary">
          spoilershield is coming to the Chrome Web Store. Drop your email and we&apos;ll
          notify you the moment it&apos;s live.
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
