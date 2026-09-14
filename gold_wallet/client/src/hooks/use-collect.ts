"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { collectApi, collectAdminApi, type CollectQueueItem } from "@/lib/collect-api";
import type { CollectInput } from "@/lib/validations/collect";
import { getAccessToken } from "@/lib/session";

export function useRequestCollect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CollectInput) => {
      const accessToken = getAccessToken();
      if (!accessToken) throw new Error("Sign in to request a delivery");
      return collectApi.request(input, accessToken);
    },
    onSuccess: () => {
      // Debits the gold balance immediately (see collect.service.js) — same
      // invalidation pair the gift/deposit fixes rely on, so the wallet
      // page's balance and Money flow chart update without a manual refresh.
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

/** Admin queue of pending physical delivery/pickup requests. */
export function useCollectQueue(status: "PENDING" | "APPROVED" = "PENDING") {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  useEffect(() => {
    setAccessToken(getAccessToken());
  }, []);

  return useQuery({
    queryKey: ["admin-collect", status],
    queryFn: () => collectAdminApi.list(status, accessToken!),
    enabled: !!accessToken,
  });
}

export function useApproveCollect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      const accessToken = getAccessToken();
      if (!accessToken) throw new Error("Sign in as an admin to approve this order");
      return collectAdminApi.approve(id, accessToken);
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["admin-collect"] });
      queryClient.setQueryData<CollectQueueItem[]>(["admin-collect", "PENDING"], (prev) => prev?.filter((item) => item.id !== id));
    },
  });
}
