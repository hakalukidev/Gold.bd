import type { AboutStats } from "@/types";

/**
 * Stand-in for a real stats table until a backend exists — same in-memory
 * module-state approach as mock-settings.ts. Every value starts at 0 on
 * purpose: these are real trust-building numbers (customers, vaulted metal,
 * insured coverage), not placeholders, so the About section only shows a
 * figure once an admin sets it from /admin/settings.
 */
let stats: AboutStats = {
  customers: 0,
  metalVaultedKg: 0,
  insuredPercent: 0,
};

export function getAboutStats(): AboutStats {
  return stats;
}

export function updateAboutStats(patch: Partial<AboutStats>): AboutStats {
  stats = { ...stats, ...patch };
  return stats;
}
