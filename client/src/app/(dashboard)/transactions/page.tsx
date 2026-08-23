"use client";

import { useState } from "react";
import { History as HistoryIcon } from "lucide-react";
import { useTransactions } from "@/hooks/use-transactions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { WalletBadge } from "@/components/shared/wallet-badge";
import { SELECTED_GOLD } from "@/components/shared/payment-method-button";
import { formatBDT, formatDateTime } from "@/lib/format";
import { CREDIT_TYPES, TYPE_LABEL } from "@/lib/transaction-labels";
import { cn } from "@/lib/utils";
import type { TransactionSummary, TransactionType } from "@/types";

// "Gift" and "Auto-Save" mirror the reference design's filter pills, but
// TransactionType only has BUY/SELL/DEPOSIT/WITHDRAW (see types/index.ts) —
// there's no gift/auto-save transaction record in this repo's API contract,
// so those two filters always come up empty instead of showing fake rows.
const FILTERS: { key: string; label: string; types: TransactionType[] | null }[] = [
  { key: "all", label: "All", types: null },
  { key: "buy", label: "Buy", types: ["BUY"] },
  { key: "sell", label: "Sell", types: ["SELL"] },
  { key: "gift", label: "Gift", types: [] },
  { key: "auto-save", label: "Auto-Save", types: [] },
];

export default function TransactionsPage() {
  const { data: transactions, isLoading } = useTransactions();
  const [filter, setFilter] = useState(FILTERS[0].key);

  const active = FILTERS.find((f) => f.key === filter)!;
  const filtered = transactions?.filter((t) => !active.types || active.types.includes(t.type));

  return (
    <div className="space-y-6">
      <PageHeader title="History" description="All your buys, sells, and gifts" action={<WalletBadge />} />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button key={f.key} type="button" variant="outline" size="sm" className={cn(filter === f.key && SELECTED_GOLD)} onClick={() => setFilter(f.key)}>
            {f.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : !filtered || filtered.length === 0 ? (
            <EmptyState icon={HistoryIcon} title="No transactions yet" description="Buy, sell, deposit, or withdraw to see activity here." />
          ) : (
            <ul className="divide-y">
              {filtered.map((t) => (
                <TransactionRow key={t.id} transaction={t} />
              ))}
            </ul>
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
        <Badge variant={t.status === "COMPLETED" ? "default" : t.status === "FAILED" ? "destructive" : "secondary"}>{t.status}</Badge>
      </div>
    </li>
  );
}
