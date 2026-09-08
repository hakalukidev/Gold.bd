import { ArrowDownRight, ArrowDownToLine, ArrowUpFromLine, ArrowUpRight, type LucideIcon } from "lucide-react";
import type { TransactionStatus, TransactionType } from "@/types";

// Cash-flow direction per transaction type — deposits and sell payouts add
// to the wallet, buys and withdrawals draw it down. Shared by the wallet
// activity feed and the History page so the two can't drift apart.
export const CREDIT_TYPES: TransactionType[] = ["DEPOSIT", "SELL"];

export const TYPE_ICON: Record<TransactionType, LucideIcon> = {
  BUY: ArrowUpRight,
  SELL: ArrowDownRight,
  DEPOSIT: ArrowDownToLine,
  WITHDRAW: ArrowUpFromLine,
};

export const TYPE_LABEL: Record<TransactionType, string> = {
  BUY: "Bought Gold",
  SELL: "Sold Gold",
  DEPOSIT: "Added to wallet",
  WITHDRAW: "Withdrawn from wallet",
};

// Dictionary keys for TYPE_LABEL above — for UI surfaces that render through
// useTranslation() rather than plain-English exports (see transaction-export.ts,
// which stays English-only since a downloaded file has no live locale).
export const TYPE_LABEL_KEY: Record<TransactionType, string> = {
  BUY: "common.transactionType.buy",
  SELL: "common.transactionType.sell",
  DEPOSIT: "common.transactionType.deposit",
  WITHDRAW: "common.transactionType.withdraw",
};

export const STATUS_LABEL_KEY: Record<TransactionStatus, string> = {
  PENDING: "common.status.pending",
  COMPLETED: "common.status.completed",
  FAILED: "common.status.failed",
};
