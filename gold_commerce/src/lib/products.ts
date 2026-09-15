import type { Metal } from "@/hooks/use-metal-rate";
import type { ChargeSettings } from "@/types";

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

/** The per-gram price a SKU actually sells at: the real 22K anchor rate the
 * platform prices off + this weight's premium, plus the admin-configured
 * platform charge % and VAT % (each computed off that same base and summed
 * on — see /admin/rates). `charges` is optional so callers that haven't
 * loaded them yet (or intentionally want the bare base price) still work. */
export function effectivePricePerGram(pricePerGram22k: number | null, weight: ProductWeight, charges?: ChargeSettings): number | null {
  if (pricePerGram22k === null) return null;
  const base = pricePerGram22k * (1 + weight.premium);
  if (!charges) return base;
  return base * (1 + (charges.platformChargePercent + charges.vatPercent) / 100);
}
