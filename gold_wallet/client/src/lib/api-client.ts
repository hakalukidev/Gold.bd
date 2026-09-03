import type { ApiResponse } from "@/types";

export class ApiError extends Error {
  fieldErrors?: Record<string, string[]>;
  constructor(message: string, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
    this.fieldErrors = fieldErrors;
  }
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
  if (!body.success) throw new ApiError(body.error, body.fieldErrors);
  return body.data;
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, data?: unknown) =>
    request<T>(url, { method: "POST", body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(url: string, data?: unknown) =>
    request<T>(url, { method: "PATCH", body: data ? JSON.stringify(data) : undefined }),
};
