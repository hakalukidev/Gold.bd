"use client";

import { BarChart3 } from "lucide-react";
import { useAdminTrades } from "@/hooks/use-admin-reports";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBDT } from "@/lib/format";
import { useTranslation } from "@/lib/i18n/use-translation";

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

/** Every day someone bought or sold gold/silver, one row each — grams and
 * BDT moved, both directions, both metals. Numbers come straight from
 * wallet_server's ledger (see ledger.repository.js#adminListTrades), the
 * same source of truth every user's own transaction history reads from, so
 * this can't drift from what a single account shows. */
export default function AdminReportsPage() {
  const { t } = useTranslation();
  const from = new Date(Date.now() - NINETY_DAYS_MS).toISOString();
  const { data: rows, isLoading } = useAdminTrades({ from });

  return (
    <>
      <PageHeader title={t("adminNav.reports")} description={t("admin.reports.description")} />
      <Card>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : !rows || rows.length === 0 ? (
            <EmptyState icon={BarChart3} title={t("admin.reports.emptyTitle")} description={t("admin.reports.emptyDescription")} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground uppercase">
                    <th className="pb-2 pr-3 font-medium">{t("admin.reports.columns.date")}</th>
                    <th className="pb-2 pr-3 text-right font-medium">{t("admin.reports.columns.buyGold")}</th>
                    <th className="pb-2 pr-3 text-right font-medium">{t("admin.reports.columns.sellGold")}</th>
                    <th className="pb-2 pr-3 text-right font-medium">{t("admin.reports.columns.buySilver")}</th>
                    <th className="pb-2 text-right font-medium">{t("admin.reports.columns.sellSilver")}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...rows].reverse().map((row) => (
                    <tr key={row.date} className="border-b last:border-0">
                      <td className="py-2.5 pr-3 font-medium">{row.date}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                        {Number(row.buyGoldGrams) > 0 ? `${Number(row.buyGoldGrams).toFixed(3)}g · ${formatBDT(row.buyGoldBDT)}` : "—"}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-rose-600 dark:text-rose-400">
                        {Number(row.sellGoldGrams) > 0 ? `${Number(row.sellGoldGrams).toFixed(3)}g · ${formatBDT(row.sellGoldBDT)}` : "—"}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                        {Number(row.buySilverGrams) > 0 ? `${Number(row.buySilverGrams).toFixed(3)}g · ${formatBDT(row.buySilverBDT)}` : "—"}
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-rose-600 dark:text-rose-400">
                        {Number(row.sellSilverGrams) > 0 ? `${Number(row.sellSilverGrams).toFixed(3)}g · ${formatBDT(row.sellSilverBDT)}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
