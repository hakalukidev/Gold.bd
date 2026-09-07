import { ArrowDownRight, ArrowDownToLine, ArrowUpFromLine, ArrowUpRight, type LucideIcon } from "lucide-react";
import type { TransactionType } from "@/types";

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
