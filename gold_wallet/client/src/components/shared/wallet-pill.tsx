"use client";

import { useState } from "react";
import { useWallet } from "@/hooks/use-wallet";
import { useFxRates } from "@/hooks/use-fx-rates";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBDTCompact, formatUSDCompact } from "@/lib/format";
import { MOCK_WALLET } from "@/lib/mock-wallet";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/use-translation";

/** Click cycles the balance through these views. */
const UNITS = ["BDT", "USD"] as const;
type Unit = (typeof UNITS)[number];

const UNIT_LABEL_KEY: Record<Unit, string> = {
  BDT: "walletPill.unitTaka",
  USD: "walletPill.unitUsDollars",
};

/** "Wallet 4,250 BDT" chip for the dashboard top bar — click it to show the
 * same balance in USD, then back to taka. Reads the same ["wallet"] query the
 * trade forms use, so it stays in sync with them. Shows a skeleton bar while
 * in flight, then the real cash balance from wallet_server's wallet module
 * once it settles (MOCK_WALLET's zero while signed out). */
export function WalletPill({ className }: { className?: string }) {
  const [unit, setUnit] = useState<Unit>("BDT");
  const { t } = useTranslation();
  const { data: wallet, isLoading: walletLoading } = useWallet();
  const { ratesPerUnit } = useFxRates();

  const balanceBDT = Number((wallet ?? MOCK_WALLET).cashBalanceBDT);
  const next = UNITS[(UNITS.indexOf(unit) + 1) % UNITS.length];

  const value = unit === "BDT" ? formatBDTCompact(balanceBDT) : formatUSDCompact(balanceBDT / ratesPerUnit.USD);

  return (
    <button
      type="button"
      onClick={() => setUnit(next)}
      title={t("walletPill.showIn", { unit: t(UNIT_LABEL_KEY[next]) })}
      aria-label={t("walletPill.ariaBalance", { value, unit: t(UNIT_LABEL_KEY[next]) })}
      className={cn(
        "flex items-center gap-1.5 rounded-full border border-gold/20 bg-gold/10 px-3 py-1.5 text-xs transition-colors hover:bg-gold/20 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        className
      )}
    >
      <span className="text-muted-foreground">{t("walletPill.label")}</span>
      {/* Fixed min-width so cycling units doesn't shuffle the top bar around. */}
      <span className="flex min-w-18 items-center justify-end text-right font-bold text-gold tabular-nums">
        {walletLoading ? <Skeleton className="h-3.5 w-14" /> : value}
      </span>
    </button>
  );
}
