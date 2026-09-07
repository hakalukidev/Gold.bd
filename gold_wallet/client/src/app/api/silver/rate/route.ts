import { proxyRate } from "@/lib/wallet-rates-api";
import type { MetalRateSummary } from "@/types";

/** ?karat=22k|21k|18k|sonaton forwards straight to wallet_server's rates
 * module for the real per-grade figure; omitted, it keeps returning the
 * 22K anchor every other consumer of this route already relies on. */
export async function GET(request: Request) {
  const karat = new URL(request.url).searchParams.get("karat");
  return proxyRate<MetalRateSummary>(`/api/silver/rate${karat ? `?karat=${encodeURIComponent(karat)}` : ""}`);
}
