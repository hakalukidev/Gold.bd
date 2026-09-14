"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { giftApi, type SendGiftInput } from "@/lib/gift-api";
import { getAccessToken } from "@/lib/session";

export function useSendGift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SendGiftInput) => {
      const accessToken = getAccessToken();
      if (!accessToken) throw new Error("Sign in to send a gift");
      return giftApi.send(input, accessToken);
    },
    onSuccess: () => {
      // Debits the sender's own gold/silver balance immediately — same
      // invalidation pair use-transactions.ts's fix relies on, so the wallet
      // page's balance and Money flow chart don't need a manual refresh.
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}
