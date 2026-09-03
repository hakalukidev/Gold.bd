import { Building2, Smartphone, Wallet as WalletIcon, type LucideIcon } from "lucide-react";
import { PURITY_22K, type ProductForm } from "@/lib/products";
import type { Metal } from "@/lib/mock-rates";

/**
 * The bars and coins the vault can be traded in, shared by the Market page's
 * trade card and the dedicated buy-gold / sell-gold panels so all three price
 * the same SKU the same way.
 *
 * The platform tracks one admin-set *fine* rate per metal (24K gold / 999
 * silver — see mock-rates.ts), so a SKU's per-gram price is derived from it by
 * purity and then by the minting premium the form carries. Same model
 * products.ts uses for the physical catalog, just per gram rather than per
 * finished piece.
 */

export interface TradeProduct {
  key: string;
  label: string;
  metal: Metal;
  /** Bar or coin — indexes into products.ts's PRODUCT_IMAGES for the SKU's photo. */
  form: ProductForm;
  /** Fraction of fine metal: 22/24 for 22K, 0.999 for "999" silver. */
  purity: number;
  /** Certification line shown beside the live price. */
  purityNote: string;
  /** Minting/making charge over the fine rate — coins are struck, bars are cast. */
  premium: number;
  /** Reads inside "≈ 0.2288 g of {unitNoun}". */
  unitNoun: string;
  /** Used where the metal is already established by a nearby toggle, so the
   * chip only has to name the form and purity. */
  shortLabel: string;
}

/** Coins carry a striking premium a cast bar doesn't. */
const COIN_PREMIUM = 0.025;
const PURITY_999 = 0.999;

export const TRADE_PRODUCTS: TradeProduct[] = [
  {
    key: "gold-bar-22k",
    shortLabel: "Bar 22K",
    label: "Gold Bar (22K)",
    metal: "gold",
    form: "bar",
    purity: PURITY_22K,
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
    purity: PURITY_22K,
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
    purity: 1,
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
    purity: PURITY_999,
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
    purity: PURITY_999,
    purityNote: "999 Fine Silver, Hallmarked",
    premium: COIN_PREMIUM,
    unitNoun: "999 silver coin",
  },
];

/** What a gram of this SKU actually sells at: fine rate → purity → + premium. */
export function productPricePerGram(fineRatePerGram: number | null, product: TradeProduct): number | null {
  return fineRatePerGram === null ? null : fineRatePerGram * product.purity * (1 + product.premium);
}

/** Sell side quotes the fine metal in the vault, not a minted SKU — there's one
 * gold balance and one silver balance, so a sale is priced off the fine rate. */
export const METAL_LABEL: Record<Metal, string> = { gold: "Gold", silver: "Silver" };

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
