"use client";

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "monkeydveil41@gmail.com";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-bg font-sans text-text-primary">
      <div className="mx-auto max-w-3xl px-6 pb-24 pt-28 md:px-12">
        <h1 className="font-brand text-4xl font-bold tracking-tight md:text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-text-muted">Last updated: {new Date().toISOString().slice(0, 10)}</p>

        <section className="mt-10 space-y-6 text-base leading-relaxed text-text-secondary">
          <p>
            Veil is a Chrome extension that helps you ask questions while watching a show
            without getting spoiled. We keep data collection minimal.
          </p>

          <div className="rounded-2xl border border-border/60 bg-surface p-6">
            <h2 className="font-brand text-xl font-semibold text-text-primary">
              What we collect
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                <span className="text-text-primary">Local session data</span>: show title,
                episode progress, and chat history are stored in your browser (local storage)
                so your sessions persist.
              </li>
              <li>
                <span className="text-text-primary">Optional feedback</span>: if you submit
                feedback, we store the message text and basic context (e.g. show title,
                platform) to help improve Veil.
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-border/60 bg-surface p-6">
            <h2 className="font-brand text-xl font-semibold text-text-primary">
              What we don’t collect
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>We don’t sell your data.</li>
              <li>We don’t collect precise location.</li>
              <li>We don’t collect browsing history outside supported watch pages.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-border/60 bg-surface p-6">
            <h2 className="font-brand text-xl font-semibold text-text-primary">
              How data is used
            </h2>
            <p className="mt-3">
              Data is used to provide the product experience (session continuity and
              spoiler-safe answers) and to improve Veil when you submit feedback.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-surface p-6">
            <h2 className="font-brand text-xl font-semibold text-text-primary">
              Contact
            </h2>
            <p className="mt-3">
              If you have questions or want your feedback data removed, email{" "}
              <a className="text-accent underline underline-offset-4" href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

