"use client";

import { useId } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowUpRight,
  Banknote,
  Bell,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Gem,
  History,
  Plus,
  ShieldCheck,
  Target,
  TrendingDown,
  TrendingUp,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { useMe } from "@/hooks/use-auth";
import { useWallet } from "@/hooks/use-wallet";
import { useGoldRate } from "@/hooks/use-gold-rate";
import { useGoldRateHistory } from "@/hooks/use-gold-rate-history";
import { useTransactions } from "@/hooks/use-transactions";
import { formatBDT, formatDateTime } from "@/lib/format";
import { RateChart } from "@/components/landing/rate-chart";
import { cn } from "@/lib/utils";
import type { TransactionSummary, TransactionType } from "@/types";

const kycVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  NOT_SUBMITTED: "outline",
  PENDING: "secondary",
  APPROVED: "default",
  REJECTED: "destructive",
};

const transactionIcon: Record<TransactionType, LucideIcon> = {
  BUY: ArrowUpRight,
  SELL: ArrowDownRight,
  DEPOSIT: ArrowDownToLine,
  WITHDRAW: ArrowUpFromLine,
};

/** Small trend line for a stat card — plain SVG, no library, real values
 * only: the gold-rate card is the only one that gets one, since it's the
 * only balance we actually have a history series for. */
function Sparkline({ values, positive }: { values: number[]; positive: boolean }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 88;
  const h = 30;
  const points = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-22 shrink-0" preserveAspectRatio="none" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        className={positive ? "stroke-emerald-500" : "stroke-red-500"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Premium stat tile — icon chip + big value, with an optional real trend
 * (sparkline + % change) rather than a decorative "+12%" badge with no data
 * behind it. */
function HeroStatCard({
  icon: Icon,
  label,
  value,
  trendValues,
  trendWindowLabel,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  trendValues?: number[];
  trendWindowLabel?: string;
}) {
  const hasTrend = trendValues && trendValues.length > 1;
  const changePct = hasTrend ? ((trendValues[trendValues.length - 1] - trendValues[0]) / trendValues[0]) * 100 : null;
  const positive = (changePct ?? 0) >= 0;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-gold">
            <Icon className="size-4" strokeWidth={1.75} />
          </span>
        </div>

        <div className="flex items-end justify-between gap-3">
          <p className="truncate text-2xl font-bold">{value}</p>
          {hasTrend && <Sparkline values={trendValues} positive={positive} />}
        </div>

        {changePct !== null && (
          <div className="flex items-center gap-1.5 text-xs">
            <span
              className={cn(
                "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold",
                positive ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
              )}
            >
              {positive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              {Math.abs(changePct).toFixed(1)}%
            </span>
            {trendWindowLabel && <span className="text-muted-foreground">{trendWindowLabel}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Illustrative only — there's no real "portfolio health" model behind this
// (no backend, see CLAUDE.md), just a stand-in for the gauge-style widget
// dashboards like this usually lead with. Swap for a real score once one exists.
const PORTFOLIO_SCORE = 78;
const PORTFOLIO_METRICS = [
  { label: "Diversification", pct: 72, className: "bg-gold" },
  { label: "Consistency", pct: 88, className: "bg-emerald-500" },
  { label: "Momentum", pct: 65, className: "bg-sky-500" },
] as const;

/** Horseshoe gauge (270°, open at the bottom) built from two overlapping
 * SVG circles with a dasharray — a fixed muted track plus a gold progress
 * arc sized to the score. Same trick used by most no-library gauge widgets. */
function PortfolioScoreGauge({ score }: { score: number }) {
  const gradientId = useId();
  const r = 42;
  const circumference = 2 * Math.PI * r;
  const arcFraction = 0.75; // 270 of 360 degrees
  const trackLength = circumference * arcFraction;
  const progressLength = trackLength * (score / 100);

  return (
    <div className="relative mx-auto size-40">
      <svg viewBox="0 0 100 100" className="size-full -rotate-[135deg]">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e8c66a" />
            <stop offset="55%" stopColor="#d4a62a" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          className="stroke-muted"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${trackLength} ${circumference}`}
        />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${progressLength} ${circumference}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold">{score}</span>
        <span className="text-[11px] text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

/** Current week as a 7-day strip with today highlighted — real date math
 * (no fake "events"), the prev/next chevrons are decorative since there's
 * nowhere to navigate to without a real events backend. */
function MiniCalendar() {
  const today = new Date();
  const monthLabel = today.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{monthLabel}</CardTitle>
          <div className="flex items-center gap-0.5 text-muted-foreground">
            <ChevronLeft className="size-3.5" />
            <ChevronRight className="size-3.5" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => {
            const isToday = d.toDateString() === today.toDateString();
            return (
              <div key={d.toISOString()} className="flex flex-col items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">{d.toLocaleDateString("en-US", { weekday: "narrow" })}</span>
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full text-xs font-medium",
                    isToday ? "bg-gold font-bold text-ink" : "text-foreground"
                  )}
                >
                  {d.getDate()}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

const ORDER_STEPS = ["Placed", "Processing", "Settled"] as const;

/** How far a transaction's status maps onto the 3-step pipeline above. */
function orderStepIndex(status: TransactionSummary["status"]): number {
  if (status === "COMPLETED") return 2;
  if (status === "FAILED") return 1;
  return 1; // PENDING sits mid-pipeline
}

/** Real transactions, drawn as a status pipeline instead of the reference's
 * fake "team member" presence list — this app has orders, not teammates. */
function StatusTracker({ transactions }: { transactions?: TransactionSummary[] }) {
  const recent = transactions?.slice(0, 2) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order status</CardTitle>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <EmptyState icon={History} title="No orders yet" />
        ) : (
          <div className="space-y-5">
            {recent.map((t) => {
              const failed = t.status === "FAILED";
              const stepIndex = orderStepIndex(t.status);
              return (
                <div key={t.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {t.type} · {formatBDT(t.totalAmountBDT)}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDateTime(t.createdAt)}</span>
                  </div>
                  <div className="mt-2.5 flex items-center">
                    {ORDER_STEPS.map((step, i) => (
                      <div key={step} className="flex flex-1 items-center last:flex-initial">
                        {failed && i === 1 ? (
                          <XCircle className="size-4 shrink-0 text-destructive" />
                        ) : i <= stepIndex ? (
                          <CheckCircle2 className="size-4 shrink-0 text-gold" />
                        ) : (
                          <Circle className="size-4 shrink-0 text-muted-foreground/40" />
                        )}
                        {i < ORDER_STEPS.length - 1 && (
                          <span className={cn("mx-1 h-px flex-1", i < stepIndex && !failed ? "bg-gold" : "bg-border")} />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                    {ORDER_STEPS.map((step) => (
                      <span key={step}>{step}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Illustrative except the KYC line, which reflects the signed-in user's
// actual kycStatus — there's no real reminders/tasks backend to source the
// rest from.
function buildTasks(kycStatus?: string) {
  return [
    kycStatus && kycStatus !== "APPROVED"
      ? {
          title: "Complete your KYC",
          desc: "Verify your NID to raise your daily buy limit.",
          due: "Today",
          tag: "Urgent",
          tagVariant: "destructive" as const,
        }
      : null,
    {
      title: "Set a price alert",
      desc: "Get notified when gold drops below your target rate.",
      due: "This week",
      tag: "Medium",
      tagVariant: "secondary" as const,
    },
    {
      title: "Add a nominee",
      desc: "Keep your account details up to date.",
      due: "This month",
      tag: "Low",
      tagVariant: "outline" as const,
    },
  ].filter((t): t is NonNullable<typeof t> => t !== null);
}

function Tasks({ kycStatus }: { kycStatus?: string }) {
  const items = buildTasks(kycStatus);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Tasks</CardTitle>
          <span className="flex size-6 items-center justify-center rounded-full border text-muted-foreground">
            <Plus className="size-3.5" />
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div key={item.title} className="rounded-lg border p-3">
            <p className="text-sm font-medium">{item.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{item.desc}</p>
            <div className="mt-2 flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px]">
                {item.due}
              </Badge>
              <Badge variant={item.tagVariant} className="text-[10px]">
                {item.tag}
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

const QUICK_ACTIONS = [
  { href: "/buy-gold", label: "Buy gold", icon: ArrowUpRight },
  { href: "/sell-gold", label: "Sell gold", icon: ArrowDownRight },
  { href: "/wallet", label: "Deposit / withdraw", icon: Banknote },
] as const;

// Illustrative — a stand-in for a real notifications/insights feed, which
// would need a backend event source this repo doesn't have.
const INSIGHTS = [
  { icon: TrendingUp, title: "Gold touched a fresh high today", meta: "10:42 AM", tag: "Market" },
  { icon: ShieldCheck, title: "Finish your KYC to raise your buy limit", meta: "Pending", tag: "Action" },
  { icon: Bell, title: "Price alert: below ৳21,500 / g", meta: "Not triggered yet", tag: "Alert" },
] as const;

export default function DashboardPage() {
  const { data: user } = useMe();
  const { data: wallet } = useWallet();
  const { data: rate } = useGoldRate();
  const { data: rateHistory } = useGoldRateHistory();
  const { data: transactions } = useTransactions();

  const rateSeries = rateHistory?.map((h) => Number(h.pricePerGramBDT)) ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px] lg:items-start">
      {/* ---------- Main column ---------- */}
      <div className="space-y-6">
        <PageHeader
          title={`Welcome${user ? `, ${user.fullName}` : ""}`}
          description="Here's your account at a glance."
          action={user && <Badge variant={kycVariant[user.kycStatus]}>KYC: {user.kycStatus.replace("_", " ")}</Badge>}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <HeroStatCard icon={Banknote} label="Cash balance" value={wallet ? formatBDT(wallet.cashBalanceBDT) : "…"} />
          <HeroStatCard icon={Gem} label="Gold balance" value={wallet ? `${wallet.goldBalanceGrams} g` : "…"} />
          <HeroStatCard
            icon={TrendingUp}
            label="Gold rate"
            value={rate ? `${formatBDT(rate.pricePerGramBDT)}/g` : "…"}
            trendValues={rateSeries}
            trendWindowLabel={rateHistory ? `${rateHistory.length}-day trend` : undefined}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[2fr_1fr] lg:items-start">
          <Card>
            <CardHeader>
              <CardTitle>Gold rate trend</CardTitle>
            </CardHeader>
            <CardContent>
              {!rateHistory || rateHistory.length === 0 ? (
                <EmptyState icon={TrendingUp} title="No rate history yet" />
              ) : rateHistory.length === 1 ? (
                <p className="text-2xl font-semibold text-gold">{formatBDT(rateHistory[0].pricePerGramBDT)}</p>
              ) : (
                <RateChart data={rateHistory} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5">
                <Target className="size-4 text-gold" strokeWidth={1.75} />
                Portfolio score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PortfolioScoreGauge score={PORTFOLIO_SCORE} />
              <div className="mt-4 space-y-2.5">
                {PORTFOLIO_METRICS.map((m) => (
                  <div key={m.label} className="flex items-center gap-2 text-xs">
                    <span className={cn("size-2 shrink-0 rounded-full", m.className)} />
                    <span className="flex-1 text-muted-foreground">{m.label}</span>
                    <span className="font-medium">{m.pct}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <StatusTracker transactions={transactions} />
          <Tasks kycStatus={user?.kycStatus} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            {!transactions || transactions.length === 0 ? (
              <EmptyState icon={History} title="No transactions yet" description="Your buys, sells, deposits, and withdrawals will show up here." />
            ) : (
              <ul className="divide-y">
                {transactions.slice(0, 5).map((t) => {
                  const Icon = transactionIcon[t.type];
                  return (
                    <li key={t.id} className="flex items-center gap-3 py-3 text-sm">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-gold">
                        <Icon className="size-4" strokeWidth={1.75} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{t.type}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(t.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatBDT(t.totalAmountBDT)}</span>
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

      {/* ---------- Right sidebar ---------- */}
      <div className="space-y-6 lg:sticky lg:top-6">
        <MiniCalendar />

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5">
            {QUICK_ACTIONS.map(({ href, label, icon: Icon }) => (
              <Button
                key={href}
                variant="outline"
                className="h-auto justify-start gap-3 px-3 py-2.5"
                nativeButton={false}
                render={
                  <Link href={href}>
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-gold">
                      <Icon className="size-4" strokeWidth={1.75} />
                    </span>
                    {label}
                  </Link>
                }
              />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Insights</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {INSIGHTS.map((item, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg px-1 py-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-gold">
                  <item.icon className="size-4" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug font-medium">{item.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.meta}</p>
                </div>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {item.tag}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
