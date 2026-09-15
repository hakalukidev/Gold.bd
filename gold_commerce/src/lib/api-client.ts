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
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = (await res.json()) as ApiResponse<T>;
  if (!body.success) throw new ApiError(body.error, body.fieldErrors);
  return body.data;
}

async function requestForm<T>(url: string, formData: FormData, method = "POST"): Promise<T> {
  // No Content-Type header here on purpose — the browser sets the multipart
  // boundary itself; overriding it (as request()'s JSON default does) breaks
  // the upload.
  const res = await fetch(url, { method, body: formData });
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
  postForm: <T>(url: string, formData: FormData) => requestForm<T>(url, formData),
};
