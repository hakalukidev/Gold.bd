import { z } from "zod";

export const buyGoldSchema = z.object({
  goldGrams: z.number().positive("Enter an amount of gold to buy").max(1000),
});
export type BuyGoldInput = z.infer<typeof buyGoldSchema>;

// Amount-first entry mode for the buy-gold page (BuyGoldPanel) — the user
// types a BDT amount instead of a gram weight; converted to goldGrams (and
// validated against buyGoldSchema) before hitting useBuyGold().
export const buyGoldAmountSchema = z.object({
  amountBDT: z.number().min(500, "Minimum purchase is ৳500").max(5_000_000, "Amount is too large"),
});
export type BuyGoldAmountInput = z.infer<typeof buyGoldAmountSchema>;

export const sellGoldSchema = z.object({
  goldGrams: z.number().positive("Enter an amount of gold to sell").max(1000),
});
export type SellGoldInput = z.infer<typeof sellGoldSchema>;

export const setGoldRateSchema = z.object({
  pricePerGramBDT: z.number().positive("Enter a valid price"),
});
export type SetGoldRateInput = z.infer<typeof setGoldRateSchema>;
