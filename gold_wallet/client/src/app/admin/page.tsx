"use client";

import Link from "next/link";
import { BarChart3, Gift, IdCard, Package, Users } from "lucide-react";
import { useAdminDashboard } from "@/hooks/use-admin-reports";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBDT } from "@/lib/format";
import { useTranslation } from "@/lib/i18n/use-translation";

function StatTile({ icon: Icon, label, value, href }: { icon: typeof Users; label: string; value: string | number; href?: string }) {
  const content = (
    <Card className="h-full transition-colors hover:border-gold/40">
      <CardContent className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-gold/10 text-gold">
          <Icon className="size-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <p className="text-xl font-bold tabular-nums">{value}</p>
          <p className="truncate text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

export default function AdminDashboardPage() {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useAdminDashboard();

  return (
    <>
      <PageHeader title={t("adminNav.dashboard")} description={t("admin.dashboard.description")} />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : isError || !data ? (
        <Card>
          <CardContent>
            <EmptyState icon={BarChart3} title={t("admin.dashboard.loadErrorTitle")} description={t("admin.dashboard.loadErrorDescription")} />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile icon={Users} label={t("admin.dashboard.totalUsers")} value={data.userCount} href="/admin/users" />
            <StatTile icon={IdCard} label={t("admin.dashboard.pendingKyc")} value={data.pendingKycCount} href="/admin/kyc" />
            <StatTile icon={Gift} label={t("admin.dashboard.pendingGiftCoins")} value={data.pendingGiftCoinCount} href="/admin/gift-coins" />
            <StatTile icon={Package} label={t("admin.dashboard.pendingCollect")} value={data.pendingCollectCount} href="/admin/collect" />
          </div>

          <Card>
            <CardContent className="space-y-4">
              <p className="font-semibold">{t("admin.dashboard.last30Days")}</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">{t("admin.reports.columns.buyGold")}</p>
                  <p className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{formatBDT(data.last30Days.buyGoldBDT)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">{t("admin.reports.columns.sellGold")}</p>
                  <p className="text-lg font-bold tabular-nums text-rose-600 dark:text-rose-400">{formatBDT(data.last30Days.sellGoldBDT)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">{t("admin.reports.columns.buySilver")}</p>
                  <p className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{formatBDT(data.last30Days.buySilverBDT)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">{t("admin.reports.columns.sellSilver")}</p>
                  <p className="text-lg font-bold tabular-nums text-rose-600 dark:text-rose-400">{formatBDT(data.last30Days.sellSilverBDT)}</p>
                </div>
              </div>
              <Link href="/admin/reports" className="inline-block text-sm font-medium text-gold hover:underline">
                {t("admin.dashboard.viewFullReport")}
              </Link>
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
