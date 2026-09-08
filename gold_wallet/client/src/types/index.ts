export type UserRole = "USER" | "ADMIN";

export type KycStatus = "NOT_SUBMITTED" | "PENDING" | "APPROVED" | "REJECTED";

export interface PublicUser {
  id: string;
  phone: string;
  email: string | null;
  fullName: string;
  role: UserRole;
  kycStatus: KycStatus;
  createdAt: string;
}

export interface WalletSummary {
  cashBalanceBDT: string; // decimal serialized as string to avoid float precision loss over the wire
  goldBalanceGrams: string;
  silverBalanceGrams: string; // the vault holds both metals; same string-decimal contract as gold
}

export type TransactionType = "BUY" | "SELL" | "DEPOSIT" | "WITHDRAW";
export type TransactionStatus = "PENDING" | "COMPLETED" | "FAILED";

export interface TransactionSummary {
  id: string;
  type: TransactionType;
  /** Which metal a BUY/SELL moved — null for a cash-only DEPOSIT/WITHDRAW. */
  metal: "gold" | "silver" | null;
  status: TransactionStatus;
  goldGrams: string | null;
  silverGrams: string | null;
  pricePerGramBDT: string | null;
  totalAmountBDT: string;
  createdAt: string;
}

/** BAJUS's four published grades — see wallet_server's metal_rates table. */
export type Karat = "22k" | "21k" | "18k" | "sonaton";

export interface GoldRateSummary {
  pricePerGramBDT: string;
  effectiveAt: string;
  /** The real BAJUS-reported grade — always 22K (the platform's anchor) when
   * the request didn't pass `?karat=`. */
  karat?: Karat;
  pricePerBhoriBDT?: string;
  /** When BAJUS itself last updated this published figure (their own
   * `last_updated`) — how stale BAJUS's number is, not when wallet_server
   * last talked to them. Distinct from `effectiveAt`, which is the calendar
   * day the reading is for. Use `syncedAt` for "did we just poll BAJUS". */
  reportedAt?: string;
  /** When wallet_server actually last pulled from BAJUS — the cron job's
   * last tick, or a "sync now" click, whichever ran most recently. This is
   * what "synced Xh ago" should be measured against, since BAJUS's own
   * `reportedAt` can sit unchanged for hours between real BAJUS updates even
   * though we successfully re-polled them in the meantime. */
  syncedAt?: string | null;
}

/** Gold and silver rates cross the wire in the same shape. */
export type MetalRateSummary = GoldRateSummary;

/** Live BDT-per-unit FX quotes for the wallet's currency-conversion card (see
 * wallet_server's fx-sync.job.js). Keyed the same as ForeignCurrency in
 * lib/mock-rates.ts, which is also the shape's fallback while this hasn't
 * loaded yet. */
export interface FxRates {
  base: "BDT";
  ratesPerUnit: Record<"USD" | "EUR" | "GBP" | "SAR", number>;
  /** When wallet_server last actually polled the FX feed — null only in the
   * sliver of time before its very first poll (at process boot) has landed. */
  syncedAt: string | null;
}

/** Public-facing business details and social links shown in the footer —
 * set from the admin settings/footer pages. Blank fields mean "not set yet";
 * the footer hides them rather than showing an empty label/icon. */
export interface SiteSettings {
  address: string;
  bin: string;
  phone: string;
  email: string;
  tradeLicense: string;
  dbid: string;
  facebookUrl: string;
  instagramUrl: string;
  linkedinUrl: string;
  youtubeUrl: string;
}

/** SSLCommerz payment session state — see wallet_server's payments module,
 * the single gateway integration this app and gold_commerce both use. */
export type PaymentStatus = "PENDING" | "VALID" | "FAILED" | "CANCELLED";

export interface PaymentInitResponse {
  tranId: string;
  /** SSLCommerz's hosted checkout page — redirect the browser here. */
  gatewayUrl: string;
}

export interface PaymentStatusResponse {
  tranId: string;
  purpose: "order" | "deposit";
  status: PaymentStatus;
  amountBDT: string;
  currency: string;
  metadata: Record<string, unknown>;
}

/** Admin-editable trade fee/tax settings (see wallet_server's
 * platform-settings.repository.js) — the authoritative values a buy/sell is
 * actually priced with, not just a display constant. */
export interface PlatformFeeSettings {
  transactionChargeRate: number;
  govtGoldTaxPerBhoriBdt: number;
  sellSpreadRate: number;
  updatedAt: string | null;
}

/** Standard envelope returned by every /api/* route. */
export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };
