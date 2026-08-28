"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownToLine, ArrowUpFromLine, Banknote, Coins, Gem, ReceiptText, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { WalletBadge } from "@/components/shared/wallet-badge";
import { DeltaChip, SectionLabel } from "@/components/shared/flow-stat-tile";
import { MarketPriceChart, METAL_CHART_COLOR, toPricePoints } from "@/components/market/market-price-chart";
import { TradeCard } from "@/components/market/trade-card";
import { useWallet } from "@/hooks/use-wallet";
import { useMetalRate, useMetalRateHistory } from "@/hooks/use-metal-rate";
import { useTransactions } from "@/hooks/use-transactions";
import { formatBDT, formatDateTime } from "@/lib/format";
import { getLatestRate, getMonthlyRateHistory, getRateHistory, type Metal } from "@/lib/mock-rates";
import { getMockTransactions } from "@/lib/mock-transactions";
import { MOCK_WALLET } from "@/lib/mock-wallet";
import { METAL_LABEL, METALS } from "@/lib/trade-products";
import { CREDIT_TYPES, TYPE_ICON, TYPE_LABEL } from "@/lib/transaction-labels";
import { cn } from "@/lib/utils";

/**
 * Ranges the price graph can be drawn over. The rate feed publishes one close
 * per day and only goes back 45 days (see mock-rates.ts), so anything longer
 * than a month is drawn from the monthly series instead — the same trick the
 * wallet's money-flow chart uses for its 6M/12M views.
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
  options: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
  ariaLabel: string;
}) {
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
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/** One of the three figures above the graph: cash, holding weight, holding value. */
function MarketStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0">
      <SectionLabel>{label}</SectionLabel>
      <p className="mt-1 truncate text-lg font-bold tracking-tight tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{sub}</p>}
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
 * value sits, each valued at today's rate. */
function HoldingsTable({ rows, totalBDT }: { rows: HoldingRow[]; totalBDT: number }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Your holdings</CardTitle>
          <span className="text-xs text-muted-foreground tabular-nums">
            Total <span className="font-semibold text-foreground">{formatBDT(totalBDT)}</span>
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead className="text-right">24h</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead className="text-right">Share</TableHead>
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
                  <TableCell className="text-right tabular-nums">{row.balance}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{formatBDT(row.valueBDT)}</TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">{share.toFixed(1)}%</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={row.href}>Manage</Link>} />
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
 * Market — the dashboard's home screen. A live gold/silver price graph on the
 * left (carrying the signed-in user's cash and, on its right axis, what their
 * own holding of the charted metal is worth), and the buy/sell desk on the
 * right. The two share one `metal` selection, so switching the graph switches
 * what the trade panel is quoting and vice versa.
 *
 * Neither `/api/wallet` nor `/api/transactions` exists in this repo (see
 * CLAUDE.md), so those queries fall back to their demo stand-ins the way the
 * wallet page already does; every figure below is derived from whichever source
 * is live, not hardcoded into the layout.
 */
export default function MarketPage() {
  const [metal, setMetal] = useState<Metal>("gold");
  const [rangeKey, setRangeKey] = useState<RangeKey>("1M");

  const { data: walletData } = useWallet();
  const { data: transactionsData } = useTransactions();
  const { data: goldRateData } = useMetalRate("gold");
  const { data: silverRateData } = useMetalRate("silver");
  const { data: dailyData } = useMetalRateHistory(metal);

  const wallet = walletData ?? MOCK_WALLET;
  const transactions = transactionsData ?? getMockTransactions();
  const range = RANGES.find((r) => r.key === rangeKey)!;

  const goldPerGram = Number((goldRateData ?? getLatestRate("gold")).pricePerGramBDT);
  const silverPerGram = Number((silverRateData ?? getLatestRate("silver")).pricePerGramBDT);
  const perGram: Record<Metal, number> = { gold: goldPerGram, silver: silverPerGram };

  const cashBDT = Number(wallet.cashBalanceBDT);
  const goldGrams = Number(wallet.goldBalanceGrams);
  const silverGrams = Number(wallet.silverBalanceGrams);
  const holdingGrams = metal === "gold" ? goldGrams : silverGrams;

  const goldValueBDT = goldGrams * goldPerGram;
  const silverValueBDT = silverGrams * silverPerGram;
  const totalBDT = cashBDT + goldValueBDT + silverValueBDT;

  // The daily series comes from the ["{metal}-rate-history"] query; the monthly
  // one has no route of its own, so it's read straight from the feed module the
  // same way wallet-flow.ts does.
  const points = useMemo(() => {
    const series =
      range.source === "daily"
        ? (dailyData ?? getRateHistory(metal)).slice(-range.points)
        : getMonthlyRateHistory(metal, range.points);
    return toPricePoints(series, range.source);
  }, [dailyData, metal, range.points, range.source]);

  const latestPrice = points[points.length - 1]?.pricePerGram ?? perGram[metal];
  const firstPrice = points[0]?.pricePerGram ?? latestPrice;
  const rangeChangePct = firstPrice > 0 ? ((latestPrice - firstPrice) / firstPrice) * 100 : null;
  const holdingValueBDT = holdingGrams * perGram[metal];
  const holdingRangeGainBDT = holdingGrams * (latestPrice - firstPrice);

  // Day-on-day move for the holdings table, read off the last two daily closes.
  // getRateHistory is memoised per metal in mock-rates.ts, so this is a lookup.
  const dayChangePct = (m: Metal) => {
    const series = getRateHistory(m);
    if (series.length < 2) return null;
    const prev = Number(series[series.length - 2].pricePerGramBDT);
    return prev > 0 ? ((perGram[m] - prev) / prev) * 100 : null;
  };

  const holdingRows: HoldingRow[] = [
    {
      key: "cash",
      name: "Cash wallet",
      detail: "Spendable instantly",
      icon: Banknote,
      dayChangePct: null,
      balance: formatBDT(cashBDT),
      valueBDT: cashBDT,
      href: "/wallet",
    },
    {
      key: "gold",
      name: "Gold",
      detail: `${formatBDT(goldPerGram)}/g fine`,
      icon: Gem,
      dayChangePct: dayChangePct("gold"),
      balance: `${goldGrams.toFixed(3)} g`,
      valueBDT: goldValueBDT,
      href: "/vault",
    },
    {
      key: "silver",
      name: "Silver",
      detail: `${formatBDT(silverPerGram)}/g fine`,
      icon: Coins,
      dayChangePct: dayChangePct("silver"),
      balance: `${silverGrams.toFixed(3)} g`,
      valueBDT: silverValueBDT,
      href: "/vault",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Market"
        description="Live gold and silver prices, what you hold, and one place to trade"
        action={<WalletBadge />}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)] lg:items-start">
        {/* ---------- Chart + holdings ---------- */}
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <PillToggle
                  ariaLabel="Metal"
                  options={METALS.map((m) => ({ key: m, label: METAL_LABEL[m] }))}
                  value={metal}
                  onChange={setMetal}
                />
                <PillToggle
                  ariaLabel="Time range"
                  options={RANGES.map((r) => ({ key: r.key, label: r.label }))}
                  value={rangeKey}
                  onChange={setRangeKey}
                />
              </div>

              <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
                <p className="text-3xl font-bold tracking-tight tabular-nums">{formatBDT(latestPrice)}</p>
                <span className="pb-1 text-sm text-muted-foreground">per gram · {METAL_LABEL[metal]}</span>
                <span className="pb-1">
                  <DeltaChip pct={rangeChangePct} />
                </span>
              </div>

              {/* Cash and the charted metal's own holding, side by side with the price */}
              <div className="grid gap-4 rounded-md border bg-muted/30 px-3 py-3 sm:grid-cols-3">
                <MarketStat label="Total cash" value={formatBDT(cashBDT)} sub="Available to buy with" />
                <MarketStat
                  label={`Your ${METAL_LABEL[metal].toLowerCase()}`}
                  value={`${holdingGrams.toFixed(3)} g`}
                  sub={`In the vault · ${METAL_LABEL[metal]}`}
                />
                <MarketStat
                  label="Holding value"
                  value={formatBDT(holdingValueBDT)}
                  sub={
                    holdingGrams > 0
                      ? `${holdingRangeGainBDT >= 0 ? "+" : "−"}${formatBDT(Math.abs(holdingRangeGainBDT))} over ${range.label}`
                      : `Buy ${METAL_LABEL[metal].toLowerCase()} to start`
                  }
                />
              </div>

              {points.length < 2 ? (
                <EmptyState icon={TrendingUp} title="No rate history yet" />
              ) : (
                <MarketPriceChart
                  data={points}
                  holdingGrams={holdingGrams}
                  color={METAL_CHART_COLOR[metal]}
                  metalLabel={METAL_LABEL[metal]}
                />
              )}

              {holdingGrams > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Left axis is the market price per gram; the right axis values your own {holdingGrams.toFixed(3)} g of{" "}
                  {METAL_LABEL[metal].toLowerCase()} at the same price.
                </p>
              )}
            </CardContent>
          </Card>

          <HoldingsTable rows={holdingRows} totalBDT={totalBDT} />

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>Recent activity</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  nativeButton={false}
                  render={
                    <Link href="/transactions">
                      <ReceiptText />
                      Transaction History
                    </Link>
                  }
                />
              </div>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <EmptyState
                  icon={ReceiptText}
                  title="No transactions yet"
                  description="Your buys, sells, deposits, and withdrawals will show up here."
                />
              ) : (
                <ul className="divide-y">
                  {transactions.slice(0, 5).map((t) => {
                    const Icon = TYPE_ICON[t.type];
                    const credit = CREDIT_TYPES.includes(t.type);
                    return (
                      <li key={t.id} className="flex items-center gap-3 py-2.5 text-sm">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-gold">
                          <Icon className="size-4" strokeWidth={1.75} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{TYPE_LABEL[t.type]}</p>
                          <p className="text-[11px] text-muted-foreground">{formatDateTime(t.createdAt)}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span
                            className={cn(
                              "font-medium tabular-nums",
                              credit ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                            )}
                          >
                            {credit ? "+" : "−"}
                            {formatBDT(t.totalAmountBDT)}
                          </span>
                          <Badge variant={t.status === "COMPLETED" ? "default" : t.status === "FAILED" ? "destructive" : "secondary"}>
                            {t.status}
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

        {/* ---------- Trade desk ---------- */}
        <div className="space-y-4 lg:sticky lg:top-20">
          <TradeCard metal={metal} onMetalChange={setMetal} />

          <Card size="sm">
            <CardContent className="flex flex-col gap-2">
              <SectionLabel>Move money</SectionLabel>
              <Button
                variant="outline"
                className="h-auto justify-start gap-2.5 py-2.5"
                nativeButton={false}
                render={
                  <Link href="/wallet">
                    <ArrowDownToLine className="size-4 text-gold" strokeWidth={1.75} />
                    Add money to wallet
                  </Link>
                }
              />
              <Button
                variant="outline"
                className="h-auto justify-start gap-2.5 py-2.5"
                nativeButton={false}
                render={
                  <Link href="/wallet">
                    <ArrowUpFromLine className="size-4 text-gold" strokeWidth={1.75} />
                    Withdraw cash
                  </Link>
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
