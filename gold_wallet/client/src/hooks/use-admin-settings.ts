"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { walletAdminApi, type UpdateFeeSettingsInput } from "@/lib/wallet-admin-api";
import { getAccessToken } from "@/lib/session";

/** Current trade fee/tax settings — same lazy-token-in-an-effect pattern as
 * useWallet() (see use-wallet.ts) to avoid a hydration mismatch between the
 * server render and the client's first paint. 403s for a non-admin token,
 * same as every other admin-only call. */
export function useAdminSettings() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  useEffect(() => {
    setAccessToken(getAccessToken());
  }, []);

  return useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => walletAdminApi.getSettings(accessToken!),
    enabled: !!accessToken,
  });
}

export function useUpdateAdminSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateFeeSettingsInput) => {
      const accessToken = getAccessToken();
      if (!accessToken) throw new Error("Sign in as an admin to change settings");
      return walletAdminApi.updateSettings(data, accessToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    },
  });
}
