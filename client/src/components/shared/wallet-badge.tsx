"use client";

import { Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/hooks/use-wallet";
import { formatBDT } from "@/lib/format";

/** Small "Wallet ৳4,250" chip for page headers (e.g. buy-gold) — reads the
 * same ["wallet"] query the trade forms use, so it stays in sync with them. */
export function WalletBadge() {
  const { data: wallet } = useWallet();

  return (
    <Badge variant="outline" className="h-auto gap-1.5 border-gold/30 bg-gold/5 px-2.5 py-1.5 text-sm text-foreground">
      <Wallet className="size-3.5 text-gold" strokeWidth={1.75} />
      Wallet <span className="font-semibold">{wallet ? formatBDT(wallet.cashBalanceBDT) : "…"}</span>
    </Badge>
  );
}
