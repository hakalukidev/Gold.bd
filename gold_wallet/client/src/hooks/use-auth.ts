"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { walletAuthApi } from "@/lib/wallet-auth-api";
import { getAccessToken } from "@/lib/session";

/** Reads the signed-in user's real profile from wallet_server's `/api/auth/me`
 * (see walletAuthApi.me) — this app has no `/api/auth/me` route of its own, so
 * a bare relative `/api/auth/me` always 404s against Next.js itself. Same
 * lazy-token-read pattern as useWallet, to avoid a hydration mismatch between
 * the server render and the client's first paint.
 *
 * `tokenChecked`/`hasToken` let callers (see UserMenu) tell "still loading"
 * apart from "definitely signed out" — middleware only gates routes on the
 * long-lived `gb_session` cookie (see src/lib/session.ts), so a stale cookie
 * with no real access token in sessionStorage can otherwise let a signed-out
 * visitor sit on a dashboard page indefinitely. */
export function useMe() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [tokenChecked, setTokenChecked] = useState(false);
  useEffect(() => {
    setAccessToken(getAccessToken());
    setTokenChecked(true);
  }, []);

  const query = useQuery({
    queryKey: ["me"],
    queryFn: () => walletAuthApi.me(accessToken!),
    enabled: !!accessToken,
    retry: false,
  });

  return { ...query, tokenChecked, hasToken: !!accessToken };
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => walletAuthApi.logout(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  });
}
