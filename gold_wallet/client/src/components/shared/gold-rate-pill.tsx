"use client";

import { useMemo, useState } from "react";
import { RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useGoldRate } from "@/hooks/use-gold-rate";
import { useGoldRateHistory } from "@/hooks/use-gold-rate-history";
import { useSyncRates } from "@/hooks/use-rate-sync";
import { ApiError } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBDT } from "@/lib/format";
import { BHORI_IN_GRAMS } from "@/lib/gold-fees";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/use-translation";

/** Click cycles the price through these weights. */
const UNITS = [
  { key: "gram", labelKey: "goldRatePill.unitGram", grams: 1 },
  { key: "bhori", labelKey: "goldRatePill.unitBhori", grams: BHORI_IN_GRAMS },
  { key: "tenGram", labelKey: "goldRatePill.unitTenGram", grams: 10 },
] as const;

type UnitKey = (typeof UNITS)[number]["key"];
type Translate = ReturnType<typeof useTranslation>["t"];

/** "2m ago" / "just now" for the sync button's tooltip and caption — how long
 * since wallet_server actually last pulled this reading from BAJUS
 * (`syncedAt`), not how long since this component last rendered it, and not
 * how stale BAJUS's own published figure is (`reportedAt` — those can differ
 * by hours whenever BAJUS hasn't updated their number between our polls). */
function relativeSyncLabel(t: Translate, iso: string | undefined): string {
  if (!iso) return t("goldRatePill.neverSynced");
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 60_000) return t("goldRatePill.justNow");
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return t("goldRatePill.minutesAgo", { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("goldRatePill.hoursAgo", { n: hours });
  return t("goldRatePill.daysAgo", { n: Math.floor(hours / 24) });
}

/** "Live ৳21,839/g ▲0.42%" chip for the dashboard top bar, with a "sync now"
 * button beside it. Reads the same ["gold-rate"] query the trade forms use —
 * it refetches every 30s (see use-metal-rate.ts), so the price here stays
 * live and in sync with them. Click the price to cycle it through a bhori or
 * 10g instead of a single gram; click the sync icon to force wallet_server to
 * pull a fresh reading from BAJUS right now instead of waiting for that.
 * Shows a skeleton bar while the first fetch is in flight, rather than
 * flashing ৳0/g before the real rate arrives. */
export function GoldRatePill({ className }: { className?: string }) {
  const [unitKey, setUnitKey] = useState<UnitKey>("gram");
  const { t } = useTranslation();
  const { data: rate, isLoading } = useGoldRate();
  const { data: history } = useGoldRateHistory();
  const sync = useSyncRates();

  const pricePerGram = Number(rate?.pricePerGramBDT ?? 0);

  // Previous close, for the day-on-day move shown next to the price.
  const prevPerGram = useMemo(() => {
    const series = history ?? [];
    return series.length >= 2 ? Number(series[series.length - 2].pricePerGramBDT) : null;
  }, [history]);

  const changePct = prevPerGram ? ((pricePerGram - prevPerGram) / prevPerGram) * 100 : 0;
  const up = changePct > 0;
  const down = changePct < 0;

  const unit = UNITS.find((u) => u.key === unitKey)!;
  const next = UNITS[(UNITS.findIndex((u) => u.key === unitKey) + 1) % UNITS.length];
  // Whole taka only — the decimals of a per-vori price don't fit the chrome.
  const value = formatBDT(pricePerGram * unit.grams).replace(/\.\d+$/, "");

  const syncedLabel = relativeSyncLabel(t, rate?.syncedAt ?? undefined);

  function handleSync() {
    sync.mutate(undefined, {
      onError: (error) => toast.error(error instanceof ApiError ? error.message : t("goldRatePill.syncError")),
    });
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full border border-gold/20 bg-gold/10 px-3 py-1.5 text-xs",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setUnitKey(next.key)}
        title={t("goldRatePill.titlePrice", { unit: t(next.labelKey) })}
        aria-label={t("goldRatePill.ariaPrice", {
          value,
          unit: t(unit.labelKey),
          change: changePct.toFixed(2),
          next: t(next.labelKey),
        })}
        className="flex items-center gap-1.5 rounded-full transition-colors hover:bg-gold/20 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {/* Pulsing green dot = the rate is live/polling, not a frozen snapshot. */}
        <span className="relative flex size-1.5" aria-hidden="true">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
          <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
        </span>
        <span className="text-muted-foreground">{t("goldRatePill.live")}</span>
        {/* Fixed min-width so cycling units doesn't shuffle the top bar around. */}
        <span className="flex min-w-22 items-center justify-end text-right font-bold text-gold tabular-nums">
          {isLoading ? (
            <Skeleton className="h-3.5 w-14" />
          ) : (
            <>
              {value}
              <span className="font-medium text-gold/70">{t(unit.labelKey)}</span>
            </>
          )}
        </span>
        {!isLoading && prevPerGram !== null && (
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

      <span className="h-3 w-px bg-gold/25" aria-hidden="true" />

      <button
        type="button"
        onClick={handleSync}
        disabled={sync.isPending}
        title={t("goldRatePill.titleSync", { synced: syncedLabel })}
        aria-label={t("goldRatePill.ariaSync", { synced: syncedLabel })}
        className="flex items-center gap-1 rounded-full text-muted-foreground transition-colors hover:text-gold focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-60"
      >
        <RefreshCw className={cn("size-3", sync.isPending && "animate-spin")} aria-hidden="true" />
        <span className="whitespace-nowrap">{syncedLabel}</span>
      </button>
    </div>
  );
}
