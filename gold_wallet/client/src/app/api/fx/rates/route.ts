import { proxyRate } from "@/lib/wallet-rates-api";
import type { FxRates } from "@/types";

/** Live USD/EUR/GBP/SAR -> BDT quotes for the currency-conversion card, see
 * useFxRates(). Forwards straight to wallet_server's fx-sync.job.js cache. */
export async function GET() {
  return proxyRate<FxRates>("/api/fx/rates");
}
