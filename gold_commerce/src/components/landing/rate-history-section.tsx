"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Banknote, Coins, ShoppingBag, TrendingUp } from "lucide-react";
import { useGoldRate } from "@/hooks/use-gold-rate";
import { useGoldRateHistory } from "@/hooks/use-gold-rate-history";
import { useT } from "@/lib/i18n/use-t";
import { formatBDT } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { GoldTitle } from "@/components/shared/gold-title";
import { RateChart } from "./rate-chart";
import { LiveBadge } from "./today-price-section";

/** A read-only, input-styled box — visually matches the editable amount field beside it. */
function ReadonlyField({
  label,
  value,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string;
  icon: typeof Coins;
  accent?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</label>
      <div
        className={`mt-1.5 flex h-11 w-full items-center gap-2 rounded-lg border px-3 text-sm font-semibold ${
          accent
            ? "border-gold/40 bg-gold/10 text-gold"
            : "border-black/10 bg-black/3 text-neutral-900 dark:border-white/10 dark:bg-white/4 dark:text-white"
        }`}
      >
        <Icon className={`size-4 shrink-0 ${accent ? "text-gold" : "text-neutral-400"}`} />
        <span className="truncate">{value}</span>
      </div>
    </div>
  );
}

export function RateHistorySection() {
  const t = useT();
  const { data: rate } = useGoldRate();
  const { data: history, isLoading } = useGoldRateHistory();
  const [amountBDT, setAmountBDT] = useState("5000");

  const grams = useMemo(() => {
    const rateNum = rate ? Number(rate.pricePerGramBDT) : 0;
    const amount = Number(amountBDT) || 0;
    return rateNum > 0 ? amount / rateNum : 0;
  }, [amountBDT, rate]);

  return (
    <section id="calculator" className="scroll-mt-24 relative overflow-hidden bg-background py-16 sm:py-20">
      {/* ---------- Ambient backdrop ---------- */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_45%_at_50%_0%,rgba(212,166,42,0.14),transparent)]" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-gold">
              <TrendingUp className="size-4.5" />
            </span>
          </div>
          <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
            <GoldTitle text={t.rateHistory.trackerTitle} />
          </h2>
          <p className="mt-2.5 text-neutral-600 dark:text-neutral-300">{t.rateHistory.trackerSubtitle}</p>
          <div className="mt-3 flex items-center justify-center">
            <LiveBadge label={t.todayPrice.live} />
          </div>
        </div>

        {/* ---------- Calculator + chart, side by side on larger screens ---------- */}
        <div className="mt-8 flex flex-col items-stretch gap-6 lg:flex-row">
          {/* ---------- Calculator card ---------- */}
          <div className="flex flex-col justify-between rounded-2xl border border-gold/15 bg-linear-to-b from-black/3 to-transparent p-6 shadow-sm sm:p-8 lg:w-88 lg:shrink-0 dark:border-white/10 dark:from-white/5 dark:to-white/2">
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400" htmlFor="tracker-amount">
                  {t.rateHistory.enterAmount}
                </label>
                <div className="relative mt-1.5">
                  <Banknote className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-500" />
                  <input
                    id="tracker-amount"
                    type="number"
                    min="0"
                    inputMode="decimal"
                    value={amountBDT}
                    onChange={(e) => setAmountBDT(e.target.value)}
                    className="h-11 w-full rounded-lg border border-black/15 bg-black/3 pr-3 pl-9 text-sm font-semibold text-neutral-900 outline-none focus:border-gold/60 dark:border-white/15 dark:bg-ink dark:text-white"
                  />
                </div>
              </div>
              <ReadonlyField label={t.rateHistory.youWillGet} value={`${grams.toFixed(3)} g`} icon={Coins} accent />
              <ReadonlyField label={t.rateHistory.livePrice} value={rate ? formatBDT(rate.pricePerGramBDT) : "…"} icon={TrendingUp} />
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <Button
                variant="gold"
                nativeButton={false}
                className="w-full gap-2"
                render={
                  <Link href="/products/gold">
                    <ShoppingBag className="size-4" />
                    {t.rateHistory.buyGold}
                  </Link>
                }
              />
              <Button
                variant="gold-outline"
                nativeButton={false}
                className="w-full gap-2"
                render={
                  <Link href="/#how-it-works">
                    {t.rateHistory.learnMore}
                    <ArrowRight className="size-4" />
                  </Link>
                }
              />
            </div>
          </div>

          {/* ---------- Chart card ---------- */}
          <div
            id="rate-history"
            className="scroll-mt-24 min-w-0 flex-1 rounded-2xl border border-black/10 bg-black/2 p-6 sm:p-8 dark:border-white/10 dark:bg-white/3"
          >
            <div className="mb-5 flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-md bg-gold/15 text-gold">
                <TrendingUp className="size-3.5" />
              </span>
              <p className="font-semibold text-neutral-900 dark:text-white">{t.rateHistory.chartCardTitle}</p>
            </div>
            {isLoading ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{t.rateHistory.loading}</p>
            ) : !history || history.length === 0 ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{t.rateHistory.noData}</p>
            ) : history.length === 1 ? (
              <div className="py-6 text-center">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{t.rateHistory.singlePointLabel}</p>
                <p className="text-3xl font-semibold text-gold">{formatBDT(history[0].pricePerGramBDT)}</p>
                <p className="mt-2 text-xs text-neutral-500">{t.rateHistory.singlePointHint}</p>
              </div>
            ) : (
              <RateChart data={history} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
