"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { ChargeSettings } from "@/types";

/** The platform charge % and VAT % an admin has set — read-only for the
 * storefront's pricing math. See /admin/rates for where these are set. */
export function useChargeSettings() {
  return useQuery({
    queryKey: ["charge-settings"],
    queryFn: () => api.get<ChargeSettings>("/api/charges"),
    staleTime: 60_000,
  });
}
