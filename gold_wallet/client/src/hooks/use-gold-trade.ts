"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Metal } from "@/hooks/use-metal-rate";

// Generalised over the metal the same way use-metal-rate.ts generalised the
// rate queries: the vault holds gold and silver, so a trade posts to
// /api/{metal}/buy | /api/{metal}/sell with a `grams` weight of that metal.
// Both sides invalidate ["wallet"] and ["transactions"] — a trade moves cash
// *and* metal, and lands a row in the ledger.

function useTrade(metal: Metal, side: "buy" | "sell") {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (grams: number) => api.post(`/api/${metal}/${side}`, { grams }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useBuyMetal(metal: Metal) {
  return useTrade(metal, "buy");
}

export function useSellMetal(metal: Metal) {
  return useTrade(metal, "sell");
}

/** Gold-only convenience wrappers — see the shared mutation above. */
export function useBuyGold() {
  return useBuyMetal("gold");
}

export function useSellGold() {
  return useSellMetal("gold");
}
