"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { VisitorStats } from "@/lib/mock-visitors";

export function useVisitorStats() {
  return useQuery({
    queryKey: ["admin-visitor-stats"],
    queryFn: () => api.get<VisitorStats>("/api/admin/visits"),
    refetchInterval: 30_000,
  });
}
