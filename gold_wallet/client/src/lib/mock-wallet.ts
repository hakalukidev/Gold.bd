import type { WalletSummary } from "@/types";

/**
 * Stand-in for the signed-in user's wallet until a backend exists (this app
 * is the frontend on its own — there is no `/api/wallet` behind it), mirroring
 * mock-user.ts. A fresh account, not illustrative demo figures — every
 * balance starts at zero rather than a placeholder holding.
 */
export const MOCK_WALLET: WalletSummary = {
  cashBalanceBDT: "0.00",
  goldBalanceGrams: "0.000",
  silverBalanceGrams: "0.000",
};

/**
 * How the vaulted gold splits across karat grades, as shares of the balance
 * (the parts always add up to the gold the
 * account actually holds). Proportions mirror the SKU breakdown vault-panel.tsx
 * shows; there's no per-bar purity field on WalletSummary to read this from.
 */
export const MOCK_PURITY_MIX: { label: string; share: number; color: string }[] = [
  { label: "22K", share: 0.708, color: "#f4c64e" },
  { label: "21K", share: 0.175, color: "#c9992e" },
  { label: "18K", share: 0.117, color: "#8c7340" },
];

/** Same idea for the vaulted silver, graded by fineness instead of karat —
 * mostly 999 fine bullion with a sterling remainder. */
export const MOCK_SILVER_PURITY_MIX: { label: string; share: number; color: string }[] = [
  { label: "999", share: 0.72, color: "#dfe4ea" },
  { label: "925", share: 0.28, color: "#98a1ac" },
];
