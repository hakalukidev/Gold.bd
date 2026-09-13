import { api } from "@/lib/api-client";
import type { CollectInput } from "@/lib/validations/collect";

/** The backend lives in ../../server, not behind this app's own /api routes
 * (see wallet-auth-api.ts) — collect calls talk to its collect module directly. */
const WALLET_API_URL = process.env.NEXT_PUBLIC_WALLET_API_URL ?? "http://localhost:5000";

export interface CollectOrder {
  id: string;
  weightGrams: string;
  metal: "gold" | "silver";
  form: "bar" | "coin";
  method: "home" | "pickup";
  deliveryFeeBDT: string;
  status: "PENDING" | "APPROVED";
  createdAt: string;
}

export interface CollectQueueItem extends CollectOrder {
  address: { fullName: string; phone: string; district: string; postalCode: string; streetAddress: string } | null;
  requesterName: string | null;
  requesterPhone: string | null;
}

export const collectApi = {
  request: (input: CollectInput, accessToken: string) =>
    api.post<CollectOrder>(`${WALLET_API_URL}/api/collect`, input, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
};

export const collectAdminApi = {
  list: (status: "PENDING" | "APPROVED", accessToken: string) =>
    api.get<CollectQueueItem[]>(`${WALLET_API_URL}/api/admin/collect?status=${status}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  approve: (id: string, accessToken: string) =>
    api.post<CollectOrder>(`${WALLET_API_URL}/api/admin/collect/${id}/approve`, undefined, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
};
