"use client";

import { useAppSelector } from "@/store/hooks";
import { useMetalRate } from "@/hooks/use-metal-rate";
import { useT } from "@/lib/i18n/use-t";
import { formatBDT } from "@/lib/format";
import { USD_BDT_RATE } from "@/lib/mock-rates";
import { cn } from "@/lib/utils";

type TickerItem = {
  label: string;
  value: string;
  meta?: string;
  metaTone?: "up" | "down" | "neutral";
};

function TickerRow({ items }: { items: TickerItem[] }) {
  return (
    <div className="flex shrink-0 items-center">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2 whitespace-nowrap px-5 py-1.5 text-xs">
          <span className="text-amber-50/90">{item.label}</span>
          <span className="font-semibold text-white">{item.value}</span>
          {item.meta && (
            <span
              className={cn(
                "text-[10px] font-medium",
                item.metaTone === "down" && "text-red-400",
                item.metaTone === "up" && "text-emerald-400",
                (!item.metaTone || item.metaTone === "neutral") &&
                  (item.meta === "BAJUS" || item.meta?.includes("%") ? "text-ink/70" : "text-amber-100/80")
              )}
            >
              {item.meta}
            </span>
          )}
          <span className="text-ink/40" aria-hidden="true">
            •
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Live BAJUS-sourced gold/silver figures — same locally-scraped feed
 * (bajus.org, via use-metal-rate.ts and src/lib/rate-store.ts) GoldRateCard
 * and TodayPriceSection read, so this scrolling strip agrees with the rest
 * of the page. USD/BDT has no live feed wired into this app (see
 * USD_BDT_RATE in mock-rates.ts), so that one cell stays an indicative
 * figure.
 */
export function GoldPriceTicker() {
  const locale = useAppSelector((state) => state.ui.locale);
  const t = useT();

  const { data: gold22k } = useMetalRate("gold", "22k");
  const { data: gold21k } = useMetalRate("gold", "21k");
  const { data: gold18k } = useMetalRate("gold", "18k");
  const { data: silver22k } = useMetalRate("silver", "22k");

  const loadingLabel = "…";
  const perGram = t.hero.rateCard.perGram;

  const items: TickerItem[] = [
    { label: "USD/BDT", value: formatBDT(USD_BDT_RATE), meta: locale === "bn" ? "ইন্টারব্যাংক" : "interbank" },
    {
      label: `${t.todayPrice.karat22} ${perGram}`,
      value: gold22k ? formatBDT(gold22k.pricePerGramBDT) : loadingLabel,
      meta: "BAJUS",
    },
    {
      label: `${t.todayPrice.karat22} / ${t.todayPrice.unitBhori}`,
      value: gold22k?.pricePerBhoriBDT ? formatBDT(gold22k.pricePerBhoriBDT) : loadingLabel,
      meta: "BAJUS",
    },
    {
      label: `${t.todayPrice.karat21} ${perGram}`,
      value: gold21k ? formatBDT(gold21k.pricePerGramBDT) : loadingLabel,
      meta: "BAJUS",
    },
    {
      label: `${t.todayPrice.karat18} ${perGram}`,
      value: gold18k ? formatBDT(gold18k.pricePerGramBDT) : loadingLabel,
      meta: "BAJUS",
    },
    {
      label: `${t.todayPrice.metalSilver} ${perGram}`,
      value: silver22k ? formatBDT(silver22k.pricePerGramBDT) : loadingLabel,
      meta: "BAJUS",
    },
  ];

  return (
    <div className="relative w-full overflow-hidden border-b border-gold-light/40 bg-linear-to-r from-[#4a3308] via-[#b8891a] to-[#e8c66a]">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-linear-to-r from-[#4a3308] to-transparent sm:w-16" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-linear-to-l from-[#4a3308] to-transparent sm:w-16" />
      <div className="flex w-max animate-[ticker-scroll_35s_linear_infinite] hover:[animation-play-state:paused]">
        <TickerRow items={items} />
        <TickerRow items={items} />
      </div>
    </div>
  );
}
