"use client";
import { useState, useEffect } from "react";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const EXPECTED_HASH = process.env.NEXT_PUBLIC_ADMIN_HASH!;
const STORAGE_KEY = "veil_admin_auth";

interface FeedbackRow {
  id: number;
  created_at: string;
  text: string;
  show_title: string | null;
  platform: string | null;
  season: string | null;
  episode: string | null;
}

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Check localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored === EXPECTED_HASH) {
      setAuthed(true);
    }
  }, []);

  // Fetch rows when authenticated
  useEffect(() => {
    if (!authed) return;
    setLoading(true);
    fetch(`${SUPABASE_URL}/rest/v1/feedback?order=created_at.desc&limit=200`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
    })
      .then(r => r.json())
      .then(data => { setRows(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [authed]);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    const hash = await sha256(password);
    if (hash === EXPECTED_HASH) {
      localStorage.setItem(STORAGE_KEY, hash);
      setAuthed(true);
      setError("");
    } else {
      setError("Incorrect password.");
    }
  }

  function handleSignOut() {
    localStorage.removeItem(STORAGE_KEY);
    setAuthed(false);
    setRows([]);
    setPassword("");
  }

  if (!authed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4">
        <div className="w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8">
          <h1 className="mb-6 font-brand text-xl font-semibold text-[var(--color-text-primary)]">
            Veil Admin
          </h1>
          <form onSubmit={handleUnlock} className="flex flex-col gap-3">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              required
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              type="submit"
              className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Unlock
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg)] px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-brand text-xl font-semibold text-[var(--color-text-primary)]">
            Feedback ({rows.length})
          </h1>
          <button
            onClick={handleSignOut}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            Sign out
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-[var(--color-text-muted)]">Loading...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No feedback yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)] text-left">
                  <th className="px-4 py-3 font-medium text-[var(--color-text-secondary)]">Time</th>
                  <th className="hidden px-4 py-3 font-medium text-[var(--color-text-secondary)] md:table-cell">Show</th>
                  <th className="hidden px-4 py-3 font-medium text-[var(--color-text-secondary)] md:table-cell">Platform</th>
                  <th className="hidden px-4 py-3 font-medium text-[var(--color-text-secondary)] md:table-cell">Ep</th>
                  <th className="px-4 py-3 font-medium text-[var(--color-text-secondary)]">Feedback</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface)]/50">
                    <td className="px-4 py-3 text-xs text-[var(--color-text-muted)] whitespace-nowrap">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                    <td className="hidden px-4 py-3 text-[var(--color-text-secondary)] md:table-cell">
                      {row.show_title ?? "—"}
                    </td>
                    <td className="hidden px-4 py-3 text-[var(--color-text-secondary)] md:table-cell">
                      {row.platform ?? "—"}
                    </td>
                    <td className="hidden px-4 py-3 text-[var(--color-text-secondary)] md:table-cell">
                      {row.season && row.episode ? `S${row.season}E${row.episode}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-primary)]">{row.text}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
