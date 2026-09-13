import { api } from "@/lib/api-client";
import type { TransactionSummary } from "@/types";

/** The backend lives in ../../server, not behind this app's own /api routes
 * (see wallet-auth-api.ts) — gift calls talk to its gift module directly. */
const WALLET_API_URL = process.env.NEXT_PUBLIC_WALLET_API_URL ?? "http://localhost:5000";

export interface SendGiftInput {
  recipientPhone: string;
  metal: "gold" | "silver";
  grams: number;
}

export const giftApi = {
  send: (input: SendGiftInput, accessToken: string) =>
    api.post<TransactionSummary>(`${WALLET_API_URL}/api/gift`, input, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
};
