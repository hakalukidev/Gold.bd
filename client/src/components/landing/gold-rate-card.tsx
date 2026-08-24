"use client";

import { useGoldRate } from "@/hooks/use-gold-rate";
import { formatBDT, formatDateTime } from "@/lib/format";
import { useT } from "@/lib/i18n/use-t";

// The platform only tracks one admin-set rate (fine/24K gold per gram) — 22K is
// derived from it by purity ratio rather than tracked separately, so this stays
// tied to the real rate instead of a second hardcoded number.
const PURITY_22K = 22 / 24;

function relativeUpdateLabel(iso: string, justNowLabel: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 60_000) return justNowLabel;
  return formatDateTime(iso);
}

export function GoldRateCard() {
  const { data: rate, isLoading } = useGoldRate();
  const t = useT();

  const price24k = rate ? Number(rate.pricePerGramBDT) : null;
  const price22k = price24k !== null ? price24k * PURITY_22K : null;

  return (
    <div className="rounded-md border border-gold/25 bg-white/3 px-5 py-4 backdrop-blur-sm">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] tracking-wide text-muted-white uppercase">{t.hero.rateCard.label22k}</p>
          <p className="mt-0.5 text-lg font-semibold text-white">
            {isLoading ? "…" : price22k !== null ? formatBDT(price22k) : "—"}
            <span className="ml-1 text-[10px] font-normal text-muted-white">{t.hero.rateCard.perGram}</span>
          </p>
        </div>
        <div>
          <p className="text-[10px] tracking-wide text-muted-white uppercase">{t.hero.rateCard.label24k}</p>
          <p className="mt-0.5 text-lg font-semibold text-white">
            {isLoading ? "…" : price24k !== null ? formatBDT(price24k) : "—"}
            <span className="ml-1 text-[10px] font-normal text-muted-white">{t.hero.rateCard.perGram}</span>
          </p>
        </div>
      </div>

      <p className="mt-3 text-[10px] text-muted-white">
        {rate ? relativeUpdateLabel(rate.effectiveAt, t.hero.rateCard.updated) : t.hero.rateCard.updated}
      </p>
    </div>
  );
}
