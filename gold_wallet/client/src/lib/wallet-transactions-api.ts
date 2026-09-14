import { api } from "@/lib/api-client";
import type { TransactionSummary } from "@/types";

/** The backend lives in ../../server, not behind this app's own /api routes
 * (see wallet-auth-api.ts, wallet-balance-api.ts) — ledger reads talk to its
 * transactions module directly from the browser. */
const WALLET_API_URL = process.env.NEXT_PUBLIC_WALLET_API_URL ?? "http://localhost:5000";

export const walletTransactionsApi = {
  getTransactions: (accessToken: string) =>
    api.get<TransactionSummary[]>(`${WALLET_API_URL}/api/transactions`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
};
