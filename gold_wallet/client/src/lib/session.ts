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
  return sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function clearSession() {
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`;
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
}
