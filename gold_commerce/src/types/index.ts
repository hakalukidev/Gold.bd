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

/** BAJUS's four published grades — see src/lib/rate-store.ts, this app's own
 * scraped cache (independent of gold_wallet/server's own metal_rates table). */
export type Karat = "22k" | "21k" | "18k" | "sonaton";

export interface GoldRateSummary {
  pricePerGramBDT: string;
  effectiveAt: string;
  /** The real BAJUS-reported grade — always 22K (the platform's anchor) when
   * the request didn't pass `?karat=`. */
  karat?: Karat;
  pricePerBhoriBDT?: string;
  /** "manual" means an admin overrode this grade from /admin/rates rather
   * than it coming straight off today's bajus.org sync. */
  source?: "bajus" | "manual";
}

/** Gold and silver rates cross the wire in the same shape. */
export type MetalRateSummary = GoldRateSummary;

/** One row in the admin "Rate history" table — a manually-set rate, spanning
 * both metals. See POST/GET /api/admin/rates. */
export interface AdminRateEntry {
  metal: "gold" | "silver";
  karat: Karat;
  pricePerGramBDT: string;
  pricePerBhoriBDT: string;
  effectiveAt: string;
}

/** Public-facing business details and social links shown in the footer —
 * set from the admin settings page. Blank fields mean "not set yet";
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

/** The "About" section's trust stats (customers, vaulted metal, insured
 * coverage), set from the admin stats page. Every field starts at 0 until an
 * admin sets a real figure — see mock-stats.ts. */
export interface AboutStats {
  customers: number;
  metalVaultedKg: number;
  insuredPercent: number;
}

/** SSLCommerz payment session state — see wallet_server's payments module,
 * the single gateway integration this site and gold_wallet/client both use. */
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

/** Manual (bKash/Nagad/bank) checkout payments — reviewed by hand from the
 * admin panel rather than confirmed by a gateway callback. See
 * src/lib/payments/proof-storage.ts for the bank method's proof image. */
export type ManualPaymentMethod = "bkash" | "nagad" | "bank";
export type ManualPaymentStatus = "PENDING" | "APPROVED" | "DECLINED";

export interface ManualPaymentInitResponse {
  id: string;
  orderId: string;
}

export interface ManualPaymentStatusResponse {
  id: string;
  orderId: string;
  method: ManualPaymentMethod;
  status: ManualPaymentStatus;
  amountBDT: string;
  declineReason: string | null;
}

export interface AdminManualPayment {
  id: string;
  orderId: string;
  method: ManualPaymentMethod;
  status: ManualPaymentStatus;
  amountBDT: string;
  currency: string;
  customerName: string;
  customerPhone: string;
  senderNumber: string | null;
  transactionId: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  bankName: string | null;
  bankBranch: string | null;
  hasProofImage: boolean;
  declineReason: string | null;
  createdAt: string;
}

/** Admin-configured receiving-account details shown to shoppers in the
 * checkout modals — set from /admin/payment-settings. */
export interface BkashNagadDetails {
  receiverNumber: string;
}

export interface BankDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch: string;
}

export interface PaymentMethodSettings {
  bkash: Partial<BkashNagadDetails>;
  nagad: Partial<BkashNagadDetails>;
  bank: Partial<BankDetails>;
}

/** Standard envelope returned by every /api/* route. */
export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };
