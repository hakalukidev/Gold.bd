"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { kycApi, kycAdminApi, type KycQueueItem } from "@/lib/kyc-api";
import type { SubmitKycInput, ReviewKycInput } from "@/lib/validations/kyc";
import { getAccessToken } from "@/lib/session";

/** Same lazy-token-in-an-effect pattern as useMe()/useWallet() — avoids a
 * hydration mismatch between the server render and the client's first paint
 * (getAccessToken reads sessionStorage, which doesn't exist server-side). */
export function useKycStatus() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  useEffect(() => {
    setAccessToken(getAccessToken());
  }, []);

  return useQuery({
    queryKey: ["kyc"],
    queryFn: () => kycApi.getStatus(accessToken!),
    enabled: !!accessToken,
  });
}

export function useSubmitKyc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitKycInput) => {
      const accessToken = getAccessToken();
      if (!accessToken) throw new Error("Sign in to submit your verification");
      return kycApi.submit(input, accessToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kyc"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

/** Admin review queue — 403s for a non-admin token, same as every other
 * admin-only call (see use-admin-settings.ts). */
export function useKycQueue(status: "PENDING" | "APPROVED" | "REJECTED" = "PENDING") {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  useEffect(() => {
    setAccessToken(getAccessToken());
  }, []);

  return useQuery({
    queryKey: ["admin-kyc", status],
    queryFn: () => kycAdminApi.list(status, accessToken!),
    enabled: !!accessToken,
  });
}

export function useReviewKyc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: ReviewKycInput & { id: string }) => {
      const accessToken = getAccessToken();
      if (!accessToken) throw new Error("Sign in as an admin to review submissions");
      return kycAdminApi.review(id, input, accessToken);
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-kyc"] });
      queryClient.setQueryData<KycQueueItem[]>(["admin-kyc", "PENDING"], (prev) => prev?.filter((item) => item.id !== id));
    },
  });
}
