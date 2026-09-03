"use client";

import { useMemo, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useGoldRate } from "@/hooks/use-gold-rate";
import { useGoldRateHistory } from "@/hooks/use-gold-rate-history";
import { formatBDT } from "@/lib/format";
import { BHORI_IN_GRAMS } from "@/lib/gold-fees";
import { getLatestRate, getRateHistory } from "@/lib/mock-rates";
import { cn } from "@/lib/utils";

/** Click cycles the price through these weights. */
const UNITS = [
  { key: "gram", label: "/g", grams: 1 },
  { key: "bhori", label: "/bhori", grams: BHORI_IN_GRAMS },
  { key: "tenGram", label: "/10g", grams: 10 },
] as const;

type UnitKey = (typeof UNITS)[number]["key"];

/** "Live ৳21,839/g ▲0.42%" chip for the dashboard top bar. Reads the same
 * ["gold-rate"] query the trade forms use — it refetches every 30s (see
 * use-metal-rate.ts), so the price here stays live and in sync with them.
 * Click it to price a bhori or 10g instead of a single gram. Both queries fall
 * back to the mock feed while there is no backend behind this app, the way
 * WalletPill falls back to MOCK_WALLET. */
export function GoldRatePill({ className }: { className?: string }) {
  const [unitKey, setUnitKey] = useState<UnitKey>("gram");
  const { data: rate } = useGoldRate();
  const { data: history } = useGoldRateHistory();

  const pricePerGram = Number((rate ?? getLatestRate("gold")).pricePerGramBDT);

  // Previous close, for the day-on-day move shown next to the price.
  const prevPerGram = useMemo(() => {
    const series = history ?? getRateHistory("gold");
    return series.length >= 2 ? Number(series[series.length - 2].pricePerGramBDT) : null;
  }, [history]);

  const changePct = prevPerGram ? ((pricePerGram - prevPerGram) / prevPerGram) * 100 : 0;
  const up = changePct > 0;
  const down = changePct < 0;

  const unit = UNITS.find((u) => u.key === unitKey)!;
  const next = UNITS[(UNITS.findIndex((u) => u.key === unitKey) + 1) % UNITS.length];
  // Whole taka only — the decimals of a per-vori price don't fit the chrome.
  const value = formatBDT(pricePerGram * unit.grams).replace(/\.\d+$/, "");

  return (
    <button
      type="button"
      onClick={() => setUnitKey(next.key)}
      title={`Live 24K gold rate — show price ${next.label}`}
      aria-label={`Live gold rate ${value} ${unit.label}, ${changePct.toFixed(2)} percent today — show price ${next.label}`}
      className={cn(
        "flex items-center gap-1.5 rounded-full border border-gold/20 bg-gold/10 px-3 py-1.5 text-xs transition-colors hover:bg-gold/20 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        className
      )}
    >
      {/* Pulsing green dot = the rate is live/polling, not a frozen snapshot. */}
      <span className="relative flex size-1.5" aria-hidden="true">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
        <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
      </span>
      <span className="text-muted-foreground">Live</span>
      {/* Fixed min-width so cycling units doesn't shuffle the top bar around. */}
      <span className="min-w-[5.5rem] text-right font-bold text-gold tabular-nums">
        {value}
        <span className="font-medium text-gold/70">{unit.label}</span>
      </span>
      {prevPerGram !== null && (
        <span
          className={cn(
            "flex items-center gap-0.5 font-medium tabular-nums",
            up && "text-emerald-500",
            down && "text-red-500",
            !up && !down && "text-muted-foreground"
          )}
        >
          {up ? (
            <TrendingUp className="size-3" aria-hidden="true" />
          ) : down ? (
            <TrendingDown className="size-3" aria-hidden="true" />
          ) : null}
          {up ? "+" : ""}
          {changePct.toFixed(2)}%
        </span>
      )}
    </button>
  );
}
