import { Building2, Smartphone, Wallet as WalletIcon, type LucideIcon } from "lucide-react";
import type { ProductForm } from "@/lib/products";
import type { Metal } from "@/lib/mock-rates";

/**
 * The bars and coins the vault can be traded in, shared by the Market page's
 * trade card and the dedicated buy-gold / sell-gold panels so all three price
 * the same SKU the same way.
 *
 * The platform anchors on the real 22K rate per metal (see rate.controller.js
 * on the server — BAJUS doesn't publish a 24K/"fine" figure to back-solve
 * from), so a SKU's per-gram price is that anchor times a purity ratio, then
 * the minting premium the form carries. A 24K gold coin's ratio over the
 * anchor is real purity math (both are fractions of pure gold); silver has no
 * karat system in reality, so its SKUs just price 1:1 off the anchor instead
 * of inventing one. Same model products.ts uses for the physical catalog,
 * just per gram rather than per finished piece.
 */

export interface TradeProduct {
  key: string;
  label: string;
  metal: Metal;
  /** Bar or coin — indexes into products.ts's PRODUCT_IMAGES for the SKU's photo. */
  form: ProductForm;
  /** Fraction over the platform's 22K/anchor rate — 1 for a SKU minted at the
   * anchor grade itself. */
  purity: number;
  /** Certification line shown beside the live price. */
  purityNote: string;
  /** Minting/making charge over the anchor rate — coins are struck, bars are cast. */
  premium: number;
  /** Reads inside "≈ 0.2288 g of {unitNoun}". */
  unitNoun: string;
  /** Used where the metal is already established by a nearby toggle, so the
   * chip only has to name the form and purity. */
  shortLabel: string;
}

/** Coins carry a striking premium a cast bar doesn't. */
const COIN_PREMIUM = 0.025;
// 24K over the 22K anchor is a real purity ratio (both are fractions of pure
// gold) — there's no silver equivalent, so every silver SKU below prices 1:1.
const PURITY_24K_OVER_22K = 24 / 22;

export const TRADE_PRODUCTS: TradeProduct[] = [
  {
    key: "gold-bar-22k",
    shortLabel: "Bar 22K",
    label: "Gold Bar (22K)",
    metal: "gold",
    form: "bar",
    purity: 1,
    purityNote: "22K Hallmarked & Certified",
    premium: 0,
    unitNoun: "22K gold bar",
  },
  {
    key: "gold-coin-22k",
    shortLabel: "Coin 22K",
    label: "Gold Coin (22K)",
    metal: "gold",
    form: "coin",
    purity: 1,
    purityNote: "22K Hallmarked & Certified",
    premium: COIN_PREMIUM,
    unitNoun: "22K gold coin",
  },
  {
    key: "gold-coin-24k",
    shortLabel: "Coin 24K",
    label: "Gold Coin (24K)",
    metal: "gold",
    form: "coin",
    purity: PURITY_24K_OVER_22K,
    purityNote: "24K Fine Gold, Hallmarked",
    premium: COIN_PREMIUM,
    unitNoun: "24K gold coin",
  },
  {
    key: "silver-bar-999",
    shortLabel: "Bar 999",
    label: "Silver Bar (999)",
    metal: "silver",
    form: "bar",
    purity: 1,
    purityNote: "999 Fine Silver, Hallmarked",
    premium: 0,
    unitNoun: "999 silver bar",
  },
  {
    key: "silver-coin-999",
    shortLabel: "Coin 999",
    label: "Silver Coin (999)",
    metal: "silver",
    form: "coin",
    purity: 1,
    purityNote: "999 Fine Silver, Hallmarked",
    premium: COIN_PREMIUM,
    unitNoun: "999 silver coin",
  },
];

/** What a gram of this SKU actually sells at: the 22K/anchor rate → purity → + premium. */
export function productPricePerGram(pricePerGram22k: number | null, product: TradeProduct): number | null {
  return pricePerGram22k === null ? null : pricePerGram22k * product.purity * (1 + product.premium);
}

/** Sell side quotes the metal's real 22K anchor rate, not a minted SKU price —
 * there's one gold balance and one silver balance, so a sale is priced off it. */
export const METAL_LABEL: Record<Metal, string> = { gold: "Gold", silver: "Silver" };

// Translation keys for METAL_LABEL above, for UI surfaces migrated to
// useTranslation() — resolve with t(METAL_LABEL_KEY[metal]).
export const METAL_LABEL_KEY: Record<Metal, string> = {
  gold: "common.metal.gold",
  silver: "common.metal.silver",
};

export const METALS: Metal[] = ["gold", "silver"];

export const AMOUNT_PRESETS = [500, 1000, 2500, 5000, 10000];

/**
 * Buying is funded from the cash wallet only — the gateways below top the
 * wallet up (see the wallet page's Add money flow), they don't settle a trade.
 * Sell payouts do offer a choice, but only the wallet is wired to anything in
 * this repo (see CLAUDE.md); the other two are gateway integrations with no
 * backend, so they're shown for parity and marked "Soon".
 */
export const PAYOUT_METHODS: { key: string; label: string; icon: LucideIcon; enabled: boolean; note: string }[] = [
  { key: "goldbd-wallet", label: "Gold.bd Wallet", icon: WalletIcon, enabled: true, note: "Cash is credited to your wallet instantly." },
  { key: "mobile-wallet", label: "Mobile Wallet", icon: Smartphone, enabled: false, note: "Cash arrives in 3 working days." },
  { key: "bank-account", label: "Bank Account", icon: Building2, enabled: false, note: "Cash arrives in 3 working days." },
];
