"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { giftCoinApi, giftCoinAdminApi, type CreateGiftCoinOrderInput, type GiftCoinQueueItem } from "@/lib/gift-coin-api";
import { getAccessToken } from "@/lib/session";

export function useCreateGiftCoinOrder() {
  return useMutation({
    mutationFn: (input: CreateGiftCoinOrderInput) => {
      const accessToken = getAccessToken();
      if (!accessToken) throw new Error("Sign in to request a printed coin");
      return giftCoinApi.create(input, accessToken);
    },
  });
}

/** Admin queue of pending "print this photo on the coin" requests. */
export function useGiftCoinQueue(status: "PENDING" | "FULFILLED" = "PENDING") {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  useEffect(() => {
    setAccessToken(getAccessToken());
  }, []);

  return useQuery({
    queryKey: ["admin-gift-coins", status],
    queryFn: () => giftCoinAdminApi.list(status, accessToken!),
    enabled: !!accessToken,
  });
}

export function useFulfillGiftCoin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      const accessToken = getAccessToken();
      if (!accessToken) throw new Error("Sign in as an admin to update this order");
      return giftCoinAdminApi.fulfill(id, accessToken);
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["admin-gift-coins"] });
      queryClient.setQueryData<GiftCoinQueueItem[]>(["admin-gift-coins", "PENDING"], (prev) =>
        prev?.filter((item) => item.id !== id)
      );
    },
  });
}
