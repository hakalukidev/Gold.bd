import { z } from "zod";

/** The three karats an admin can manually price — bajus.org's fourth grade
 * ("sonaton"/traditional) has no fixed purity and stays sync-only. */
export const MANUAL_KARATS = ["22k", "21k", "18k"] as const;
export type ManualKarat = (typeof MANUAL_KARATS)[number];

export const setMetalRateSchema = z.object({
  metal: z.enum(["gold", "silver"]),
  karat: z.enum(MANUAL_KARATS),
  // Upper bound is a fat-finger guard, not a real ceiling — this takes
  // effect on the storefront immediately, so a stray extra digit shouldn't
  // be able to publish a ৳1,000,000+/g rate.
  pricePerGramBDT: z.number().positive("Enter a valid price").max(500_000, "That price looks too high — double-check it"),
});
export type SetMetalRateInput = z.infer<typeof setMetalRateSchema>;
