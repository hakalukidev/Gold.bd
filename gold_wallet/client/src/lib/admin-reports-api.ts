import { api } from "@/lib/api-client";

const WALLET_API_URL = process.env.NEXT_PUBLIC_WALLET_API_URL ?? "http://localhost:5000";

export interface DailyTradeBucket {
  date: string;
  buyGoldGrams: string;
  buyGoldBDT: string;
  sellGoldGrams: string;
  sellGoldBDT: string;
  buySilverGrams: string;
  buySilverBDT: string;
  sellSilverGrams: string;
  sellSilverBDT: string;
  buyCount: number;
  sellCount: number;
}

export interface AdminDashboard {
  userCount: number;
  pendingKycCount: number;
  pendingGiftCoinCount: number;
  pendingCollectCount: number;
  last30Days: { buyGoldBDT: string; sellGoldBDT: string; buySilverBDT: string; sellSilverBDT: string };
  dailyTrades: DailyTradeBucket[];
}

export interface AdminUser {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  role: "USER" | "ADMIN";
  kycStatus: string;
  createdAt: string;
}

export const adminReportsApi = {
  getDashboard: (accessToken: string) =>
    api.get<AdminDashboard>(`${WALLET_API_URL}/api/admin/dashboard`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  getTrades: (accessToken: string, params?: { from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    if (params?.from) qs.set("from", params.from);
    if (params?.to) qs.set("to", params.to);
    const query = qs.toString();
    return api.get<DailyTradeBucket[]>(`${WALLET_API_URL}/api/admin/reports/trades${query ? `?${query}` : ""}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },
  getUsers: (accessToken: string, params?: { search?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    const query = qs.toString();
    return api.get<AdminUser[]>(`${WALLET_API_URL}/api/admin/users${query ? `?${query}` : ""}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },
};
