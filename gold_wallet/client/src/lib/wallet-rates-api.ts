import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";

/**
 * wallet_server origin (its own Node/Express app, run separately from this
 * Next.js app) — see .env.local. Read here (server-side, inside a route
 * handler) rather than via wallet-auth-api.ts's direct-from-the-browser
 * pattern, so useMetalRate()'s relative `/api/{metal}/rate` calls resolve to
 * this app's own routes just like gold_commerce's do.
 */
const WALLET_API_URL = process.env.NEXT_PUBLIC_WALLET_API_URL ?? "http://localhost:5000";

/** Proxies to wallet_server's BAJUS-sourced rates module. `init` defaults to a
 * GET (every rate/history route); the sync route passes `{ method: "POST" }`. */
export async function proxyRate<T>(path: string, init?: RequestInit): Promise<NextResponse<ApiResponse<T>>> {
  try {
    const res = await fetch(`${WALLET_API_URL}${path}`, { cache: "no-store", ...init });
    const body = (await res.json()) as ApiResponse<T>;
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    console.error(`Failed to reach wallet_server at ${WALLET_API_URL}${path}`, err);
    const body: ApiResponse<never> = { success: false, error: "Rate feed temporarily unavailable" };
    return NextResponse.json(body, { status: 502 });
  }
}
