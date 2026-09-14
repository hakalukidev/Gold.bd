import { api } from "@/lib/api-client";

/** The backend lives in ../../server, not behind this app's own /api routes
 * (see wallet-auth-api.ts) — gift-coin calls talk to its gift module directly. */
const WALLET_API_URL = process.env.NEXT_PUBLIC_WALLET_API_URL ?? "http://localhost:5000";

export interface GiftCoinOrder {
  id: string;
  occasion: string | null;
  status: "PENDING" | "FULFILLED";
  createdAt: string;
  fulfilledAt: string | null;
}

export interface GiftCoinQueueItem extends GiftCoinOrder {
  senderName: string | null;
  senderPhone: string | null;
  recipientName: string | null;
  recipientPhone: string | null;
}

export interface CreateGiftCoinOrderInput {
  ledgerEntryId: string;
  occasion?: string;
  photo: File;
}

/** Never a public URL — the server only streams this to an admin. */
export function giftCoinPhotoUrl(orderId: string) {
  return `${WALLET_API_URL}/api/admin/gift-coins/${orderId}/photo`;
}

export const giftCoinApi = {
  create: (input: CreateGiftCoinOrderInput, accessToken: string) => {
    const formData = new FormData();
    formData.set("ledgerEntryId", input.ledgerEntryId);
    if (input.occasion) formData.set("occasion", input.occasion);
    formData.set("photo", input.photo);
    return api.postForm<GiftCoinOrder>(`${WALLET_API_URL}/api/gift-coins`, formData, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },
};

export const giftCoinAdminApi = {
  list: (status: "PENDING" | "FULFILLED", accessToken: string) =>
    api.get<GiftCoinQueueItem[]>(`${WALLET_API_URL}/api/admin/gift-coins?status=${status}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  fulfill: (id: string, accessToken: string) =>
    api.post<GiftCoinOrder>(`${WALLET_API_URL}/api/admin/gift-coins/${id}/fulfill`, undefined, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
};
