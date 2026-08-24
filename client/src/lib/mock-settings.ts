import type { SiteSettings } from "@/types";

/**
 * Stand-in for a real settings table until a backend exists (see CLAUDE.md —
 * this repo has no `/api/*` implementation of its own beyond these mocks).
 * In-memory module state, mirroring mock-rates.ts's approach: edits made from
 * the admin settings page persist for the life of the dev server process,
 * not across restarts or separate server instances.
 *
 * Every field starts blank on purpose — none of these are placeholder
 * values standing in for a real registered address, registration
 * number, contact detail, or social profile.
 */
let settings: SiteSettings = {
  address: "",
  bin: "",
  phone: "",
  email: "",
  tradeLicense: "",
  dbid: "",
  facebookUrl: "",
  instagramUrl: "",
  linkedinUrl: "",
  youtubeUrl: "",
};

export function getSiteSettings(): SiteSettings {
  return settings;
}

export function updateSiteSettings(patch: Partial<SiteSettings>): SiteSettings {
  settings = { ...settings, ...patch };
  return settings;
}
