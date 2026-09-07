import { api, ApiError } from "@/lib/api-client";
import type { WalletSummary } from "@/types";

/** The backend lives in ../../server, not behind this app's own /api routes
 * (see wallet-auth-api.ts, wallet-payments-api.ts) — balance and withdrawal
 * calls talk to its wallet module directly from the browser. */
const WALLET_API_URL = process.env.NEXT_PUBLIC_WALLET_API_URL ?? "http://localhost:5000";

export const walletBalanceApi = {
  getBalance: (accessToken: string) =>
    api.get<WalletSummary>(`${WALLET_API_URL}/api/wallet`, { headers: { Authorization: `Bearer ${accessToken}` } }),
  /** Demo flow — no payout gateway yet (see add-money-panel.tsx): this debits
   * the ledger directly instead of moving real money out. */
  withdraw: (amountBDT: number, accessToken: string) =>
    api.post<WalletSummary>(
      `${WALLET_API_URL}/api/wallet/withdraw`,
      { amountBDT },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    ),
};

export { ApiError };
