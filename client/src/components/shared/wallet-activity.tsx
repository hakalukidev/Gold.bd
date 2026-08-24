import Image from "next/image";
import { History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { useTransactions } from "@/hooks/use-transactions";
import { formatBDT, formatDateTime } from "@/lib/format";
import { getMockTransactions } from "@/lib/mock-transactions";
import { CREDIT_TYPES, TYPE_ICON, TYPE_LABEL } from "@/lib/transaction-labels";
import { cn } from "@/lib/utils";
import type { TransactionSummary } from "@/types";

/** Recent wallet-affecting transactions — same ["transactions"] query the
 * dashboard's activity list, the History page, and the trade forms
 * invalidate, so a buy/sell/deposit/withdraw shows up here immediately, with
 * the demo feed standing in while this repo has no backend (see CLAUDE.md).
 * `limit` caps the rows; omit it to show the lot. */
export function WalletActivity({ limit }: { limit?: number } = {}) {
  const { data } = useTransactions();
  const transactions = data ?? getMockTransactions();
  const rows = limit ? transactions.slice(0, limit) : transactions;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image src="/wallet_assets/coin-flat.png" alt="" width={22} height={22} aria-hidden className="size-5.5" />
          Wallet activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState icon={History} title="No activity yet" description="Deposits, withdrawals, and trades will show up here." />
        ) : (
          <ul className="divide-y">
            {rows.map((t) => (
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
  // A failed entry never moved money — the money-in/out totals leave it out,
  // so the row says so rather than reading like a completed transfer.
  const failed = transaction.status === "FAILED";

  return (
    <li className="flex items-center gap-3 py-3 text-sm">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full border",
          failed ? "border-border bg-muted text-muted-foreground" : "border-gold/30 bg-gold/10 text-gold"
        )}
      >
        <Icon className="size-4" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 truncate font-medium">
          {TYPE_LABEL[transaction.type]}
          {transaction.status !== "COMPLETED" && (
            <Badge variant={failed ? "destructive" : "secondary"} className="text-[10px]">
              {transaction.status}
            </Badge>
          )}
        </p>
        <p className="text-xs text-muted-foreground">{formatDateTime(transaction.createdAt)}</p>
      </div>
      <span
        className={cn(
          "shrink-0 font-semibold tabular-nums",
          failed ? "text-muted-foreground line-through" : credit ? "text-emerald-500" : "text-foreground"
        )}
      >
        {credit ? "+" : "-"}
        {formatBDT(transaction.totalAmountBDT)}
      </span>
    </li>
  );
}
