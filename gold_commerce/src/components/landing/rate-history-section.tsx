"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useGoldRate } from "@/hooks/use-gold-rate";
import { useGoldRateHistory } from "@/hooks/use-gold-rate-history";
import { useT } from "@/lib/i18n/use-t";
import { formatBDT } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { RateChart } from "./rate-chart";

/** A read-only, input-styled box — visually matches the editable amount field beside it. */
function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-xs text-neutral-400">{label}</label>
      <div className="mt-1 flex h-10 w-full items-center rounded-md border border-white/10 bg-ink px-3 text-sm text-white">
        {value}
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
    <section id="calculator" className="scroll-mt-24 bg-ink py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">{t.rateHistory.trackerTitle}</h2>
          <p className="mt-3 text-neutral-300">{t.rateHistory.trackerSubtitle}</p>
        </div>

        <div className="mt-10 rounded-md border border-white/10 bg-white/5 p-6 sm:p-8">
          {/* ---------- Calculator row ---------- */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs text-neutral-400" htmlFor="tracker-amount">
                {t.rateHistory.enterAmount}
              </label>
              <input
                id="tracker-amount"
                type="number"
                min="0"
                inputMode="decimal"
                value={amountBDT}
                onChange={(e) => setAmountBDT(e.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-white/15 bg-ink px-3 text-sm text-white outline-none focus:border-gold/60"
              />
            </div>
            <ReadonlyField label={t.rateHistory.youWillGet} value={`${grams.toFixed(3)} g`} />
            <ReadonlyField label={t.rateHistory.livePrice} value={rate ? formatBDT(rate.pricePerGramBDT) : "…"} />
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Button variant="gold" nativeButton={false} className="sm:w-auto" render={<Link href="/products/gold">{t.rateHistory.buyGold}</Link>} />
            <Button
              variant="gold-outline"
              nativeButton={false}
              className="sm:w-auto"
              render={<a href="#how-it-works">{t.rateHistory.learnMore}</a>}
            />
          </div>

          {/* ---------- Chart ---------- */}
          <div id="rate-history" className="scroll-mt-24 mt-8 border-t border-white/10 pt-8">
            <p className="mb-4 font-medium text-white">{t.rateHistory.chartCardTitle}</p>
            {isLoading ? (
              <p className="text-sm text-neutral-400">{t.rateHistory.loading}</p>
            ) : !history || history.length === 0 ? (
              <p className="text-sm text-neutral-400">{t.rateHistory.noData}</p>
            ) : history.length === 1 ? (
              <div className="py-6 text-center">
                <p className="text-xs text-neutral-400">{t.rateHistory.singlePointLabel}</p>
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
