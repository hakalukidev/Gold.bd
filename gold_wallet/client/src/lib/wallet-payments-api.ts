import { api, ApiError } from "@/lib/api-client";
import type { PaymentInitResponse, PaymentStatusResponse } from "@/types";

/** The backend lives in ../../server, not behind this app's own /api routes
 * (see wallet-auth-api.ts) — the wallet top-up flow talks to its payments
 * module (SSLCommerz sandbox) directly from the browser. */
const WALLET_API_URL = process.env.NEXT_PUBLIC_WALLET_API_URL ?? "http://localhost:5000";

interface InitDepositInput {
  amount: number;
  customer: { name: string; email: string; phone: string };
  /** e.g. `${window.location.origin}/wallet/payment` — must be one of
   * wallet_server's CORS_ORIGINS or init is rejected. */
  returnBaseUrl: string;
}

export const walletPaymentsApi = {
  /** Adding money is the one wallet flow that's an actual payment — starts an
   * SSLCommerz session for it. Requires a signed-in caller (`accessToken`):
   * unlike gold_commerce's guest checkout, a deposit has to be tied to a
   * wallet account. */
  initDeposit: (input: InitDepositInput, accessToken: string) =>
    api.post<PaymentInitResponse>(
      `${WALLET_API_URL}/api/payments/init`,
      { source: "wallet", purpose: "deposit", currency: "BDT", ...input },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    ),
  getStatus: (tranId: string) => api.get<PaymentStatusResponse>(`${WALLET_API_URL}/api/payments/${encodeURIComponent(tranId)}`),
};

export { ApiError };
