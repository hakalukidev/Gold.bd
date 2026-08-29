"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Metal } from "@/lib/mock-rates";
import type { MetalRateSummary } from "@/types";

export type { Metal };

// Query keys stay `["gold-rate"]` / `["gold-rate-history"]` for gold so the
// admin rates page's existing invalidation keeps working, and so both metals
// share one cache entry per metal rather than refetching on every toggle.

export function useMetalRate(metal: Metal) {
  return useQuery({
    queryKey: [`${metal}-rate`],
    queryFn: () => api.get<MetalRateSummary>(`/api/${metal}/rate`),
    refetchInterval: 30_000,
  });
}

export function useMetalRateHistory(metal: Metal) {
  return useQuery({
    queryKey: [`${metal}-rate-history`],
    queryFn: () => api.get<MetalRateSummary[]>(`/api/${metal}/rate-history`),
    staleTime: 60_000,
  });
}
