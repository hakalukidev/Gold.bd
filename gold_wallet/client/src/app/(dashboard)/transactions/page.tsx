"use client";

import { useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Download, History as HistoryIcon, PiggyBank } from "lucide-react";
import { useTransactions } from "@/hooks/use-transactions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { WalletBadge } from "@/components/shared/wallet-badge";
import { FLOW_ACCENT, FlowStatTile } from "@/components/shared/flow-stat-tile";
import { SELECTED_GOLD } from "@/components/shared/payment-method-button";
import { formatBDT, formatDateTime } from "@/lib/format";
import { CREDIT_TYPES, STATUS_LABEL_KEY, TYPE_LABEL_KEY } from "@/lib/transaction-labels";
import { downloadCsv, toTransactionCsv } from "@/lib/transaction-export";
import { percentChange, windowTotals } from "@/lib/wallet-flow";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { TransactionSummary, TransactionType } from "@/types";

// "Gift" and "Auto-Save" mirror the reference design's filter pills, but
// TransactionType only has BUY/SELL/DEPOSIT/WITHDRAW (see types/index.ts) —
// there's no gift/auto-save transaction record in this repo's API contract,
// so those two filters always come up empty instead of showing fake rows.
const TYPE_FILTERS: { key: string; labelKey: string; types: TransactionType[] | null }[] = [
  { key: "all", labelKey: "transactions.filters.all", types: null },
  { key: "buy", labelKey: "transactions.filters.buy", types: ["BUY"] },
  { key: "sell", labelKey: "transactions.filters.sell", types: ["SELL"] },
  { key: "money-in", labelKey: "transactions.filters.moneyIn", types: ["DEPOSIT"] },
  { key: "money-out", labelKey: "transactions.filters.moneyOut", types: ["WITHDRAW"] },
  { key: "gift", labelKey: "transactions.filters.gift", types: [] },
  { key: "auto-save", labelKey: "transactions.filters.autoSave", types: [] },
];

// `days` doubles as the comparison window for the stat tiles' delta chips —
// "last 30 days vs. the 30 before it". A number rather than null for "All
// time" so one code path covers every range; nothing predates the account.
const RANGES = [
  { key: "30d", labelKey: "transactions.ranges.days30", days: 30, captionKey: "transactions.ranges.last30Days" },
  { key: "90d", labelKey: "transactions.ranges.days90", days: 90, captionKey: "transactions.ranges.last90Days" },
  { key: "1y", labelKey: "transactions.ranges.year1", days: 365, captionKey: "transactions.ranges.last12Months" },
  { key: "all", labelKey: "transactions.ranges.allTime", days: 36_500, captionKey: "transactions.ranges.allTime" },
] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Buys, sells and wallet movement in one ledger — the money-in/out totals that
 * used to live on a separate Statement page are folded in above the filters,
 * so Transaction History is the single place to review and export activity. Same
 * ["transactions"] query as the rest of the app; the skeleton below covers the
 * loading gap and this repo has no backend behind it yet (see CLAUDE.md), so
 * it settles to an empty ledger rather than demo rows.
 */
export default function TransactionsPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useTransactions();
  const transactions = data ?? [];

  const [typeKey, setTypeKey] = useState(TYPE_FILTERS[0].key);
  const [rangeKey, setRangeKey] = useState<(typeof RANGES)[number]["key"]>("30d");

  const activeType = TYPE_FILTERS.find((f) => f.key === typeKey)!;
  const range = RANGES.find((r) => r.key === rangeKey)!;

  // Totals follow the date range only — narrowing to "Buy" should not blank
  // out the period's money-in figure.
  const current = useMemo(() => windowTotals(transactions, { days: range.days }), [transactions, range.days]);
  const previous = useMemo(
    () => windowTotals(transactions, { days: range.days, offsetDays: range.days }),
    [transactions, range.days]
  );

  const filtered = useMemo(() => {
    const since = Date.now() - range.days * DAY_MS;
    return transactions.filter(
      (t) =>
        new Date(t.createdAt).getTime() >= since && (!activeType.types || activeType.types.includes(t.type))
    );
  }, [transactions, range.days, activeType]);

  function handleDownload() {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`gold-bd-history-${typeKey}-${rangeKey}-${stamp}.csv`, toTransactionCsv(filtered));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav.transactionHistory")}
        description={t("transactions.header.description")}
        action={<WalletBadge />}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <FlowStatTile
          icon={ArrowDownToLine}
          label={t("wallet.flowStats.moneyIn")}
          value={formatBDT(current.inBDT)}
          pct={percentChange(current.inBDT, previous.inBDT)}
          accent={FLOW_ACCENT.in}
          caption={t(range.captionKey)}
        />
        <FlowStatTile
          icon={ArrowUpFromLine}
          label={t("wallet.flowStats.moneyOut")}
          value={formatBDT(current.outBDT)}
          pct={percentChange(current.outBDT, previous.outBDT)}
          invertColor
          accent={FLOW_ACCENT.out}
          caption={t(range.captionKey)}
        />
        <FlowStatTile
          icon={PiggyBank}
          label={t("wallet.flowStats.netSaved")}
          value={formatBDT(current.netBDT)}
          pct={percentChange(current.netBDT, previous.netBDT)}
          accent={FLOW_ACCENT.net}
          caption={t(range.captionKey)}
        />
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {TYPE_FILTERS.map((f) => (
            <Button
              key={f.key}
              type="button"
              variant="outline"
              size="sm"
              aria-pressed={typeKey === f.key}
              className={cn(typeKey === f.key && SELECTED_GOLD)}
              onClick={() => setTypeKey(f.key)}
            >
              {t(f.labelKey)}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {RANGES.map((r) => (
            <Button
              key={r.key}
              type="button"
              variant="ghost"
              size="sm"
              aria-pressed={rangeKey === r.key}
              className={cn("text-muted-foreground", rangeKey === r.key && "bg-muted text-foreground")}
              onClick={() => setRangeKey(r.key)}
            >
              {t(r.labelKey)}
            </Button>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-auto"
            disabled={filtered.length === 0}
            onClick={handleDownload}
          >
            <Download />
            {t("transactions.downloadCsv")}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={HistoryIcon} title={t("transactions.emptyTitle")} description={t("transactions.emptyDescription")} />
          ) : (
            <>
              <ul className="divide-y">
                {filtered.map((tx) => (
                  <TransactionRow key={tx.id} transaction={tx} />
                ))}
              </ul>
              <p className="pt-4 text-xs text-muted-foreground">
                {t("transactions.footer", {
                  count: filtered.length,
                  entries: filtered.length === 1 ? t("transactions.entry") : t("transactions.entriesPlural"),
                })}
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TransactionRow({ transaction: tx }: { transaction: TransactionSummary }) {
  const { t } = useTranslation();
  const credit = CREDIT_TYPES.includes(tx.type);
  // metal-agnostic: a BUY/SELL row carries whichever of goldGrams/silverGrams
  // its own `metal` set, never both.
  const grams = tx.metal === "silver" ? tx.silverGrams : tx.goldGrams;
  const unit = tx.metal === "silver" ? "g Ag" : "g";
  const TYPE_SHORT_KEY: Record<TransactionType, string> = {
    BUY: "common.transactionTypeShort.buy",
    SELL: "common.transactionTypeShort.sell",
    DEPOSIT: "common.transactionTypeShort.deposit",
    WITHDRAW: "common.transactionTypeShort.withdraw",
  };

  return (
    <li className="flex items-center justify-between gap-3 py-4">
      <div className="min-w-0">
        <p className="font-medium">{t(TYPE_LABEL_KEY[tx.type])}</p>
        <p className="text-xs text-muted-foreground">
          {formatDateTime(tx.createdAt)} · {t(TYPE_SHORT_KEY[tx.type])}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <div className="text-right">
          {grams && (
            <p className={cn("font-semibold tabular-nums", tx.type === "BUY" ? "text-emerald-500" : "text-foreground")}>
              {tx.type === "BUY" ? "+" : "-"}
              {Number(grams).toFixed(3)}
              {unit}
            </p>
          )}
          <p className={cn("text-xs tabular-nums", credit ? "text-emerald-500" : "text-muted-foreground")}>
            {credit ? "+" : "-"}
            {formatBDT(tx.totalAmountBDT)}
          </p>
        </div>
        <Badge variant={tx.status === "COMPLETED" ? "default" : tx.status === "FAILED" ? "destructive" : "secondary"}>
          {t(STATUS_LABEL_KEY[tx.status])}
        </Badge>
      </div>
    </li>
  );
}
