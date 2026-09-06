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
  status: TransactionStatus;
  goldGrams: string | null;
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
  /** When wallet_server actually last pulled this reading from BAJUS — the
   * cron job's last tick, or a "sync now" click, whichever ran most recently.
   * Distinct from `effectiveAt`, which is the calendar day the reading is
   * for, not when it was fetched. */
  reportedAt?: string;
}

/** Gold and silver rates cross the wire in the same shape. */
export type MetalRateSummary = GoldRateSummary;

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

/** Standard envelope returned by every /api/* route. */
export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };
