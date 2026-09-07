"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { BDT_PER_FOREIGN_UNIT, type ForeignCurrency } from "@/lib/mock-rates";
import type { FxRates } from "@/types";

/**
 * Live BDT-per-unit FX quotes (see wallet_server's fx-sync.job.js, which
 * polls a real feed roughly hourly), falling back to the illustrative
 * BDT_PER_FOREIGN_UNIT constants while the first fetch is in flight or if it
 * ever fails — so the currency card always renders a number, just possibly a
 * stale one, rather than blanking out.
 */
export function useFxRates() {
  const query = useQuery({
    queryKey: ["fx-rates"],
    queryFn: () => api.get<FxRates>("/api/fx/rates"),
    // The feed itself only moves roughly daily; refetching every 5 minutes
    // keeps the card fresh across long-open tabs without hammering the proxy.
    refetchInterval: 5 * 60_000,
    staleTime: 60_000,
  });

  const ratesPerUnit: Record<ForeignCurrency, number> = query.data?.ratesPerUnit ?? BDT_PER_FOREIGN_UNIT;

  return { ratesPerUnit, syncedAt: query.data?.syncedAt ?? null, isLive: !!query.data, ...query };
}
