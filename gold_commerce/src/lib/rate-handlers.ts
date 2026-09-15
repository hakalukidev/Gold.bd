import { NextResponse } from "next/server";
import type { Metal } from "@/lib/mock-rates";
import type { ApiResponse, Karat, MetalRateSummary } from "@/types";
import { KARATS } from "./bajus-scraper";
import { getHistory, getLatest } from "./rate-store";

// No karat in the query means "the platform's anchor grade" — 22K, the real
// figure everything else (product/fee math, the hero headline price) prices
// off, not a derived 24K/"fine" number. Mirrors wallet_server's own anchor.
const ANCHOR_KARAT: Karat = "22k";

function parseKarat(request: Request): Karat | NextResponse {
  const raw = new URL(request.url).searchParams.get("karat");
  if (!raw) return ANCHOR_KARAT;
  if (!KARATS.includes(raw as Karat)) {
    const body: ApiResponse<never> = {
      success: false,
      error: `Unknown karat "${raw}" — expected one of ${KARATS.join(", ")}`,
    };
    return NextResponse.json(body, { status: 400 });
  }
  return raw as Karat;
}

/** Backs GET /api/{gold,silver}/rate — the latest bajus.org reading for the
 * requested (or anchor) karat, scraped and cached by rate-store.ts. */
export function handleGetRate(metal: Metal) {
  return async function GET(request: Request) {
    const karat = parseKarat(request);
    if (karat instanceof NextResponse) return karat;

    const rate = await getLatest(metal, karat);
    if (!rate) {
      const body: ApiResponse<never> = { success: false, error: `No ${metal} ${karat} rate available yet` };
      return NextResponse.json(body, { status: 404 });
    }
    const body: ApiResponse<MetalRateSummary> = { success: true, data: rate };
    return NextResponse.json(body);
  };
}

/** Backs GET /api/{gold,silver}/rate-history — the cached day-by-day series
 * for the requested (or anchor) karat. */
export function handleGetRateHistory(metal: Metal) {
  return async function GET(request: Request) {
    const karat = parseKarat(request);
    if (karat instanceof NextResponse) return karat;

    const body: ApiResponse<MetalRateSummary[]> = { success: true, data: await getHistory(metal, karat) };
    return NextResponse.json(body);
  };
}
