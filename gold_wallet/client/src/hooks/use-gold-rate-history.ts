"use client";

import { useMetalRateHistory } from "@/hooks/use-metal-rate";

/** Gold-only convenience wrapper — see use-metal-rate.ts for the shared query. */
export function useGoldRateHistory() {
  return useMetalRateHistory("gold");
}
