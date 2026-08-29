"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { SiteSettings } from "@/types";
import type { SiteSettingsInput } from "@/lib/validations/settings";

/** Public read — the footer uses this to show whichever fields are set. */
export function useSiteSettings() {
  return useQuery({
    queryKey: ["site-settings"],
    queryFn: () => api.get<SiteSettings>("/api/settings"),
    staleTime: 60_000,
  });
}

/** Admin write — the settings page uses this to update them. */
export function useUpdateSiteSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: SiteSettingsInput) => api.post<SiteSettings>("/api/admin/settings", values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
    },
  });
}
