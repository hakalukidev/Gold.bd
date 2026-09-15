import { z } from "zod";

export const aboutStatsSchema = z.object({
  customers: z.number().min(0, "Must be 0 or more"),
  metalVaultedKg: z.number().min(0, "Must be 0 or more"),
  insuredPercent: z.number().min(0, "Must be 0 or more").max(100, "Can't exceed 100%"),
});
export type AboutStatsInput = z.infer<typeof aboutStatsSchema>;
