import { proxyRate } from "@/lib/wallet-rates-api";

/** The "sync now" button's endpoint — forwards to wallet_server's shared
 * gold+silver BAJUS pull (see rate.controller.js), which throttles repeat
 * calls itself. Returns `{ syncedAt }`, the real timestamp of whichever sync
 * (this one or the cron job's last tick) actually ran most recently. */
export async function POST() {
  return proxyRate<{ syncedAt: string | null }>("/api/rates/sync", { method: "POST" });
}
