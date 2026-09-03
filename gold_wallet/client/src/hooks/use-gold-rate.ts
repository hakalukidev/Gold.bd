"use client";

import { useMetalRate } from "@/hooks/use-metal-rate";

/** Gold-only convenience wrapper — see use-metal-rate.ts for the shared query. */
export function useGoldRate() {
  return useMetalRate("gold");
}
