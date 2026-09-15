"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { AboutStats } from "@/types";
import type { AboutStatsInput } from "@/lib/validations/stats";

/** Public read — the About section uses this for its trust stats. */
export function useAboutStats() {
  return useQuery({
    queryKey: ["about-stats"],
    queryFn: () => api.get<AboutStats>("/api/stats"),
    staleTime: 60_000,
  });
}

/** Admin write — the admin stats page uses this to update them. */
export function useUpdateAboutStats() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: AboutStatsInput) => api.post<AboutStats>("/api/admin/stats", values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["about-stats"] });
    },
  });
}
