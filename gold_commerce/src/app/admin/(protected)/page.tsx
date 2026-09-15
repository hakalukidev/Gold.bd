"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Clock, Wallet, XCircle } from "lucide-react";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { periodCutoffs } from "@/lib/date-buckets";
import { formatBDT, formatDateTime } from "@/lib/format";
import type { AdminManualPayment } from "@/types";
import {
  RevenueTrendChart,
  OrdersTrendChart,
  PaymentMethodChart,
  StatusBreakdown,
  type DailyPoint,
} from "@/components/admin/dashboard-charts";

const METHOD_LABEL = { bkash: "bKash", nagad: "Nagad", bank: "Bank transfer" } as const;
const TREND_DAYS = 14;

function emptyPeriodRecord() {
  return { today: 0, thisWeek: 0, thisMonth: 0, thisYear: 0, allTime: 0 };
}

export default function AdminDashboardPage() {
  const { data: payments } = useQuery({
    queryKey: ["admin-manual-payments-all"],
    queryFn: () => api.get<AdminManualPayment[]>("/api/admin/manual-payments"),
    refetchInterval: 30_000,
  });

  const stats = useMemo(() => {
    if (!payments) return undefined;
    const cutoffs = periodCutoffs();
    const orderCounts = emptyPeriodRecord();
    const revenue = emptyPeriodRecord();
    let pendingCount = 0;
    let pendingAmount = 0;
    let approvedCount = 0;
    let declinedCount = 0;
    const methodCounts = { bkash: 0, nagad: 0, bank: 0 };

    for (const p of payments) {
      const createdAt = new Date(p.createdAt).getTime();
      const amount = Number(p.amountBDT);
      methodCounts[p.method]++;

      orderCounts.allTime++;
      if (createdAt >= cutoffs.today) orderCounts.today++;
      if (createdAt >= cutoffs.thisWeek) orderCounts.thisWeek++;
      if (createdAt >= cutoffs.thisMonth) orderCounts.thisMonth++;
      if (createdAt >= cutoffs.thisYear) orderCounts.thisYear++;

      if (p.status === "APPROVED") {
        approvedCount++;
        revenue.allTime += amount;
        if (createdAt >= cutoffs.today) revenue.today += amount;
        if (createdAt >= cutoffs.thisWeek) revenue.thisWeek += amount;
        if (createdAt >= cutoffs.thisMonth) revenue.thisMonth += amount;
        if (createdAt >= cutoffs.thisYear) revenue.thisYear += amount;
      } else if (p.status === "PENDING") {
        pendingCount++;
        pendingAmount += amount;
      } else {
        declinedCount++;
      }
    }

    return { orderCounts, revenue, pendingCount, pendingAmount, approvedCount, declinedCount, methodCounts };
  }, [payments]);

  const trend = useMemo<DailyPoint[]>(() => {
    const days: DailyPoint[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = TREND_DAYS - 1; i >= 0; i--) {
      const start = new Date(today);
      start.setDate(start.getDate() - i);
      days.push({
        label: start.toLocaleDateString("en-BD", { day: "numeric", month: "short" }),
        revenue: 0,
        orders: 0,
      });
    }
    if (!payments) return days;
    const startWindow = new Date(today);
    startWindow.setDate(startWindow.getDate() - (TREND_DAYS - 1));
    for (const p of payments) {
      const createdAt = new Date(p.createdAt);
      if (createdAt < startWindow) continue;
      const dayIndex = Math.floor((createdAt.getTime() - startWindow.getTime()) / (24 * 60 * 60 * 1000));
      const bucket = days[dayIndex];
      if (!bucket) continue;
      bucket.orders++;
      if (p.status === "APPROVED") bucket.revenue += Number(p.amountBDT);
    }
    return days;
  }, [payments]);

  const methodData = useMemo(
    () => [
      { key: "bkash", label: "bKash", count: stats?.methodCounts.bkash ?? 0 },
      { key: "nagad", label: "Nagad", count: stats?.methodCounts.nagad ?? 0 },
      { key: "bank", label: "Bank", count: stats?.methodCounts.bank ?? 0 },
    ],
    [stats]
  );

  const recentPayments = useMemo(() => payments?.slice(0, 6) ?? [], [payments]);

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Payments and orders at a glance." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard className="admin-stat" icon={Wallet} label="Revenue (approved)" value={formatBDT(stats?.revenue.allTime ?? 0)} />
        <StatCard
          className="admin-stat"
          icon={Clock}
          label="Pending review"
          value={`${stats?.pendingCount ?? 0} · ${formatBDT(stats?.pendingAmount ?? 0)}`}
        />
        <StatCard className="admin-stat" icon={BadgeCheck} label="Approved" value={stats?.approvedCount ?? 0} />
        <StatCard className="admin-stat" icon={XCircle} label="Declined" value={stats?.declinedCount ?? 0} />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <RevenueTrendChart data={trend} />
        <OrdersTrendChart data={trend} />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <PaymentMethodChart data={methodData} />
        <StatusBreakdown
          approved={stats?.approvedCount ?? 0}
          pending={stats?.pendingCount ?? 0}
          declined={stats?.declinedCount ?? 0}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent payments</CardTitle>
          <Link href="/admin/payments" className={buttonVariants({ variant: "outline", size: "sm" })}>
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {!payments ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : recentPayments.length === 0 ? (
            <EmptyState icon={Wallet} title="No payments yet" description="Submissions will show up as shoppers check out." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPayments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-muted-foreground">{formatDateTime(p.createdAt)}</TableCell>
                      <TableCell className="font-mono text-xs">{p.orderId}</TableCell>
                      <TableCell>{METHOD_LABEL[p.method]}</TableCell>
                      <TableCell>{p.customerName}</TableCell>
                      <TableCell className="font-medium">{formatBDT(p.amountBDT)}</TableCell>
                      <TableCell>
                        <Badge variant={p.status === "APPROVED" ? "default" : p.status === "DECLINED" ? "destructive" : "secondary"}>
                          {p.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
