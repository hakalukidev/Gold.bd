"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

/**
 * The "sync now" button behind GoldRatePill — forces the same BAJUS pull the
 * server's cron job runs (see rate.controller.js), then refetches every rate
 * query so the new reading (and "last synced" time) shows up immediately
 * instead of waiting for the next 30s poll.
 */
export function useSyncRates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ syncedAt: string | null }>("/api/rates/sync"),
    onSuccess: () => {
      for (const key of ["gold-rate", "silver-rate", "gold-rate-history", "silver-rate-history"]) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
  });
}
