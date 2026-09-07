import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";

/**
 * gold_wallet/server origin (its Express/Postgres backend) — see .env.local.
 * Server-only: read only inside route handlers, never sent to the browser.
 */
const WALLET_API_URL = process.env.WALLET_API_URL ?? "http://localhost:5000";

/**
 * Proxies one of this site's `/api/{gold,silver}/rate[-history]` routes to
 * wallet_server's BAJUS-sourced rates module — this repo has no rates
 * database of its own; wallet_server is the single source of truth both this
 * site and gold_wallet/client read from. Always fetched fresh: a cached stale
 * gold price is worse than a slower response.
 */
export async function proxyRate<T>(path: string): Promise<NextResponse<ApiResponse<T>>> {
  try {
    const res = await fetch(`${WALLET_API_URL}${path}`, { cache: "no-store" });
    const body = (await res.json()) as ApiResponse<T>;
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    console.error(`Failed to reach wallet_server at ${WALLET_API_URL}${path}`, err);
    const body: ApiResponse<never> = { success: false, error: "Rate feed temporarily unavailable" };
    return NextResponse.json(body, { status: 502 });
  }
}
