"use client";

import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { WalletBadge } from "@/components/shared/wallet-badge";
import { WalletActivity } from "@/components/shared/wallet-activity";
import { AddMoneyPanel } from "@/components/forms/add-money-panel";
import { useWallet } from "@/hooks/use-wallet";
import { formatBDT } from "@/lib/format";

export default function WalletPage() {
  const { data: wallet } = useWallet();

  return (
    <div className="space-y-6">
      <PageHeader title="Wallet" description="Add funds and pay for gold instantly" action={<WalletBadge />} />

      <div className="grid gap-4 lg:grid-cols-[1fr_340px] lg:items-start">
        {/* ---------- Balance + add/withdraw money ---------- */}
        <div className="space-y-4">
          <Card>
            <CardContent>
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Available balance</p>
              <p className="mt-2 text-4xl font-semibold">{wallet ? formatBDT(wallet.cashBalanceBDT) : "…"}</p>
              <p className="mt-2 text-sm text-muted-foreground">Used automatically to pay for gold and silver purchases</p>
            </CardContent>
          </Card>

          <AddMoneyPanel />
        </div>

        {/* ---------- Wallet activity ---------- */}
        <div className="lg:sticky lg:top-6">
          <WalletActivity />
        </div>
      </div>
    </div>
  );
}
