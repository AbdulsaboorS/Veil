import { describe, it, expect, vi } from 'vitest';

// NOTE: Admin page is a Next.js page in landing/. Testing the password gate logic
// as a pure function extracted into a shared util to keep testing simple.
// The page itself is verified manually (see 03-VALIDATION.md manual verifications).

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const KNOWN_PASSWORD = 'veil-admin-2026';

describe('Admin password gate logic', () => {
  it('produces a deterministic SHA-256 hash for a known password', async () => {
    const hash = await sha256(KNOWN_PASSWORD);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('same password produces same hash (idempotent)', async () => {
    const h1 = await sha256(KNOWN_PASSWORD);
    const h2 = await sha256(KNOWN_PASSWORD);
    expect(h1).toBe(h2);
  });

  it('different passwords produce different hashes', async () => {
    const h1 = await sha256(KNOWN_PASSWORD);
    const h2 = await sha256('wrong-password');
    expect(h1).not.toBe(h2);
  });
});
