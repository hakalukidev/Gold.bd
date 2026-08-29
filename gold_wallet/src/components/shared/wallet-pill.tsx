"use client";

import { useState } from "react";
import { useGoldRate } from "@/hooks/use-gold-rate";
import { useWallet } from "@/hooks/use-wallet";
import { formatBDTCompact, formatGrams, formatUSDCompact, gramsToMg } from "@/lib/format";
import { getLatestRate, USD_BDT_RATE } from "@/lib/mock-rates";
import { MOCK_WALLET } from "@/lib/mock-wallet";
import { cn } from "@/lib/utils";

/** Click cycles the balance through these views. */
const UNITS = ["BDT", "USD", "GOLD"] as const;
type Unit = (typeof UNITS)[number];

const UNIT_LABEL: Record<Unit, string> = { BDT: "taka", USD: "US dollars", GOLD: "grams of gold" };

/** "Wallet 4,250 BDT" chip for the dashboard top bar — click it to show the
 * same balance in USD, then as the gold it would buy at today's rate, then back
 * to taka. Reads the same ["wallet"] / ["gold-rate"] queries the trade forms
 * use, so it stays in sync with them; both fall back to the mock data while
 * there is no backend behind this app, the way UserMenu falls back to
 * MOCK_USER. */
export function WalletPill({ className }: { className?: string }) {
  const [unit, setUnit] = useState<Unit>("BDT");
  const { data: wallet } = useWallet();
  const { data: rate } = useGoldRate();

  const balanceBDT = Number((wallet ?? MOCK_WALLET).cashBalanceBDT);
  const pricePerGram = Number((rate ?? getLatestRate("gold")).pricePerGramBDT);
  const next = UNITS[(UNITS.indexOf(unit) + 1) % UNITS.length];

  // Gold view: what the cash balance is worth in metal at today's rate.
  const value =
    unit === "BDT"
      ? formatBDTCompact(balanceBDT)
      : unit === "USD"
        ? formatUSDCompact(balanceBDT / USD_BDT_RATE)
        : pricePerGram > 0
          ? formatGrams(gramsToMg(balanceBDT / pricePerGram))
          : "…";

  return (
    <button
      type="button"
      onClick={() => setUnit(next)}
      title={`Show in ${UNIT_LABEL[next]}`}
      aria-label={`Wallet balance ${value} — show in ${UNIT_LABEL[next]}`}
      className={cn(
        "flex items-center gap-1.5 rounded-full border border-gold/20 bg-gold/10 px-3 py-1.5 text-xs transition-colors hover:bg-gold/20 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        className
      )}
    >
      <span className="text-muted-foreground">Wallet</span>
      {/* Fixed min-width so cycling units doesn't shuffle the top bar around. */}
      <span className="min-w-[4.5rem] text-right font-bold text-gold tabular-nums">{value}</span>
    </button>
  );
}
