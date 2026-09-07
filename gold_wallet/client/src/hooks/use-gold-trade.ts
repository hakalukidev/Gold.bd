"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/session";
import type { Metal } from "@/hooks/use-metal-rate";

// The backend lives in ../../server, not behind this app's own /api routes
// (see wallet-balance-api.ts) — trade calls talk to its trade module
// directly from the browser, so they need its absolute origin and the bearer
// token, same as every other authenticated wallet_server call.
const WALLET_API_URL = process.env.NEXT_PUBLIC_WALLET_API_URL ?? "http://localhost:5000";

// Generalised over the metal the same way use-metal-rate.ts generalised the
// rate queries: the vault holds gold and silver, so a trade posts to
// /api/{metal}/buy | /api/{metal}/sell with a `grams` weight of that metal.
// Both sides invalidate ["wallet"] and ["transactions"] — a trade moves cash
// *and* metal, and lands a row in the ledger.

function useTrade(metal: Metal, side: "buy" | "sell", karat = 22) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (grams: number) => {
      const accessToken = getAccessToken();
      if (!accessToken) throw new Error(`Sign in to ${side} ${metal}`);
      return api.post(
        `${WALLET_API_URL}/api/${metal}/${side}`,
        { grams, ...(metal === "gold" ? { karat } : {}) },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useBuyMetal(metal: Metal, karat = 22) {
  return useTrade(metal, "buy", karat);
}

export function useSellMetal(metal: Metal, karat = 22) {
  return useTrade(metal, "sell", karat);
}

/** Gold-only convenience wrappers — see the shared mutation above. */
export function useBuyGold(karat = 22) {
  return useBuyMetal("gold", karat);
}

export function useSellGold(karat = 22) {
  return useSellMetal("gold", karat);
}
