import { api } from "@/lib/api-client";
import type { SubmitKycInput, ReviewKycInput } from "@/lib/validations/kyc";

/** The backend lives in ../../server, not behind this app's own /api routes
 * (see wallet-auth-api.ts) — KYC calls talk to its kyc module directly. */
const WALLET_API_URL = process.env.NEXT_PUBLIC_WALLET_API_URL ?? "http://localhost:5000";

export interface KycProfile {
  id: string;
  /** Already masked server-side (e.g. "•••••••••0123") — the plaintext NID
   * never leaves wallet_server past the owning request. */
  nidNumber: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectReason: string | null;
}

export interface KycQueueItem extends KycProfile {
  fullName: string;
  phone: string | null;
  submittedAt: string;
}

export type DocumentField = "nidFront" | "nidBack" | "selfie";

/** Documents are never public — this only builds the URL; fetching it still
 * needs the caller's own Authorization header (see use-secure-image.ts),
 * same as every other authenticated wallet_server call. */
export function kycDocumentUrl(kycId: string, field: DocumentField) {
  return `${WALLET_API_URL}/api/kyc/documents/${kycId}/${field}`;
}

export const kycApi = {
  getStatus: (accessToken: string) =>
    api.get<KycProfile | null>(`${WALLET_API_URL}/api/kyc`, { headers: { Authorization: `Bearer ${accessToken}` } }),

  submit: (input: SubmitKycInput, accessToken: string) => {
    const formData = new FormData();
    formData.set("fullName", input.fullName);
    if (input.dob) formData.set("dob", input.dob);
    formData.set("nidNumber", input.nidNumber);
    formData.set("nidFront", input.nidFront);
    formData.set("nidBack", input.nidBack);
    formData.set("selfie", input.selfie);
    return api.postForm<KycProfile>(`${WALLET_API_URL}/api/kyc`, formData, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },
};

export const kycAdminApi = {
  list: (status: "PENDING" | "APPROVED" | "REJECTED", accessToken: string) =>
    api.get<KycQueueItem[]>(`${WALLET_API_URL}/api/admin/kyc?status=${status}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),

  review: (id: string, input: ReviewKycInput, accessToken: string) =>
    api.post<KycProfile>(`${WALLET_API_URL}/api/admin/kyc/${id}/review`, input, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
};
