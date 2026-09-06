"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import { Calculator, ChevronDown, TrendingDown, TrendingUp } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api-client";
import type { Metal } from "@/hooks/use-metal-rate";
import { useT } from "@/lib/i18n/use-t";
import { formatBDT, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Karat, MetalRateSummary } from "@/types";

// Standard Bangladeshi/subcontinental gold-weight subdivisions, all derived
// from the bhori (also used by rateHistory's bhori<->gram calculator):
// 1 bhori = 1 tola = 16 ana = 96 roti = 768 point = 11.6638g.
const GRAMS_PER_BHORI = 11.6638;
const UNITS = [
  { key: "bhori", grams: GRAMS_PER_BHORI, label: "unitBhori", perLabel: "perBhori" },
  { key: "gram", grams: 1, label: "unitGram", perLabel: "perGram" },
  { key: "tola", grams: GRAMS_PER_BHORI, label: "unitTola", perLabel: "perTola" },
  { key: "ana", grams: GRAMS_PER_BHORI / 16, label: "unitAna", perLabel: "perAna" },
  { key: "roti", grams: GRAMS_PER_BHORI / 96, label: "unitRoti", perLabel: "perRoti" },
  { key: "point", grams: GRAMS_PER_BHORI / 768, label: "unitPoint", perLabel: "perPoint" },
] as const;

// BAJUS publishes these four grades directly (22K, 21K, 18K, and "সনাতন" —
// traditional/mixed gold, which has no fixed karat of its own) for both
// metals, so each cell below is its own real wallet_server reading rather
// than a ratio derived off the platform's 22K anchor rate. `purityLabel` is
// just the badge text — 22K, 21K and 18K are exact fractions; সনাতন has none,
// so it shows no badge.
const KARATS: { key: Karat; labelKey: "karat22" | "karat21" | "karat18" | "sanatan"; purityLabel: string | null }[] = [
  { key: "22k", labelKey: "karat22", purityLabel: "91.7%" },
  { key: "21k", labelKey: "karat21", purityLabel: "87.5%" },
  { key: "18k", labelKey: "karat18", purityLabel: "75.0%" },
  { key: "sonaton", labelKey: "sanatan", purityLabel: null },
];

const METALS = [
  { key: "gold", label: "metalGold", heading: "headingGold" },
  { key: "silver", label: "metalSilver", heading: "headingSilver" },
] as const;

const MINI_CHART_RECORDS = 40;
const MINI_CHART_WIDTH = 480;
const MINI_CHART_HEIGHT = 64;

export function LiveBadge({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-emerald-400 uppercase">
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
      </span>
      {label}
    </span>
  );
}

function MiniBarChart({ data }: { data: { pricePerGramBDT: string; effectiveAt: string }[] }) {
  const values = data.map((d) => Number(d.pricePerGramBDT));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || max * 0.05;
  const barGap = 2;
  const barW = MINI_CHART_WIDTH / values.length - barGap;

  return (
    <svg viewBox={`0 0 ${MINI_CHART_WIDTH} ${MINI_CHART_HEIGHT}`} className="w-full overflow-visible" aria-hidden="true">
      {values.map((value, i) => {
        const heightRatio = (value - min + range * 0.15) / (range * 1.3);
        const barH = Math.max(3, heightRatio * MINI_CHART_HEIGHT);
        const x = i * (barW + barGap);
        const y = MINI_CHART_HEIGHT - barH;
        const isLast = i === values.length - 1;
        return (
          <rect
            key={data[i].effectiveAt}
            x={x}
            y={y}
            width={Math.max(barW, 1)}
            height={barH}
            rx={Math.min(barW / 2, 2)}
            fill={isLast ? "#f4c64e" : "#c8a951"}
            fillOpacity={isLast ? 1 : 0.5}
          />
        );
      })}
    </svg>
  );
}

export function TodayPriceSection() {
  const t = useT();
  const [metalKey, setMetalKey] = useState<Metal>("gold");
  const [unitKey, setUnitKey] = useState<(typeof UNITS)[number]["key"]>("bhori");
  const unit = UNITS.find((u) => u.key === unitKey)!;
  const metal = METALS.find((m) => m.key === metalKey)!;

  // One real BAJUS reading per grade, fetched independently — the karat grid
  // below is four live feeds, not one anchor scaled four ways.
  const rateQueries = useQueries({
    queries: KARATS.map(({ key }) => ({
      queryKey: [`${metalKey}-rate`, key],
      queryFn: () => api.get<MetalRateSummary>(`/api/${metalKey}/rate?karat=${key}`),
      refetchInterval: 30_000,
    })),
  });
  const historyQueries = useQueries({
    queries: KARATS.map(({ key }) => ({
      queryKey: [`${metalKey}-rate-history`, key],
      queryFn: () => api.get<MetalRateSummary[]>(`/api/${metalKey}/rate-history?karat=${key}`),
      staleTime: 60_000,
    })),
  });

  // 22K (index 0) anchors the heading date and mini bar chart, the grade the
  // storefront has always led with.
  const rate = rateQueries[0].data;
  const history = historyQueries[0].data;

  const miniChartData = useMemo(() => (history ? history.slice(-MINI_CHART_RECORDS) : []), [history]);
  const hasMiniChart = miniChartData.length >= 2;
  const miniChartBounds = useMemo(() => {
    if (miniChartData.length === 0) return null;
    const values = miniChartData.map((d) => Number(d.pricePerGramBDT));
    return { min: Math.min(...values), max: Math.max(...values) };
  }, [miniChartData]);

  return (
    <section className="relative overflow-hidden bg-black py-12 sm:py-14">
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        {/* ---------- Stat strip: 22K/gram mini chart + marketing tagline ---------- */}
        <div className="grid gap-8 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] sm:items-center">
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-white">
                {t.todayPrice[metal.label]} {t.todayPrice.miniChartLabel}
              </p>
              <LiveBadge label={t.todayPrice.live} />
            </div>
            <div className="mt-3">
              {hasMiniChart ? (
                <MiniBarChart data={miniChartData} />
              ) : (
                <div className="flex h-16 items-center text-xs text-muted-white">{t.todayPrice.noHistory}</div>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-muted-white">
              <span>{t.todayPrice.basedOnRecords.replace("{count}", String(miniChartData.length))}</span>
              {miniChartBounds && (
                <span className="font-medium text-neutral-300">
                  {formatBDT(miniChartBounds.min)} - {formatBDT(miniChartBounds.max)}
                </span>
              )}
            </div>
          </div>

          <p className="text-xl leading-snug font-bold text-white sm:text-right sm:text-2xl">{t.todayPrice.tagline}</p>
        </div>

        {/* ---------- Divider ---------- */}
        <div className="my-6 h-px bg-linear-to-r from-transparent via-gold/50 to-transparent" />

        {/* ---------- Price header ---------- */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gold sm:text-xl">{t.todayPrice[metal.heading]}</h2>

            {/* Metal switcher — swaps the whole section between the gold and silver feeds. */}
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={t.todayPrice.selectMetal}
                className="flex items-center gap-1.5 rounded-full border border-gold/30 bg-white/5 px-3 py-1 text-xs font-semibold text-neutral-200 outline-none transition-colors hover:border-gold/60 hover:text-white data-popup-open:border-gold/60"
              >
                {t.todayPrice[metal.label]}
                <ChevronDown className="size-3.5 transition-transform duration-200 data-popup-open:rotate-180" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-32 border border-white/10 bg-ink-light p-1.5">
                <DropdownMenuRadioGroup
                  value={metalKey}
                  onValueChange={(value) => setMetalKey(value as Metal)}
                >
                  {METALS.map((m) => (
                    <DropdownMenuRadioItem
                      key={m.key}
                      value={m.key}
                      closeOnClick
                      className="rounded-md px-2 py-1.5 text-sm font-semibold text-neutral-200 focus:text-gold"
                    >
                      {t.todayPrice[m.label]}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <LiveBadge label={t.todayPrice.live} />
          </div>
          <div className="flex items-center gap-4">
            <p className="text-xs font-medium text-neutral-300">{rate ? formatDateTime(rate.effectiveAt) : "—"}</p>
            <Link
              href="/calculator#bhori-gram"
              className="flex items-center gap-1.5 text-xs font-semibold text-gold transition-colors hover:text-gold-light"
            >
              <Calculator className="size-3.5" />
              {t.nav.calculator}
            </Link>
          </div>
        </div>

        {/* ---------- Karat price grid ---------- */}
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4 sm:gap-x-0 sm:divide-x sm:divide-white/10">
          {KARATS.map(({ key, labelKey, purityLabel }, i) => {
            const gradeRate = rateQueries[i].data;
            const gradeHistory = historyQueries[i].data;
            const gradeLoading = rateQueries[i].isLoading;

            const price = gradeRate ? Number(gradeRate.pricePerGramBDT) * unit.grams : null;
            const prevPricePerGram =
              gradeHistory && gradeHistory.length >= 2 ? Number(gradeHistory[gradeHistory.length - 2].pricePerGramBDT) : null;
            const perGramDiff = gradeRate && prevPricePerGram !== null ? Number(gradeRate.pricePerGramBDT) - prevPricePerGram : null;
            const changeAbs = perGramDiff !== null ? perGramDiff * unit.grams : null;
            const changePct = perGramDiff !== null && prevPricePerGram ? (perGramDiff / prevPricePerGram) * 100 : null;

            return (
              <div key={key} className="min-w-0 sm:px-5 sm:first:pl-0 sm:last:pr-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[11px] font-medium tracking-wide text-muted-white uppercase">{t.todayPrice[labelKey]}</p>
                  {purityLabel && <span className="text-[10px] text-muted-white">{purityLabel}</span>}
                </div>
                <p className="mt-1 truncate text-lg font-bold text-white sm:text-xl">
                  {gradeLoading || price === null ? "—" : formatBDT(price)}
                </p>
                <p className="text-[10px] text-muted-white">{t.todayPrice[unit.perLabel]}</p>
                {changeAbs !== null && changePct !== null && (
                  <p
                    className={cn(
                      "mt-1.5 flex items-center gap-1 text-[11px] font-semibold",
                      changeAbs > 0 ? "text-emerald-400" : changeAbs < 0 ? "text-red-400" : "text-muted-white"
                    )}
                  >
                    {changeAbs > 0 ? (
                      <TrendingUp className="size-3" />
                    ) : changeAbs < 0 ? (
                      <TrendingDown className="size-3" />
                    ) : null}
                    {changeAbs === 0
                      ? t.todayPrice.unchanged
                      : `${changeAbs > 0 ? "+" : ""}${formatBDT(changeAbs)} (${changePct > 0 ? "+" : ""}${changePct.toFixed(2)}%)`}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* ---------- Unit switcher ---------- */}
        <div className="mt-6 flex flex-wrap gap-1 border-t border-white/10 pt-4">
          {UNITS.map((u) => (
            <button
              key={u.key}
              type="button"
              onClick={() => setUnitKey(u.key)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                unitKey === u.key ? "bg-gold text-ink" : "text-muted-white hover:bg-white/5 hover:text-neutral-200"
              )}
            >
              {t.todayPrice[u.label]}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
