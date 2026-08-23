import { History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { useTransactions } from "@/hooks/use-transactions";
import { formatBDT, formatDateTime } from "@/lib/format";
import { CREDIT_TYPES, TYPE_ICON, TYPE_LABEL } from "@/lib/transaction-labels";
import { cn } from "@/lib/utils";
import type { TransactionSummary } from "@/types";

/** Recent wallet-affecting transactions — same ["transactions"] query the
 * dashboard's activity list, the History page, and the trade forms
 * invalidate, so a buy/sell/deposit/withdraw shows up here immediately. */
export function WalletActivity() {
  const { data: transactions } = useTransactions();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wallet activity</CardTitle>
      </CardHeader>
      <CardContent>
        {!transactions || transactions.length === 0 ? (
          <EmptyState icon={History} title="No activity yet" description="Deposits, withdrawals, and trades will show up here." />
        ) : (
          <ul className="divide-y">
            {transactions.slice(0, 8).map((t) => (
              <ActivityRow key={t.id} transaction={t} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ActivityRow({ transaction }: { transaction: TransactionSummary }) {
  const Icon = TYPE_ICON[transaction.type];
  const credit = CREDIT_TYPES.includes(transaction.type);

  return (
    <li className="flex items-center gap-3 py-3 text-sm">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-gold">
        <Icon className="size-4" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{TYPE_LABEL[transaction.type]}</p>
        <p className="text-xs text-muted-foreground">{formatDateTime(transaction.createdAt)}</p>
      </div>
      <span className={cn("shrink-0 font-semibold tabular-nums", credit ? "text-emerald-500" : "text-foreground")}>
        {credit ? "+" : "-"}
        {formatBDT(transaction.totalAmountBDT)}
      </span>
    </li>
  );
}
