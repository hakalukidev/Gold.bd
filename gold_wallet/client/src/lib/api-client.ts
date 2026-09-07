import type { ApiResponse } from "@/types";
import { notifySessionExpired } from "@/lib/session";

export class ApiError extends Error {
  fieldErrors?: Record<string, string[]>;
  constructor(message: string, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
    this.fieldErrors = fieldErrors;
  }
}

/** True for calls made with the wallet access token (an `Authorization:
 * Bearer …` header) — as opposed to login/register/OTP calls, which are
 * unauthenticated and can legitimately 401 on the wrong password without
 * that meaning a session died. */
function isAuthenticatedCall(headers: HeadersInit | undefined) {
  const authHeader = new Headers(headers).get("Authorization");
  return !!authHeader?.startsWith("Bearer ");
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    // Needed for calls to wallet_server (a different origin in dev): it sets
    // an httpOnly refresh-token cookie that must round-trip with the request.
    credentials: "include",
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = (await res.json()) as ApiResponse<T>;
  if (!body.success) {
    // requireAuth (wallet_server) rejects a missing/expired/tampered access
    // token with 401 — a signed-in page whose 15-minute token has just died,
    // not the same 401 login uses for a wrong password. Auto-logout so the
    // user lands back on /login instead of a page stuck on a dead token.
    if (res.status === 401 && isAuthenticatedCall(init?.headers)) {
      notifySessionExpired();
    }
    throw new ApiError(body.error, body.fieldErrors);
  }
  return body.data;
}

export const api = {
  get: <T>(url: string, init?: RequestInit) => request<T>(url, init),
  post: <T>(url: string, data?: unknown, init?: RequestInit) =>
    request<T>(url, { method: "POST", body: data ? JSON.stringify(data) : undefined, ...init }),
  patch: <T>(url: string, data?: unknown, init?: RequestInit) =>
    request<T>(url, { method: "PATCH", body: data ? JSON.stringify(data) : undefined, ...init }),
};
