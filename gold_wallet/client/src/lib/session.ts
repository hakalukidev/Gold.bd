/**
 * Stand-in for a real session while this app has no auth backend behind it
 * (see AGENTS.md / login page). A plain (non-httpOnly) cookie is the only
 * option that both the client — OTP verification runs entirely in the
 * browser — and `middleware.ts` — which needs to read it on the request
 * before any page renders — can touch. Swap this for a real httpOnly session
 * cookie set by the backend once one exists; nothing else should need to
 * change since callers only ever call `markSignedIn`/`clearSession`.
 */
export const SESSION_COOKIE = "gb_session";

const ONE_MONTH_SECONDS = 60 * 60 * 24 * 30;

// The JWT access token wallet_server issues on OTP verification. Kept in
// sessionStorage (tab-scoped, cleared on close) rather than a cookie since
// only client-side fetches to wallet_server need it — middleware only cares
// about SESSION_COOKIE above. A page reload re-fetches it via /api/auth/refresh
// once callers need authenticated wallet_server requests.
const ACCESS_TOKEN_KEY = "gb_access_token";

export function markSignedIn() {
  document.cookie = `${SESSION_COOKIE}=1; path=/; max-age=${ONE_MONTH_SECONDS}; samesite=lax`;
}

export function setAccessToken(token: string) {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function getAccessToken() {
  // Guarded for SSR: Next.js still renders "use client" components on the
  // server for the initial HTML, and callers now include hook bodies (e.g.
  // useWallet) that run there too, not just browser-only event handlers.
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function clearSession() {
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`;
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
}

/** Fired by api-client when an authenticated wallet_server call comes back
 * 401 — the access token died (expired, or the session was revoked server
 * side) mid-visit. Listened for once, near the app root (see providers.tsx),
 * so every page that happens to be open when that happens reacts the same
 * way instead of each caller having to notice its own 401 and log out. */
export const SESSION_EXPIRED_EVENT = "gb:session-expired";

export function notifySessionExpired() {
  if (typeof window === "undefined") return;
  clearSession();
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}
