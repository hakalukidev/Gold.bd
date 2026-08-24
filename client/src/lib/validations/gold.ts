import { z } from "zod";
import type { Metal } from "@/lib/mock-rates";

/**
 * A trade is a weight of one metal: `/api/{metal}/buy` and `/api/{metal}/sell`
 * both take `{ grams }` (see use-gold-trade.ts). The caps differ by metal
 * because a taka buys ~57x more silver than gold — one shared 1,000 g ceiling
 * would reject silver orders well inside the BDT limit below.
 */
export const MAX_TRADE_GRAMS: Record<Metal, number> = { gold: 1_000, silver: 50_000 };

export function tradeGramsSchema(metal: Metal, side: "buy" | "sell") {
  return z
    .number()
    .positive(`Enter an amount of ${metal} to ${side}`)
    .max(MAX_TRADE_GRAMS[metal], `Maximum ${MAX_TRADE_GRAMS[metal].toLocaleString("en-BD")} g per order`);
}

export const tradeAmountSchema = z
  .number()
  .min(500, "Minimum purchase is ৳500")
  .max(5_000_000, "Amount is too large");

export const buyGoldSchema = z.object({
  goldGrams: tradeGramsSchema("gold", "buy"),
});
export type BuyGoldInput = z.infer<typeof buyGoldSchema>;

// Amount-first entry mode for the buy panels — the user types a BDT amount
// instead of a gram weight; converted to grams (and validated against
// tradeGramsSchema) before hitting useBuyMetal().
export const buyGoldAmountSchema = z.object({
  amountBDT: tradeAmountSchema,
});
export type BuyGoldAmountInput = z.infer<typeof buyGoldAmountSchema>;

export const sellGoldSchema = z.object({
  goldGrams: tradeGramsSchema("gold", "sell"),
});
export type SellGoldInput = z.infer<typeof sellGoldSchema>;

export const setGoldRateSchema = z.object({
  pricePerGramBDT: z.number().positive("Enter a valid price"),
});
export type SetGoldRateInput = z.infer<typeof setGoldRateSchema>;
