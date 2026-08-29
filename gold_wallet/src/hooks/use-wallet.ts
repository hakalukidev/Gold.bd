"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { WalletSummary } from "@/types";

export function useWallet() {
  return useQuery({
    queryKey: ["wallet"],
    queryFn: () => api.get<WalletSummary>("/api/wallet"),
  });
}

export function useDeposit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (amountBDT: number) => api.post("/api/wallet/deposit", { amountBDT }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useWithdraw() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (amountBDT: number) => api.post("/api/wallet/withdraw", { amountBDT }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}
