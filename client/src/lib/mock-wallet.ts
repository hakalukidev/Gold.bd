import type { WalletSummary } from "@/types";

/**
 * Stand-in for the signed-in user's wallet until a backend exists (see
 * CLAUDE.md — this repo has no `/api/wallet` of its own), mirroring
 * mock-user.ts / mock-rates.ts. Illustrative demo figures, not a real balance.
 */
export const MOCK_WALLET: WalletSummary = {
  cashBalanceBDT: "4250.00",
  goldBalanceGrams: "12.500",
  silverBalanceGrams: "185.000",
};

/**
 * 12 months of wallet cash-flow for the money-flow chart, oldest first (the
 * last entry is the current month). A real deployment would aggregate this
 * server-side from the transaction ledger — `buildMonthlyFlow()` in
 * wallet-flow.ts does exactly that whenever the feed actually spans more than
 * one month, and only falls back to these demo figures when it doesn't.
 */
export const MOCK_MONTHLY_FLOW: { inBDT: number; outBDT: number }[] = [
  { inBDT: 28500, outBDT: 21400 },
  { inBDT: 31200, outBDT: 26800 },
  { inBDT: 26900, outBDT: 24100 },
  { inBDT: 38400, outBDT: 22600 },
  { inBDT: 35100, outBDT: 30900 },
  { inBDT: 42800, outBDT: 27300 },
  { inBDT: 39600, outBDT: 34200 },
  { inBDT: 47300, outBDT: 29800 },
  { inBDT: 44100, outBDT: 38700 },
  { inBDT: 52600, outBDT: 33400 },
  { inBDT: 48900, outBDT: 41200 },
  { inBDT: 56200, outBDT: 39550 },
];

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
