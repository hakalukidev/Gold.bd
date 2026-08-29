/**
 * Stand-in for real admin authentication until a backend exists (see
 * CLAUDE.md — this repo has no `/api/*` implementation of its own beyond
 * these mocks, same idea as mock-rates.ts and mock-settings.ts).
 *
 * A single hardcoded admin account, overridable via env vars. This is
 * demo-grade: no password hashing, no user table, no real session store —
 * good enough to gate the admin panel locally, not for a real deployment.
 */
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@goldbd.com";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123";

export function verifyAdminCredentials(email: string, password: string): boolean {
  return email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASSWORD;
}
