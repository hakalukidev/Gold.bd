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
import { getMockTransactions } from "@/lib/mock-transactions";
import { CREDIT_TYPES, TYPE_LABEL } from "@/lib/transaction-labels";
import { downloadCsv, toTransactionCsv } from "@/lib/transaction-export";
import { percentChange, windowTotals } from "@/lib/wallet-flow";
import { cn } from "@/lib/utils";
import type { TransactionSummary, TransactionType } from "@/types";

// "Gift" and "Auto-Save" mirror the reference design's filter pills, but
// TransactionType only has BUY/SELL/DEPOSIT/WITHDRAW (see types/index.ts) —
// there's no gift/auto-save transaction record in this repo's API contract,
// so those two filters always come up empty instead of showing fake rows.
const TYPE_FILTERS: { key: string; label: string; types: TransactionType[] | null }[] = [
  { key: "all", label: "All", types: null },
  { key: "buy", label: "Buy", types: ["BUY"] },
  { key: "sell", label: "Sell", types: ["SELL"] },
  { key: "money-in", label: "Money in", types: ["DEPOSIT"] },
  { key: "money-out", label: "Money out", types: ["WITHDRAW"] },
  { key: "gift", label: "Gift", types: [] },
  { key: "auto-save", label: "Auto-Save", types: [] },
];

// `days` doubles as the comparison window for the stat tiles' delta chips —
// "last 30 days vs. the 30 before it". A number rather than null for "All
// time" so one code path covers every range; nothing predates the account.
const RANGES = [
  { key: "30d", label: "30 days", days: 30, caption: "Last 30 days" },
  { key: "90d", label: "90 days", days: 90, caption: "Last 90 days" },
  { key: "1y", label: "1 year", days: 365, caption: "Last 12 months" },
  { key: "all", label: "All time", days: 36_500, caption: "All time" },
] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Buys, sells and wallet movement in one ledger — the money-in/out totals that
 * used to live on a separate Statement page are folded in above the filters,
 * so Transaction History is the single place to review and export activity. Same
 * ["transactions"] query as the rest of the app, falling back to the demo feed
 * while this repo has no backend (see CLAUDE.md).
 */
export default function TransactionsPage() {
  const { data, isLoading } = useTransactions();
  const transactions = data ?? getMockTransactions();

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
        title="Transaction History"
        description="Every buy, sell, and taka in or out of your wallet"
        action={<WalletBadge />}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <FlowStatTile
          icon={ArrowDownToLine}
          label="Money in"
          value={formatBDT(current.inBDT)}
          pct={percentChange(current.inBDT, previous.inBDT)}
          accent={FLOW_ACCENT.in}
          caption={range.caption}
        />
        <FlowStatTile
          icon={ArrowUpFromLine}
          label="Money out"
          value={formatBDT(current.outBDT)}
          pct={percentChange(current.outBDT, previous.outBDT)}
          invertColor
          accent={FLOW_ACCENT.out}
          caption={range.caption}
        />
        <FlowStatTile
          icon={PiggyBank}
          label="Net saved"
          value={formatBDT(current.netBDT)}
          pct={percentChange(current.netBDT, previous.netBDT)}
          accent={FLOW_ACCENT.net}
          caption={range.caption}
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
              {f.label}
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
              {r.label}
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
            Download CSV
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
            <EmptyState
              icon={HistoryIcon}
              title="Nothing in this view"
              description="No transactions match this filter and date range yet."
            />
          ) : (
            <>
              <ul className="divide-y">
                {filtered.map((t) => (
                  <TransactionRow key={t.id} transaction={t} />
                ))}
              </ul>
              <p className="pt-4 text-xs text-muted-foreground">
                Showing {filtered.length} {filtered.length === 1 ? "entry" : "entries"} · deposits and sell payouts
                count as money in, buys and withdrawals as money out.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TransactionRow({ transaction: t }: { transaction: TransactionSummary }) {
  const credit = CREDIT_TYPES.includes(t.type);

  return (
    <li className="flex items-center justify-between gap-3 py-4">
      <div className="min-w-0">
        <p className="font-medium">{TYPE_LABEL[t.type]}</p>
        <p className="text-xs text-muted-foreground">
          {formatDateTime(t.createdAt)} · {t.type.charAt(0) + t.type.slice(1).toLowerCase()}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <div className="text-right">
          {t.goldGrams && (
            <p className={cn("font-semibold tabular-nums", t.type === "BUY" ? "text-emerald-500" : "text-foreground")}>
              {t.type === "BUY" ? "+" : "-"}
              {Number(t.goldGrams).toFixed(3)}g
            </p>
          )}
          <p className={cn("text-xs tabular-nums", credit ? "text-emerald-500" : "text-muted-foreground")}>
            {credit ? "+" : "-"}
            {formatBDT(t.totalAmountBDT)}
          </p>
        </div>
        <Badge variant={t.status === "COMPLETED" ? "default" : t.status === "FAILED" ? "destructive" : "secondary"}>
          {t.status}
        </Badge>
      </div>
    </li>
  );
}
