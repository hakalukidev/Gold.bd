"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { walletAuthApi } from "@/lib/wallet-auth-api";
import { getAccessToken } from "@/lib/session";

/** Reads the signed-in user's real profile from wallet_server's `/api/auth/me`
 * (see walletAuthApi.me) — this app has no `/api/auth/me` route of its own, so
 * calling a bare relative `/api/auth/me` (as this hook used to) always 404s
 * against Next.js itself and silently falls back to MOCK_USER everywhere,
 * which is why a real signed-in user kept seeing the seeded demo name instead
 * of their own. Same lazy-token-read pattern as useWallet, to avoid a
 * hydration mismatch between the server render and the client's first paint. */
export function useMe() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  useEffect(() => {
    setAccessToken(getAccessToken());
  }, []);

  return useQuery({
    queryKey: ["me"],
    queryFn: () => walletAuthApi.me(accessToken!),
    enabled: !!accessToken,
    retry: false,
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/api/auth/logout"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  });
}
