"use client";

import { Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useWallet } from "@/hooks/use-wallet";
import { formatBDT } from "@/lib/format";
import { MOCK_WALLET } from "@/lib/mock-wallet";

/** Small "Wallet ৳4,250" chip for page headers (e.g. buy-gold) — reads the
 * same ["wallet"] query the trade forms use, so it stays in sync with them.
 * Shows a skeleton bar while that query is still in flight, then the real
 * cash balance from wallet_server's wallet module once it settles
 * (MOCK_WALLET's zero while signed out), so a fresh fetch never reads as a
 * confirmed ৳0 balance. */
export function WalletBadge() {
  const { data, isLoading } = useWallet();
  const wallet = data ?? MOCK_WALLET;

  return (
    <Badge variant="outline" className="h-auto gap-1.5 border-gold/30 bg-gold/5 px-2.5 py-1.5 text-sm text-foreground">
      <Wallet className="size-3.5 text-gold" strokeWidth={1.75} />
      Wallet{" "}
      {isLoading ? <Skeleton className="h-3.5 w-14" /> : <span className="font-semibold">{formatBDT(wallet.cashBalanceBDT)}</span>}
    </Badge>
  );
}
