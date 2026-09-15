"use client";

import { useGoldRate } from "@/hooks/use-gold-rate";
import { useGoldRateHistory } from "@/hooks/use-gold-rate-history";
import { useT } from "@/lib/i18n/use-t";
import { formatBDT } from "@/lib/format";
import { TrendArrowIcon } from "./trend-arrow-icon";

/**
 * Live 22K/gram headline figure — the same locally-scraped BAJUS feed (see
 * src/lib/rate-store.ts) GoldRateCard/TodayPriceSection read. The change
 * badge is this reading vs. the previous one in the rate history, same delta
 * math as TodayPriceSection's karat grid.
 */
export function HeroPriceBadge() {
  const t = useT();
  const { data: rate } = useGoldRate();
  const { data: history } = useGoldRateHistory();

  const price = rate ? Number(rate.pricePerGramBDT) : null;
  const previous = history && history.length >= 2 ? Number(history[history.length - 2].pricePerGramBDT) : null;
  const changeAbs = price !== null && previous !== null ? price - previous : null;
  const changePct = changeAbs !== null && previous ? (changeAbs / previous) * 100 : null;

  return (
    <div className="inline-flex flex-wrap items-baseline gap-x-2.5 gap-y-1 text-sm">
      <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">{t.hero.priceBadge.label}</span>
      <span className="text-base font-bold text-neutral-900 tabular-nums dark:text-white">
        {price !== null ? formatBDT(price) : "—"}
      </span>
      {changeAbs !== null && changePct !== null && changeAbs !== 0 && (
        <span
          className={`inline-flex items-center gap-1 text-xs font-semibold tabular-nums ${
            changeAbs > 0 ? "text-emerald-400" : "text-red-400"
          }`}
        >
          <TrendArrowIcon direction={changeAbs > 0 ? "up" : "down"} className="size-2.5" />
          {formatBDT(Math.abs(changeAbs))} ({changePct > 0 ? "+" : ""}
          {changePct.toFixed(2)}%)
        </span>
      )}
    </div>
  );
}
