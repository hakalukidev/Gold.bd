import { api } from "@/lib/api-client";
import type { PublicUser } from "@/types";

/** The backend lives in ../../server (its own Node/Express app, run separately
 * from this Next.js app), not behind this app's own /api routes, so auth
 * calls need its absolute origin. */
const WALLET_API_URL = process.env.NEXT_PUBLIC_WALLET_API_URL ?? "http://localhost:5000";

interface AuthSession {
  user: PublicUser;
  accessToken: string;
}

interface OtpRequested {
  phone: string;
  /** Only present outside production — the backend logs the code instead of
   * texting it, so it hands the code back here for the OTP screen to self-fill. */
  devCode?: string;
}

export const walletAuthApi = {
  register: (data: { fullName: string; phone: string; email?: string; password: string }) =>
    api.post<OtpRequested>(`${WALLET_API_URL}/api/auth/register`, data),
  verifyRegister: (data: { phone: string; code: string }) =>
    api.post<AuthSession>(`${WALLET_API_URL}/api/auth/register/verify`, data),
  login: (data: { phone: string; password: string }) =>
    api.post<OtpRequested>(`${WALLET_API_URL}/api/auth/login`, data),
  verifyLogin: (data: { phone: string; code: string }) =>
    api.post<AuthSession>(`${WALLET_API_URL}/api/auth/login/verify`, data),
  /** Used by the wallet top-up flow (wallet-payments-api.ts) to fill the
   * SSLCommerz customer fields with the real signed-in profile. The server
   * nests the profile as `{ user }`, not a bare PublicUser — unwrap it here so
   * every caller gets the flat shape the type promises. */
  me: (accessToken: string) =>
    api
      .get<{ user: PublicUser }>(`${WALLET_API_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.user),
  /** Revokes the refresh-token cookie server-side. Needs its own absolute
   * origin same as every other call here — a bare relative `/api/auth/logout`
   * (as this used to be) hits Next.js itself, which has no such route, and
   * 404s instead of actually ending the session. */
  logout: () => api.post<null>(`${WALLET_API_URL}/api/auth/logout`),
};
