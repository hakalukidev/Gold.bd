"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { PublicUser } from "@/types";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<PublicUser>("/api/auth/me"),
    retry: false,
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/api/auth/logout"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  });
}
