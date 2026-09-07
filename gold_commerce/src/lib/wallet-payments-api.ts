import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";

/**
 * gold_wallet/server origin — see wallet-rates-api.ts. This site has no
 * payment gateway of its own; checkout goes through wallet_server's SSLCommerz
 * integration (src/modules/payments over there) the same way rates do, so the
 * store_id/store_passwd secrets never need to live in this app at all.
 */
const WALLET_API_URL = process.env.WALLET_API_URL ?? "http://localhost:5000";

export async function proxyPayment<T>(path: string, init?: RequestInit): Promise<NextResponse<ApiResponse<T>>> {
  try {
    const res = await fetch(`${WALLET_API_URL}${path}`, {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      ...init,
    });
    const body = (await res.json()) as ApiResponse<T>;
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    console.error(`Failed to reach wallet_server at ${WALLET_API_URL}${path}`, err);
    const body: ApiResponse<never> = { success: false, error: "Payment gateway is temporarily unavailable" };
    return NextResponse.json(body, { status: 502 });
  }
}
