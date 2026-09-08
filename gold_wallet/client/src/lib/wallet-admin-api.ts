import { api } from "@/lib/api-client";
import type { PlatformFeeSettings } from "@/types";

/** Same origin as the rest of the wallet_server calls — see
 * wallet-auth-api.ts for why this needs the absolute URL. */
const WALLET_API_URL = process.env.NEXT_PUBLIC_WALLET_API_URL ?? "http://localhost:5000";

export type UpdateFeeSettingsInput = Partial<
  Pick<PlatformFeeSettings, "transactionChargeRate" | "govtGoldTaxPerBhoriBdt" | "sellSpreadRate">
>;

/** Admin-only trade fee/tax settings — both routes 403 for a non-ADMIN
 * token (see wallet_server's requireAdmin middleware). POST, not PATCH:
 * the server's CORS config only allows GET/POST. */
export const walletAdminApi = {
  getSettings: (accessToken: string) =>
    api.get<PlatformFeeSettings>(`${WALLET_API_URL}/api/admin/settings`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  updateSettings: (data: UpdateFeeSettingsInput, accessToken: string) =>
    api.post<PlatformFeeSettings>(`${WALLET_API_URL}/api/admin/settings`, data, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
};
