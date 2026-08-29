"use client";

import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { AdminLoginInput } from "@/lib/validations/admin-auth";

export function useAdminLogin() {
  return useMutation({
    mutationFn: (values: AdminLoginInput) => api.post<{ email: string }>("/api/admin/auth/login", values),
  });
}

export function useAdminLogout() {
  return useMutation({
    mutationFn: () => api.post("/api/admin/auth/logout"),
  });
}
