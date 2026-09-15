import { z } from "zod";

export const chargeSettingsSchema = z.object({
  platformChargePercent: z.number().min(0, "Can't be negative").max(100, "That's over 100% — double-check it"),
  vatPercent: z.number().min(0, "Can't be negative").max(100, "That's over 100% — double-check it"),
});
export type ChargeSettingsInput = z.infer<typeof chargeSettingsSchema>;
