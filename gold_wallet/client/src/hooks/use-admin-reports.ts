"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminReportsApi } from "@/lib/admin-reports-api";
import { getAccessToken } from "@/lib/session";

export function useAdminDashboard() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  useEffect(() => {
    setAccessToken(getAccessToken());
  }, []);

  return useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => adminReportsApi.getDashboard(accessToken!),
    enabled: !!accessToken,
  });
}

export function useAdminTrades(params?: { from?: string; to?: string }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  useEffect(() => {
    setAccessToken(getAccessToken());
  }, []);

  return useQuery({
    queryKey: ["admin-trades", params],
    queryFn: () => adminReportsApi.getTrades(accessToken!, params),
    enabled: !!accessToken,
  });
}

export function useAdminUsers(search?: string) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  useEffect(() => {
    setAccessToken(getAccessToken());
  }, []);

  return useQuery({
    queryKey: ["admin-users", search],
    queryFn: () => adminReportsApi.getUsers(accessToken!, { search, limit: 100 }),
    enabled: !!accessToken,
  });
}
