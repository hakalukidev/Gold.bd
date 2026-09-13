"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { walletTransactionsApi } from "@/lib/wallet-transactions-api";
import { getAccessToken } from "@/lib/session";

/** Reads the signed-in user's real ledger from wallet_server's transactions
 * module (see walletTransactionsApi) — a bare relative `/api/transactions`
 * (as this hook used to call) has no route in this Next.js app and always
 * 404s, which is why deposits/gold purchases never showed up in the wallet
 * page's Money In/Money Out/Net Saved stats or flow chart no matter how many
 * went through. Same lazy-token-in-an-effect pattern as useWallet/useMe, to
 * avoid a hydration mismatch between the server render and the client's
 * first paint. */
export function useTransactions() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  useEffect(() => {
    setAccessToken(getAccessToken());
  }, []);

  return useQuery({
    queryKey: ["transactions"],
    queryFn: () => walletTransactionsApi.getTransactions(accessToken!),
    enabled: !!accessToken,
  });
}
