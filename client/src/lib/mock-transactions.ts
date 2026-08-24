import type { TransactionSummary } from "@/types";

/**
 * Stand-in wallet activity until a backend exists (see CLAUDE.md — this repo
 * has no `/api/transactions` of its own), mirroring mock-wallet.ts /
 * mock-user.ts. Illustrative demo rows, not real trades: the prices sit near
 * mock-rates.ts's gold anchor (৳21,839/g) so the feed agrees with the rates
 * shown everywhere else.
 */
const HOUR_MS = 60 * 60 * 1000;

type MockRow = {
  hoursAgo: number;
  type: TransactionSummary["type"];
  status: TransactionSummary["status"];
  goldGrams: string | null;
  pricePerGramBDT: string | null;
  totalAmountBDT: string;
};

const ROWS: MockRow[] = [
  { hoursAgo: 3, type: "DEPOSIT", status: "COMPLETED", goldGrams: null, pricePerGramBDT: null, totalAmountBDT: "5000.00" },
  { hoursAgo: 9, type: "BUY", status: "COMPLETED", goldGrams: "0.220", pricePerGramBDT: "21839.00", totalAmountBDT: "4804.58" },
  { hoursAgo: 27, type: "WITHDRAW", status: "PENDING", goldGrams: null, pricePerGramBDT: null, totalAmountBDT: "2500.00" },
  { hoursAgo: 31, type: "SELL", status: "COMPLETED", goldGrams: "0.150", pricePerGramBDT: "21755.40", totalAmountBDT: "3263.31" },
  { hoursAgo: 54, type: "BUY", status: "COMPLETED", goldGrams: "0.500", pricePerGramBDT: "21690.10", totalAmountBDT: "10845.05" },
  { hoursAgo: 77, type: "DEPOSIT", status: "COMPLETED", goldGrams: null, pricePerGramBDT: null, totalAmountBDT: "10000.00" },
  { hoursAgo: 122, type: "BUY", status: "COMPLETED", goldGrams: "1.000", pricePerGramBDT: "21402.75", totalAmountBDT: "21402.75" },
  { hoursAgo: 171, type: "SELL", status: "COMPLETED", goldGrams: "0.300", pricePerGramBDT: "21188.60", totalAmountBDT: "6356.58" },
  { hoursAgo: 220, type: "DEPOSIT", status: "COMPLETED", goldGrams: null, pricePerGramBDT: null, totalAmountBDT: "25000.00" },
  { hoursAgo: 268, type: "BUY", status: "FAILED", goldGrams: "0.100", pricePerGramBDT: "21050.00", totalAmountBDT: "2105.00" },
];

let cached: TransactionSummary[] | undefined;

/**
 * Newest first, dated relative to now so the feed never looks stale. Timestamps
 * are snapped to the top of the hour so the server and client renders format to
 * the same string (no hydration mismatch), and the result is cached so the list
 * doesn't shift under a refetch.
 */
export function getMockTransactions(): TransactionSummary[] {
  if (cached) return cached;
  const topOfHour = Math.floor(Date.now() / HOUR_MS) * HOUR_MS;

  cached = ROWS.map(({ hoursAgo, ...row }, i) => ({
    id: `demo-txn-${i + 1}`,
    ...row,
    createdAt: new Date(topOfHour - hoursAgo * HOUR_MS).toISOString(),
  }));
  return cached;
}
