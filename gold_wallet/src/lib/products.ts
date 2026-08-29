import type { Metal } from "@/hooks/use-metal-rate";

/**
 * The gold/silver bar-and-coin catalog — shared between the homepage's
 * featured-products section and the full `/products` catalog page so the
 * two can't drift apart (same SKUs, same images, same pricing model).
 */

export type ProductForm = "bar" | "coin";

export const PRODUCT_IMAGES: Record<Metal, Record<ProductForm, string>> = {
  gold: { bar: "/products/gold-bar.webp", coin: "/products/gold-coin.webp" },
  silver: { bar: "/products/silver-bar.webp", coin: "/products/silver-coin.webp" },
};

// The platform only tracks one admin-set rate (fine gold/silver price per
// gram) per metal — 22K, the karat these bars/coins are minted/struck at, is
// derived from it by purity ratio.
export const PURITY_22K = 22 / 24;

// Smaller denominations carry a heavier minting/making-charge premium over
// the spot rate, narrowing as weight goes up — mirrors how real bar/coin
// pricing works rather than a flat markup across every size.
export const PRODUCT_WEIGHTS = [
  { grams: 0.5, premium: 0.09, key: "weight0_5" },
  { grams: 1, premium: 0.065, key: "weight1" },
  { grams: 5, premium: 0.045, key: "weight5" },
  { grams: 10, premium: 0.03, key: "weight10" },
] as const satisfies readonly { grams: number; premium: number; key: string }[];

export type ProductWeight = (typeof PRODUCT_WEIGHTS)[number];

/** The per-gram price a SKU actually sells at: fine rate → 22K → + this weight's premium. */
export function effectivePricePerGram(fine22kPerGram: number | null, weight: ProductWeight): number | null {
  return fine22kPerGram !== null ? fine22kPerGram * (1 + weight.premium) : null;
}
