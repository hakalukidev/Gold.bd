"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Banknote, Coins, Gem, ReceiptText, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { DeltaChip } from "@/components/shared/flow-stat-tile";
import { MarketPriceChart, METAL_CHART_COLOR, toMonthlyPoints, toPricePoints } from "@/components/market/market-price-chart";
import { TradeCard } from "@/components/market/trade-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWallet } from "@/hooks/use-wallet";
import { useMetalRate, useMetalRateHistory } from "@/hooks/use-metal-rate";
import { useTransactions } from "@/hooks/use-transactions";
import { formatBDT, formatDateTime } from "@/lib/format";
import { ANA_IN_GRAMS, BHORI_IN_GRAMS } from "@/lib/gold-fees";
import type { Metal } from "@/lib/mock-rates";
import { MOCK_WALLET } from "@/lib/mock-wallet";
import { METAL_LABEL_KEY, METALS } from "@/lib/trade-products";
import { CREDIT_TYPES, STATUS_LABEL_KEY, TYPE_ICON, TYPE_LABEL_KEY } from "@/lib/transaction-labels";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { Karat, MetalRateSummary } from "@/types";

/**
 * Grades the price graph can be filtered to — the real figures BAJUS reports
 * for each, fetched with `?karat=` (see use-metal-rate.ts). 22K/21K/18K are
 * universal notation kept as-is in both locales; only "Sonaton" translates.
 */
const KARATS: { key: Karat; label: string }[] = [
  { key: "22k", label: "22K" },
  { key: "21k", label: "21K" },
  { key: "18k", label: "18K" },
  { key: "sonaton", label: "market.karat.sonaton" },
];

// `KARAT_LABEL[key]` values are the same translation-dot-path-or-literal
// strings as KARATS' `label` above — always resolve them with t() (see
// PillToggle's note on why a plain literal is safe to pass through it).
const KARAT_LABEL: Record<Karat, string> = Object.fromEntries(KARATS.map((k) => [k.key, k.label])) as Record<
  Karat,
  string
>;

/** Units the headline price can be quoted in — grams (the wallet's own unit),
 * or vori/ana, the units Bangladeshi gold buyers actually think in (16 ana
 * to a vori). */
const PRICE_UNITS = [
  { key: "gram", label: "market.priceUnit.gram", grams: 1 },
  { key: "vori", label: "market.priceUnit.vori", grams: BHORI_IN_GRAMS },
  { key: "ana", label: "market.priceUnit.ana", grams: ANA_IN_GRAMS },
] as const;

type UnitKey = (typeof PRICE_UNITS)[number]["key"];

/**
 * Ranges the price graph can be drawn over. The rate feed publishes one close
 * per day, so anything longer than a month is downsampled to one reading a
 * month instead of drawing every daily point — the same trick the wallet's
 * money-flow chart uses for its 6M/12M views.
 */
const RANGES = [
  { key: "1W", label: "1W", source: "daily", points: 7 },
  { key: "1M", label: "1M", source: "daily", points: 30 },
  { key: "6M", label: "6M", source: "monthly", points: 6 },
  { key: "1Y", label: "1Y", source: "monthly", points: 12 },
  { key: "MAX", label: "Max", source: "monthly", points: 25 },
] as const;

type RangeKey = (typeof RANGES)[number]["key"];

/** Compact toggle used for both the metal and the range switch above the graph. */
function PillToggle<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  /** `label` is either a translation dot-path or a locale-invariant literal
   * (e.g. "22K", "1W") — useTranslation()'s t() falls back to returning an
   * unrecognized path verbatim, so passing a plain literal through it is
   * safe and renders unchanged in both locales. */
  options: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
  ariaLabel: string;
}) {
  const { t } = useTranslation();
  return (
    <div role="group" aria-label={ariaLabel} className="flex rounded-md border p-0.5">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          aria-pressed={value === opt.key}
          className={cn(
            "rounded-sm px-2.5 py-1 text-[11px] font-medium transition-colors",
            value === opt.key ? "bg-gold/15 text-gold" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {t(opt.label)}
        </button>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Holdings table                                                             */
/* -------------------------------------------------------------------------- */

interface HoldingRow {
  key: string;
  name: string;
  detail: string;
  icon: typeof Gem;
  /** Day-on-day move of the underlying rate — cash doesn't have one. */
  dayChangePct: number | null;
  balance: string;
  valueBDT: number;
  href: string;
}

/** The reference design's vault table, in this app's terms: the three places
 * value sits, each valued at today's rate. `walletLoading` shows a skeleton
 * bar in place of every wallet-derived figure while ["wallet"] is still in
 * flight, rather than flashing a confirmed-looking ৳0.00 before the real
 * balance (or MOCK_WALLET's zero, once there's no backend to answer it)
 * arrives. */
function HoldingsTable({ rows, totalBDT, walletLoading }: { rows: HoldingRow[]; totalBDT: number; walletLoading: boolean }) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>{t("market.holdings.title")}</CardTitle>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
            {t("market.holdings.total")}{" "}
            {walletLoading ? <Skeleton className="h-3.5 w-16" /> : <span className="font-semibold text-foreground">{formatBDT(totalBDT)}</span>}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("market.holdings.colAsset")}</TableHead>
              <TableHead className="text-right">{t("market.holdings.col24h")}</TableHead>
              <TableHead className="text-right">{t("market.holdings.colBalance")}</TableHead>
              <TableHead className="text-right">{t("market.holdings.colValue")}</TableHead>
              <TableHead className="text-right">{t("market.holdings.colShare")}</TableHead>
              <TableHead className="text-right">&nbsp;</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const Icon = row.icon;
              const share = totalBDT > 0 ? (row.valueBDT / totalBDT) * 100 : 0;
              const up = (row.dayChangePct ?? 0) >= 0;
              return (
                <TableRow key={row.key}>
                  <TableCell>
                    <span className="flex items-center gap-2.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-gold">
                        <Icon className="size-4" strokeWidth={1.75} />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-medium">{row.name}</span>
                        <span className="block text-[11px] text-muted-foreground">{row.detail}</span>
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {row.dayChangePct === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span
                        className={cn(
                          "inline-flex items-center gap-0.5 font-medium tabular-nums",
                          up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                        )}
                      >
                        {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                        {Math.abs(row.dayChangePct).toFixed(2)}%
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {walletLoading ? <Skeleton className="ml-auto h-3.5 w-14" /> : row.balance}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {walletLoading ? <Skeleton className="ml-auto h-3.5 w-16" /> : formatBDT(row.valueBDT)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">{share.toFixed(1)}%</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      nativeButton={false}
                      render={<Link href={row.href}>{t("market.holdings.manage")}</Link>}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Market — the dashboard's home screen. A full-width live gold/silver price
 * graph (carrying the signed-in user's cash and, on its right axis, what
 * their own holding of the charted metal is worth), with the Buy/Sell trade
 * desk collapsed into the header as a button pair that opens the trade drawer
 * — replacing the wallet balance badge that used to sit there. The graph and
 * the drawer share one `metal` selection, so switching the graph switches
 * what the trade panel is quoting and vice versa. A karat filter above the
 * graph switches it between the real 22K/21K/18K/Sonaton figures BAJUS
 * reports (see KARATS above).
 *
 * Neither `/api/wallet` nor `/api/transactions` exists in this repo (see
 * CLAUDE.md), so the wallet-derived figures below show a loading spinner
 * while ["wallet"] is in flight and MOCK_WALLET's zero balance once it
 * settles, the way the wallet page already does; the rate and history
 * queries are real, so nothing here reads from a mock feed anymore.
 */
export default function MarketPage() {
  const { t } = useTranslation();
  const [metal, setMetal] = useState<Metal>("gold");
  const [unitKey, setUnitKey] = useState<UnitKey>("gram");
  const [rangeKey, setRangeKey] = useState<RangeKey>("1M");
  const [karatKey, setKaratKey] = useState<Karat>("22k");
  const unit = PRICE_UNITS.find((u) => u.key === unitKey)!;

  const { data: walletData, isLoading: walletLoading } = useWallet();
  const { data: transactionsData } = useTransactions();
  const { data: goldRateData } = useMetalRate("gold");
  const { data: silverRateData } = useMetalRate("silver");
  const { data: dailyData } = useMetalRateHistory(metal, karatKey);
  // 22K/anchor (no karat) history for both metals, independent of whichever
  // metal/karat the chart above is on — this is what dayChangePct reads,
  // since it has to match goldPerGram/silverPerGram below.
  const { data: goldHistoryData } = useMetalRateHistory("gold");
  const { data: silverHistoryData } = useMetalRateHistory("silver");

  const wallet = walletData ?? MOCK_WALLET;
  const transactions = transactionsData ?? [];
  const range = RANGES.find((r) => r.key === rangeKey)!;

  const goldPerGram = Number(goldRateData?.pricePerGramBDT ?? 0);
  const silverPerGram = Number(silverRateData?.pricePerGramBDT ?? 0);
  const perGram: Record<Metal, number> = { gold: goldPerGram, silver: silverPerGram };

  const cashBDT = Number(wallet.cashBalanceBDT);
  const goldGrams = Number(wallet.goldBalanceGrams);
  const silverGrams = Number(wallet.silverBalanceGrams);
  const goldValueBDT = goldGrams * goldPerGram;
  const silverValueBDT = silverGrams * silverPerGram;
  const totalBDT = cashBDT + goldValueBDT + silverValueBDT;

  // The daily series comes from the ["{metal}-rate-history"] query, real and
  // per-karat. Longer ranges downsample that same series to one reading a
  // month instead of a separate feed; both just read empty while the query is
  // still in flight, rather than a synthetic mock series.
  const points = useMemo(() => {
    if (range.source === "daily") {
      return toPricePoints((dailyData ?? []).slice(-range.points), "daily");
    }
    const monthly = dailyData ? toMonthlyPoints(dailyData, range.points) : [];
    return toPricePoints(monthly, "monthly");
  }, [dailyData, range.points, range.source]);

  const latestPrice = points[points.length - 1]?.pricePerGram ?? perGram[metal];
  const firstPrice = points[0]?.pricePerGram ?? latestPrice;
  const rangeChangePct = firstPrice > 0 ? ((latestPrice - firstPrice) / firstPrice) * 100 : null;
  // Day-on-day move for the holdings table, read off the last two daily closes
  // of each metal's own 22K/anchor history.
  const historyByMetal: Record<Metal, MetalRateSummary[] | undefined> = { gold: goldHistoryData, silver: silverHistoryData };
  const dayChangePct = (m: Metal) => {
    const series = historyByMetal[m];
    if (!series || series.length < 2) return null;
    const prev = Number(series[series.length - 2].pricePerGramBDT);
    return prev > 0 ? ((perGram[m] - prev) / prev) * 100 : null;
  };

  const holdingRows: HoldingRow[] = [
    {
      key: "cash",
      name: t("wallet.myAccounts.cashWallet"),
      detail: t("wallet.myAccounts.spendableInstantly"),
      icon: Banknote,
      dayChangePct: null,
      balance: formatBDT(cashBDT),
      valueBDT: cashBDT,
      href: "/wallet",
    },
    {
      key: "gold",
      name: t(METAL_LABEL_KEY.gold),
      detail: `${formatBDT(goldPerGram)}/g 22K`,
      icon: Gem,
      dayChangePct: dayChangePct("gold"),
      balance: `${goldGrams.toFixed(3)} g`,
      valueBDT: goldValueBDT,
      href: "/vault",
    },
    {
      key: "silver",
      name: t(METAL_LABEL_KEY.silver),
      detail: `${formatBDT(silverPerGram)}/g 22K`,
      icon: Coins,
      dayChangePct: dayChangePct("silver"),
      balance: `${silverGrams.toFixed(3)} g`,
      valueBDT: silverValueBDT,
      href: "/vault",
    },
  ];

  const karatLabel = t(KARAT_LABEL[karatKey]);
  const metalLabel = t(METAL_LABEL_KEY[metal]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("market.header.title")}
        description={t("market.header.description")}
        titleAdornment={
          <div className="flex items-center gap-2">
            <PillToggle
              ariaLabel={t("market.ariaMetal")}
              options={METALS.map((m) => ({ key: m, label: METAL_LABEL_KEY[m] }))}
              value={metal}
              onChange={setMetal}
            />
            <PillToggle
              ariaLabel={t("market.ariaPriceUnit")}
              options={PRICE_UNITS.map((u) => ({ key: u.key, label: u.label }))}
              value={unitKey}
              onChange={setUnitKey}
            />
          </div>
        }
        action={<TradeCard metal={metal} onMetalChange={setMetal} />}
      />

      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                {t("market.priceCard.heading", { karat: karatLabel, metal: metalLabel })}
              </span>
              <PillToggle
                ariaLabel={t("market.ariaTimeRange")}
                options={RANGES.map((r) => ({ key: r.key, label: r.label }))}
                value={rangeKey}
                onChange={setRangeKey}
              />
            </div>

            <PillToggle
              ariaLabel={t("market.ariaKaratGrade")}
              options={KARATS.map((k) => ({ key: k.key, label: k.label }))}
              value={karatKey}
              onChange={setKaratKey}
            />

            <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
              <p className="text-3xl font-bold tracking-tight tabular-nums">{formatBDT(latestPrice * unit.grams)}</p>
              <span className="pb-1 text-sm text-muted-foreground">
                {t("market.priceCard.per", { unit: t(unit.label).toLowerCase() })} · {karatLabel} {metalLabel}
              </span>
              <span className="pb-1">
                <DeltaChip pct={rangeChangePct} />
              </span>
            </div>

            {points.length < 2 ? (
              <EmptyState icon={TrendingUp} title={t("market.priceCard.noHistory")} />
            ) : (
              <MarketPriceChart
                data={points}
                holdingGrams={0}
                color={METAL_CHART_COLOR[metal]}
                metalLabel={`${karatLabel} ${metalLabel}`}
              />
            )}

            <p className="text-[11px] text-muted-foreground">
              {t("market.priceCard.disclaimer", { karat: karatLabel })}
            </p>
          </CardContent>
        </Card>

        <HoldingsTable rows={holdingRows} totalBDT={totalBDT} walletLoading={walletLoading} />

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>{t("market.recentActivity.title")}</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                nativeButton={false}
                render={
                  <Link href="/transactions">
                    <ReceiptText />
                    {t("nav.transactionHistory")}
                  </Link>
                }
              />
            </div>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <EmptyState
                icon={ReceiptText}
                title={t("market.recentActivity.noTransactions")}
                description={t("market.recentActivity.noTransactionsDescription")}
              />
            ) : (
              <ul className="divide-y">
                {transactions.slice(0, 5).map((tx) => {
                  const Icon = TYPE_ICON[tx.type];
                  const credit = CREDIT_TYPES.includes(tx.type);
                  return (
                    <li key={tx.id} className="flex items-center gap-3 py-2.5 text-sm">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-gold">
                        <Icon className="size-4" strokeWidth={1.75} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{t(TYPE_LABEL_KEY[tx.type])}</p>
                        <p className="text-[11px] text-muted-foreground">{formatDateTime(tx.createdAt)}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={cn(
                            "font-medium tabular-nums",
                            credit ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                          )}
                        >
                          {credit ? "+" : "−"}
                          {formatBDT(tx.totalAmountBDT)}
                        </span>
                        <Badge variant={tx.status === "COMPLETED" ? "default" : tx.status === "FAILED" ? "destructive" : "secondary"}>
                          {t(STATUS_LABEL_KEY[tx.status])}
                        </Badge>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
