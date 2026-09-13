import { ArrowDownRight, ArrowDownToLine, ArrowUpFromLine, ArrowUpRight, Gift, type LucideIcon } from "lucide-react";
import type { TransactionStatus, TransactionType } from "@/types";

// Cash-flow direction per transaction type — deposits, sell payouts and
// received gifts add to the wallet, buys, withdrawals and sent gifts draw it
// down. Shared by the wallet activity feed and the History page so the two
// can't drift apart.
export const CREDIT_TYPES: TransactionType[] = ["DEPOSIT", "SELL", "GIFT_RECEIVED"];

export const TYPE_ICON: Record<TransactionType, LucideIcon> = {
  BUY: ArrowUpRight,
  SELL: ArrowDownRight,
  DEPOSIT: ArrowDownToLine,
  WITHDRAW: ArrowUpFromLine,
  GIFT_SENT: Gift,
  GIFT_RECEIVED: Gift,
};

export const TYPE_LABEL: Record<TransactionType, string> = {
  BUY: "Bought Gold",
  SELL: "Sold Gold",
  DEPOSIT: "Added to wallet",
  WITHDRAW: "Withdrawn from wallet",
  GIFT_SENT: "Gift sent",
  GIFT_RECEIVED: "Gift received",
};

// Dictionary keys for TYPE_LABEL above — for UI surfaces that render through
// useTranslation() rather than plain-English exports (see transaction-export.ts,
// which stays English-only since a downloaded file has no live locale).
export const TYPE_LABEL_KEY: Record<TransactionType, string> = {
  BUY: "common.transactionType.buy",
  SELL: "common.transactionType.sell",
  DEPOSIT: "common.transactionType.deposit",
  WITHDRAW: "common.transactionType.withdraw",
  GIFT_SENT: "common.transactionType.giftSent",
  GIFT_RECEIVED: "common.transactionType.giftReceived",
};

export const STATUS_LABEL_KEY: Record<TransactionStatus, string> = {
  PENDING: "common.status.pending",
  COMPLETED: "common.status.completed",
  FAILED: "common.status.failed",
};
