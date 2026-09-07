"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Metal } from "@/lib/mock-rates";
import type { Karat, MetalRateSummary } from "@/types";

export type { Metal };

// Query keys stay `["gold-rate"]` / `["gold-rate-history"]` for gold so the
// admin rates page's existing invalidation keeps working, and so both metals
// share one cache entry per metal rather than refetching on every toggle.
// Passing `karat` adds it to the key instead of replacing that shape, so the
// no-karat (22K anchor) query used for holdings/trade math keeps its own
// cache entry, separate from whichever grade the Market page's filter is on.

export function useMetalRate(metal: Metal, karat?: Karat) {
  return useQuery({
    queryKey: karat ? [`${metal}-rate`, karat] : [`${metal}-rate`],
    queryFn: () => api.get<MetalRateSummary>(`/api/${metal}/rate${karat ? `?karat=${karat}` : ""}`),
    refetchInterval: 30_000,
  });
}

export function useMetalRateHistory(metal: Metal, karat?: Karat) {
  return useQuery({
    queryKey: karat ? [`${metal}-rate-history`, karat] : [`${metal}-rate-history`],
    queryFn: () => api.get<MetalRateSummary[]>(`/api/${metal}/rate-history${karat ? `?karat=${karat}` : ""}`),
    staleTime: 60_000,
  });
}
