"use client";

import { useGoldRate } from "@/hooks/use-gold-rate";
import { useMetalRate } from "@/hooks/use-metal-rate";
import { formatBDT, formatDateTime } from "@/lib/format";
import { useT } from "@/lib/i18n/use-t";

function relativeUpdateLabel(iso: string, justNowLabel: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 60_000) return justNowLabel;
  return formatDateTime(iso);
}

/**
 * BAJUS publishes 22K/21K/18K/সনাতন — not a 24K/"fine" gold rate — so this
 * shows two real grades side by side rather than one real figure and one
 * back-solved from it. 22K is the platform's own anchor (useGoldRate(), no
 * `?karat=`); 21K is fetched the same way the Market page's karat filter does.
 */
export function GoldRateCard() {
  const { data: rate, isLoading } = useGoldRate();
  const { data: rate21k, isLoading: isLoading21k } = useMetalRate("gold", "21k");
  const t = useT();

  const price22k = rate ? Number(rate.pricePerGramBDT) : null;
  const price21k = rate21k ? Number(rate21k.pricePerGramBDT) : null;

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
          <p className="text-[10px] tracking-wide text-muted-white uppercase">{t.hero.rateCard.label21k}</p>
          <p className="mt-0.5 text-lg font-semibold text-white">
            {isLoading21k ? "…" : price21k !== null ? formatBDT(price21k) : "—"}
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
