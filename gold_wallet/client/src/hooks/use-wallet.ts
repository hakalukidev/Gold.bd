"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { walletBalanceApi } from "@/lib/wallet-balance-api";
import { getAccessToken } from "@/lib/session";

/** Reads the signed-in user's real balance from wallet_server's wallet module
 * (see server/src/modules/wallet) — cash comes from confirmed SSLCommerz
 * deposits, gold/silver stay 0 until a trading module exists to move them.
 * `enabled` skips the call entirely while signed out rather than firing a
 * request doomed to 401, so a guest never sees this as a loading balance.
 *
 * The token itself is read lazily, after mount, rather than during this
 * render: `getAccessToken` returns null on the server (no sessionStorage
 * there) but the real token during the client's hydration render (the
 * browser already has sessionStorage by then), so reading it inline would
 * make the first client render disagree with the server-rendered HTML and
 * trip a hydration mismatch. Starting from null on every render and only
 * picking up the real token in an effect keeps the hydration render
 * identical to the server's, at the cost of a one-frame delay before an
 * already-signed-in user's balance starts loading. */
export function useWallet() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  useEffect(() => {
    setAccessToken(getAccessToken());
  }, []);

  return useQuery({
    queryKey: ["wallet"],
    queryFn: () => walletBalanceApi.getBalance(accessToken!),
    enabled: !!accessToken,
  });
}

/** Demo flow — no payout gateway exists yet (see add-money-panel.tsx), so this
 * just debits the ledger directly. */
export function useWithdraw() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (amountBDT: number) => {
      const accessToken = getAccessToken();
      if (!accessToken) throw new Error("Sign in to withdraw from your wallet");
      return walletBalanceApi.withdraw(amountBDT, accessToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}
