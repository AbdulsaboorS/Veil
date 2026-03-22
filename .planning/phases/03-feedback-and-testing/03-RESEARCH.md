# Phase 3: Feedback & Testing - Research

**Researched:** 2026-03-22
**Domain:** In-extension feedback UX, Supabase DB + Edge Function, read-only admin dashboard (Next.js, localStorage password gate)
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FBK-01 | A feedback entry point (button or menu item) is accessible from within the extension side panel at all times | UI placement analysis — Header is the correct insertion point; existing `Button` + `lucide-react` icons available with no new deps |
| FBK-02 | Submitted feedback is stored in a Supabase table with timestamp, text, show name, and platform metadata | Supabase migration pattern established (see existing `.sql` files); new `log-feedback` Edge Function mirrors `log-spoiler-report` pattern |
| FBK-03 | A read-only dashboard (hosted in `/landing`) displays all submissions, protected by a simple password | Landing app is Next.js 16/React 19; a new `/admin` route with localStorage password gate and direct Supabase REST read covers this with no new packages |
</phase_requirements>

---

## Summary

Phase 3 has three distinct deliverables: a feedback button in the extension side panel UI, a Supabase table + Edge Function to store submissions, and a read-only admin dashboard in the existing `landing/` Next.js app. All three are small in scope and fit cleanly into the existing architecture without adding new npm dependencies.

The extension side panel is a React/Vite app with Radix UI components (Dialog, Toast, Button) already installed. The Header component has a right-side icon row that currently holds the history button — the feedback button slots in alongside it identically. A Dialog modal (already present via `@radix-ui/react-dialog`) handles the submission form inline, giving the user a textarea + submit without navigating away from chat.

The Supabase side is a direct copy of the existing migration + Edge Function pattern. A new `feedback` table with six columns, plus a new `log-feedback` function (mirrors `log-spoiler-report`), is the entire backend footprint. The dashboard is a single new page (`/admin`) in `landing/app/` that reads the `feedback` table via Supabase's REST API and gates access with a hardcoded SHA-256 hash compared against a localStorage-persisted password entry — no auth infrastructure needed.

**Primary recommendation:** Feedback button in Header (right of history icon), Dialog modal for submission form, new `feedback` Supabase table + `log-feedback` Edge Function, `/admin` Next.js page with localStorage password gate.

---

## Standard Stack

### Core (existing — no new deps required)

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `@radix-ui/react-dialog` | `^1.1.14` | Feedback modal | Already installed; accessible, unstyled, animatable |
| `@radix-ui/react-toast` / `sonner` | `^1.7.4` | Submit confirmation toast | Already wired via `use-toast.ts` |
| `lucide-react` | `^0.462.0` | Feedback button icon (`MessageSquare` or `Flag`) | Already installed |
| Supabase REST API | N/A | Admin dashboard reads feedback table | Available via `https://{ref}.supabase.co/rest/v1/feedback` with anon key |
| Next.js 16 | `16.1.6` | Landing/admin app | Already the `landing/` stack |
| Web Crypto API | browser-native | SHA-256 password hash comparison | Zero deps, available in all modern browsers |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@supabase/supabase-js` | `^2.89.0` | Admin dashboard DB reads | Already in main app; add to landing's package.json only if preferred over raw fetch; raw fetch is simpler for a single-page admin |
| Tailwind CSS 4 | `^4` | Landing/admin styling | Already configured in `landing/` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Radix Dialog in extension | Bottom Sheet (vaul) | Dialog is already present and fits modal feedback form; Sheet is for history-style drawers |
| localStorage hash gate | Full Supabase Auth | Auth infra is overkill for a single-owner read-only dashboard; hash gate is sufficient and zero-config |
| New `log-feedback` function | Extend `log-spoiler-report` | `log-spoiler-report` handles a different domain (spoiler Q&A reports); separate function keeps concerns clean and matches existing pattern |
| Supabase JS client in landing | Raw `fetch` to REST API | Raw fetch keeps landing's dependency footprint minimal; one read endpoint does not justify adding the full client |

**Installation:** No new packages required for the extension. Landing admin page requires no additional packages either — raw `fetch` to Supabase REST is sufficient.

---

## Architecture Patterns

### Recommended Project Structure (new files only)

```
src/
└── components/
    └── FeedbackDialog.tsx        # Dialog trigger + form + submit logic

supabase/
├── functions/
│   └── log-feedback/
│       └── index.ts              # Edge function: validate + insert feedback row
└── migrations/
    └── 20260322000001_create_feedback.sql   # feedback table DDL

landing/
└── app/
    └── admin/
        └── page.tsx              # Read-only admin dashboard with password gate
```

### Pattern 1: Header Icon Row Extension (FBK-01)

**What:** Add a `FeedbackDialog` trigger button to Header's right icon row, identically styled to the existing history button.
**When to use:** The feedback entry point must be "accessible at all times" — placing it in the Header satisfies this for all phases (detecting, ready, no-show, needs-episode).
**Example:**
```tsx
// In Header.tsx — right icon row, after history button
import { FeedbackDialog } from '@/components/FeedbackDialog';

// Inside the flex row:
<FeedbackDialog meta={meta} />

// FeedbackDialog.tsx — trigger is an icon button, identical to history button styling:
<Button
  variant="ghost"
  size="sm"
  onClick={() => setOpen(true)}
  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
  aria-label="Send feedback"
>
  <MessageSquare className="w-4 h-4" />
</Button>
```

### Pattern 2: Feedback Dialog Form (FBK-01, FBK-02)

**What:** Radix Dialog with a textarea (required), optional category (bug / suggestion / praise), and submit button. On submit: POST to `log-feedback` Edge Function, then show toast and close.
**When to use:** Modal form submission; avoids navigating away from chat.
**Example:**
```tsx
// Source: existing Dialog usage pattern in codebase (@radix-ui/react-dialog)
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="w-[320px]">
    <DialogHeader>
      <DialogTitle>Send Feedback</DialogTitle>
    </DialogHeader>
    <textarea
      value={text}
      onChange={e => setText(e.target.value)}
      placeholder="What's on your mind?"
      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none h-24"
    />
    <Button onClick={handleSubmit} disabled={!text.trim() || isSubmitting}>
      {isSubmitting ? 'Sending…' : 'Send'}
    </Button>
  </DialogContent>
</Dialog>
```

### Pattern 3: Supabase Edge Function (FBK-02)

**What:** `log-feedback` function — validates body, inserts into `feedback` table via Supabase service role, returns 200. Mirrors `log-spoiler-report` structure exactly.
**When to use:** All feedback submissions from the extension.
**Example:**
```typescript
// supabase/functions/log-feedback/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const { text, showTitle, platform, episode, season } = await req.json();
  if (!text?.trim()) return new Response(JSON.stringify({ error: "text required" }), { status: 400, headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  await supabase.from("feedback").insert({
    text: text.trim().slice(0, 2000),
    show_title: showTitle ?? null,
    platform: platform ?? null,
    season: season ?? null,
    episode: episode ?? null,
  });
  return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
});
```

### Pattern 4: Admin Dashboard with localStorage Password Gate (FBK-03)

**What:** A Next.js page at `/admin` in `landing/`. On load, checks `localStorage.getItem('veil_admin_auth')`. If it matches the expected SHA-256 hash of the password, shows the table. Otherwise, shows a password input. Uses raw `fetch` to Supabase REST API to read feedback rows.
**When to use:** Single-owner read-only dashboard; no auth infra needed.
**Example:**
```typescript
// landing/app/admin/page.tsx  (simplified)
"use client";
const EXPECTED_HASH = "sha256-of-your-password-here"; // computed offline, hardcoded

async function checkPassword(input: string): Promise<boolean> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  return hex === EXPECTED_HASH;
}

// Fetch feedback rows via Supabase REST (no client library needed):
const res = await fetch(
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/feedback?order=created_at.desc`,
  { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}` } }
);
const rows = await res.json();
```

### Pattern 5: Supabase Migration (FBK-02)

**What:** New migration file following the established naming convention and RLS pattern from `20260308000001_create_kb_tables.sql`.
```sql
-- 20260322000001_create_feedback.sql
create table public.feedback (
  id          bigserial primary key,
  text        text not null,
  show_title  text,
  platform    text,
  season      text,
  episode     text,
  created_at  timestamptz default now()
);

-- RLS: no public read (admin only via service_role or anon key with policy)
alter table public.feedback enable row level security;
-- Allow service_role writes (bypasses RLS), allow anon reads for admin dashboard
create policy "anon read" on public.feedback for select using (true);
```

**Note on RLS for dashboard:** Because the admin dashboard uses the anon key via the REST API, the simplest approach is a `for select using (true)` policy. The password gate is the only access control. If stricter control is needed, use `service_role` key in the dashboard instead — but that requires the key to be in a server environment, not a client Next.js page. The localStorage hash gate + anon key is the right tradeoff for a single-owner MVP.

### Anti-Patterns to Avoid

- **Putting the feedback button in QAStep:** QAStep is only rendered in the `ready`/`error` phase. The requirement says "accessible at all times" — Header is the correct location.
- **Feedback as a new route:** The extension is a single-page React app. Navigation is not available. Dialog is the correct pattern.
- **Storing feedback in localStorage:** Feedback must land in Supabase (FBK-02). localStorage would be lost on extension update or device switch.
- **Extending `log-spoiler-report`:** That function has a different schema and purpose. A new function keeps concerns clean and is consistent with the project's "self-contained, no shared imports" policy for Edge Functions.
- **Using `@supabase/supabase-js` in the landing admin page:** Raw `fetch` to the REST API is sufficient and avoids adding a dependency to the landing app.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Accessible modal | Custom modal with `div` + `role="dialog"` | Radix Dialog (already installed) | Focus trap, keyboard dismiss, aria attributes |
| Feedback submit toast | Custom notification div | Sonner / `use-toast` (already wired) | Consistent with existing "Safety edit applied" toast pattern |
| Password hashing | Custom hash or plaintext compare | `crypto.subtle.digest("SHA-256", ...)` | Native browser API, zero deps, sufficient for this use case |
| DB insert | Manual `fetch` to Supabase REST in extension | Supabase Edge Function (`log-feedback`) | Keeps anon key out of feedback write path; functions handle CORS + validation |

---

## Common Pitfalls

### Pitfall 1: FeedbackDialog breaks Header layout at narrow widths

**What goes wrong:** The side panel is 400px wide. Adding a third icon to the header right row can overflow or squish the StatusBadge.
**Why it happens:** The status badge is already variable-width. Three icons + badge can exceed available space.
**How to avoid:** Keep the feedback icon `h-7 w-7` (same as history button). Test at minimum panel width (≈360px) to confirm nothing wraps.
**Warning signs:** StatusBadge text truncates more aggressively than before; header wraps to two lines.

### Pitfall 2: Extension bundle not rebuilt after adding FeedbackDialog

**What goes wrong:** `extension/app/assets/index.js` is stale — feedback button appears in `npm run dev` but not in the Chrome extension.
**Why it happens:** `src/` changes require `BUILD_TARGET=extension npm run build` (per CLAUDE.md Section 5).
**How to avoid:** Every plan that touches `src/` must include a bundle rebuild step.

### Pitfall 3: Admin dashboard anon key exposure

**What goes wrong:** `NEXT_PUBLIC_SUPABASE_ANON_KEY` is embedded in the client-side bundle of the landing page, visible in the browser.
**Why it happens:** Next.js `NEXT_PUBLIC_*` vars are inlined at build time.
**How to avoid:** This is acceptable for anon keys (they are publishable by design — see Supabase docs). The anon key + `for select using (true)` RLS policy is the correct pattern for public-read tables. For a more hardened setup, use a Next.js API route (`/api/admin/feedback`) that uses `SUPABASE_SERVICE_ROLE_KEY` (server-only), but this is scope creep for MVP. The password gate is sufficient to prevent casual access.
**Warning signs:** None — this is expected Supabase architecture. The anon key is safe to expose publicly.

### Pitfall 4: `log-feedback` function not deployed

**What goes wrong:** Feedback submit silently fails (or throws a network error) if the function isn't deployed.
**Why it happens:** New Supabase functions require `supabase functions deploy log-feedback` before they respond.
**How to avoid:** Include `supabase functions deploy log-feedback` in the plan's verification step.

### Pitfall 5: `feedback` table not migrated to production

**What goes wrong:** Edge function inserts fail with "relation public.feedback does not exist".
**Why it happens:** Supabase migrations require `supabase db push` (or applying via Studio SQL editor) to run against the remote project.
**How to avoid:** Apply migration via `supabase db push` or paste SQL into Supabase Studio SQL editor. Document this in the plan.

### Pitfall 6: Admin dashboard `created_at` ordering requires index

**What goes wrong:** `?order=created_at.desc` on a table with many rows becomes slow.
**Why it happens:** No index on `created_at` by default.
**How to avoid:** Add `create index on public.feedback (created_at desc)` in the migration. Low risk for MVP volume, but costs nothing to add upfront.

### Pitfall 7: `meta` prop not passed to FeedbackDialog

**What goes wrong:** FeedbackDialog submits feedback without show/platform metadata — FBK-02 requires show name and platform.
**Why it happens:** Header receives `statusBadgeProps` which contains `meta`, but FeedbackDialog is a new component added to Header.
**How to avoid:** Pass `meta: SessionMeta | null` explicitly to `FeedbackDialog` from Header. `meta` contains `showTitle`, `platform`, `season`, `episode`.

---

## Code Examples

### Submitting feedback from extension (client side)

```typescript
// Source: mirrors fetch pattern from useEpisodeRecap.ts / useInitFlow.ts
async function submitFeedback(text: string, meta: SessionMeta | null) {
  const base = import.meta.env.VITE_SUPABASE_URL;
  const auth = `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`;
  await fetch(`${base}/functions/v1/log-feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: auth },
    body: JSON.stringify({
      text,
      showTitle: meta?.showTitle ?? null,
      platform: meta?.platform ?? null,
      season: meta?.season ?? null,
      episode: meta?.episode ?? null,
    }),
  });
}
```

### Reading feedback rows for admin dashboard (raw fetch)

```typescript
// Source: Supabase REST API, https://supabase.com/docs/guides/api
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const res = await fetch(
  `${SUPABASE_URL}/rest/v1/feedback?order=created_at.desc&limit=200`,
  {
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    },
  }
);
const rows: FeedbackRow[] = await res.json();
```

### SHA-256 password gate (no dependency)

```typescript
// Source: MDN Web Crypto API — https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest
async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input)
  );
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

// Generate the expected hash offline:
//   node -e "crypto.subtle.digest('SHA-256', new TextEncoder().encode('yourpass')).then(b => console.log(Buffer.from(b).toString('hex')))"
// Hardcode the result in the page.
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `log-spoiler-report` console-only logging | `log-feedback` DB insert pattern | Phase 3 (new) | Feedback is queryable |
| No admin dashboard | `/admin` Next.js page with hash gate | Phase 3 (new) | Owner can review feedback |
| Full auth system for admin | localStorage hash gate | Phase 3 design | Zero complexity, sufficient for single owner |

**Not deprecated:** The existing `log-spoiler-report` function remains separate — it handles a different domain and is not being replaced.

---

## Open Questions

1. **Password hash distribution**
   - What we know: The hash must be hardcoded in `landing/app/admin/page.tsx` at build time. The plaintext password must be communicated out-of-band (e.g., stored in a password manager by the owner).
   - What's unclear: Whether the owner wants this stored as an env var (`NEXT_PUBLIC_ADMIN_HASH`) or literally hardcoded. Env var is cleaner and allows password rotation without code change.
   - Recommendation: Use `process.env.NEXT_PUBLIC_ADMIN_HASH` in the page, set via Vercel/hosting env vars. Document in `.env.example` for `landing/`.

2. **`NEXT_PUBLIC_SUPABASE_*` vars in landing app**
   - What we know: The landing app (`landing/`) does not currently have a `.env.local`. The main app has `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
   - What's unclear: Whether the landing app is deployed to Vercel (where env vars are set in the dashboard) or served statically.
   - Recommendation: Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `landing/.env.local` (gitignored). Document in `landing/` README or `CLAUDE.md`.

3. **Feedback table RLS strictness**
   - What we know: `for select using (true)` allows any authenticated or anonymous user to read all feedback rows if they know the REST endpoint.
   - What's unclear: Whether that's acceptable for beta (feedback may contain personal comments).
   - Recommendation: For MVP/beta, it's acceptable — the anon key is not a secret and feedback volume is minimal. If concern arises, add an API route in Next.js that uses the service_role key server-side. Flag this as a v2 hardening item.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (config exists at `vitest.config.ts`; binary NOT currently installed) |
| Config file | `vitest.config.ts` + `src/test/setup.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

**Note:** `vitest` is configured (`vitest.config.ts` present, `src/test/setup.ts` present) but the binary is not installed in `node_modules`. Wave 0 must install it: `npm install --save-dev vitest @testing-library/react @testing-library/user-event`.

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FBK-01 | FeedbackDialog renders trigger button in Header | unit | `npx vitest run src/test/FeedbackDialog.test.tsx` | Wave 0 |
| FBK-01 | Dialog opens on trigger click; textarea visible | unit | `npx vitest run src/test/FeedbackDialog.test.tsx` | Wave 0 |
| FBK-02 | `submitFeedback()` POSTs correct payload (text, showTitle, platform, season, episode) | unit (fetch mock) | `npx vitest run src/test/submitFeedback.test.ts` | Wave 0 |
| FBK-02 | `log-feedback` Edge Function inserts row (manual-only: requires live Supabase) | manual | n/a — verify via Supabase Studio Table Editor | N/A |
| FBK-03 | Admin page shows password gate when not authenticated | unit | `npx vitest run src/test/AdminPage.test.tsx` (or landing test) | Wave 0 |
| FBK-03 | Correct password unlocks table; incorrect password stays gated | unit (crypto mock) | `npx vitest run src/test/AdminPage.test.tsx` | Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run src/test/FeedbackDialog.test.tsx`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/test/FeedbackDialog.test.tsx` — covers FBK-01 (render, open, close)
- [ ] `src/test/submitFeedback.test.ts` — covers FBK-02 client-side payload
- [ ] Install vitest + testing-library: `npm install --save-dev vitest @testing-library/react @testing-library/user-event jsdom`
- [ ] `landing/app/admin/page.test.tsx` (optional) — password gate logic is straightforward; manual verify acceptable for MVP if test setup in landing app is out of scope

---

## Sources

### Primary (HIGH confidence)

- Codebase inspection: `src/components/Header.tsx`, `src/components/steps/QAStep.tsx`, `src/pages/Index.tsx` — established Header icon row pattern, Dialog availability, meta prop flow
- Codebase inspection: `supabase/functions/log-spoiler-report/index.ts` — exact Edge Function structure to mirror
- Codebase inspection: `supabase/migrations/20260308000001_create_kb_tables.sql` — migration DDL pattern, RLS policy pattern
- Codebase inspection: `landing/package.json`, `landing/app/page.tsx` — Next.js 16, React 19, Tailwind 4 stack confirmed; no Supabase client installed
- Codebase inspection: `package.json` — `@radix-ui/react-dialog`, `lucide-react`, `sonner`, `@supabase/supabase-js` all confirmed installed
- Codebase inspection: `vitest.config.ts`, `src/test/setup.ts` — test framework configured but binary not installed

### Secondary (MEDIUM confidence)

- Supabase REST API pattern: standard `GET /rest/v1/{table}` with `apikey` and `Authorization` headers — well-established Supabase REST interface
- MDN SubtleCrypto SHA-256: `crypto.subtle.digest("SHA-256", ...)` — standard browser API, available in Next.js client components

### Tertiary (LOW confidence)

- None. All findings derived from direct codebase inspection or well-established platform APIs.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed installed via `package.json` inspection
- Architecture: HIGH — insertion points confirmed by reading actual component source
- Pitfalls: HIGH — derived from existing CLAUDE.md bug log and codebase patterns (bundle rebuild requirement, meta prop flow)
- Dashboard approach: HIGH — landing app stack confirmed; REST API pattern is standard Supabase

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (stable stack; Supabase REST API is versioned and stable)
