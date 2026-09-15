"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatBDT, formatBDTShort } from "@/lib/format";
import { TrendingUp } from "lucide-react";

// Admin shell is permanently dark (see admin.css) — charts are tuned for that
// surface directly rather than a light/dark-aware token set.
const GRID = "#354151";
const AXIS = "#a8b3c2";
const SURFACE = "#1c2430";
const GOLD = "#e8c66a";
const CATEGORICAL = ["#3987e5", "#d95926", "#199e70"]; // validated dark-mode categorical slots 1–3
const STATUS = { good: "#0ca30c", warning: "#fab219", critical: "#d03b3b" };

const axisTick = { fill: AXIS, fontSize: 11 };

function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  label?: string;
  payload?: { name?: string; value?: number; color?: string }[];
  formatter: (n: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-md border px-3 py-2 text-xs shadow-lg"
      style={{ background: SURFACE, borderColor: GRID }}
    >
      <p className="mb-1 font-medium text-[#f1f3f6]">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: p.color }} />
          <span className="font-semibold text-[#f1f3f6]">{p.value !== undefined ? formatter(p.value) : ""}</span>
          <span className="text-[#a8b3c2]">{p.name}</span>
        </div>
      ))}
    </div>
  );
}

export interface DailyPoint {
  label: string;
  revenue: number;
  orders: number;
}

export function RevenueTrendChart({ data }: { data: DailyPoint[] }) {
  const hasData = data.some((d) => d.revenue > 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="size-4.5 text-gold" strokeWidth={1.75} />
          Revenue trend
          <span className="ml-auto text-xs font-normal text-muted-foreground">Last 14 days · approved</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <EmptyState icon={TrendingUp} title="No revenue yet" description="Approved payments will chart here." />
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={GOLD} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: GRID }} interval={2} />
                <YAxis
                  tick={axisTick}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  tickFormatter={(v) => formatBDTShort(v)}
                />
                <Tooltip
                  cursor={{ stroke: GRID, strokeWidth: 1 }}
                  content={
                    <ChartTooltip formatter={formatBDT} />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke={GOLD}
                  strokeWidth={2}
                  fill="url(#revenueFill)"
                  dot={false}
                  activeDot={{ r: 4, stroke: SURFACE, strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function OrdersTrendChart({ data }: { data: DailyPoint[] }) {
  const hasData = data.some((d) => d.orders > 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="size-4.5 text-gold" strokeWidth={1.75} />
          Orders submitted
          <span className="ml-auto text-xs font-normal text-muted-foreground">Last 14 days</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <EmptyState icon={TrendingUp} title="No orders yet" description="Submissions will chart here." />
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap={4}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: GRID }} interval={2} />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: GRID, opacity: 0.3 }}
                  content={<ChartTooltip formatter={(n) => `${n}`} />}
                />
                <Bar dataKey="orders" name="Orders" fill={CATEGORICAL[0]} radius={[4, 4, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export interface MethodPoint {
  key: string;
  label: string;
  count: number;
}

// Fixed key -> color mapping so a method keeps its color regardless of rank
// when the bars are re-sorted by count (color follows the entity, not its
// position).
const METHOD_COLOR: Record<string, string> = {
  bkash: CATEGORICAL[0],
  nagad: CATEGORICAL[1],
  bank: CATEGORICAL[2],
};

export function PaymentMethodChart({ data }: { data: MethodPoint[] }) {
  const hasData = data.some((d) => d.count > 0);
  const sorted = [...data].sort((a, b) => b.count - a.count);
  return (
    <Card>
      <CardHeader>
        <CardTitle>By payment method</CardTitle>
        <span className="text-xs font-normal text-muted-foreground">All time</span>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <EmptyState icon={TrendingUp} title="No payments yet" description="Method breakdown will chart here." />
        ) : (
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sorted} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid horizontal={false} stroke={GRID} />
                <XAxis type="number" tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={axisTick}
                  tickLine={false}
                  axisLine={false}
                  width={90}
                />
                <Tooltip
                  cursor={{ fill: GRID, opacity: 0.3 }}
                  content={<ChartTooltip formatter={(n) => `${n} payments`} />}
                />
                <Bar dataKey="count" name="Payments" radius={[0, 4, 4, 0]} maxBarSize={20} label={{ position: "right", fill: AXIS, fontSize: 11 }}>
                  {sorted.map((entry) => (
                    <Cell key={entry.key} fill={METHOD_COLOR[entry.key] ?? CATEGORICAL[0]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function StatusBreakdown({
  approved,
  pending,
  declined,
}: {
  approved: number;
  pending: number;
  declined: number;
}) {
  const total = approved + pending + declined;
  const segments = [
    { key: "approved", label: "Approved", value: approved, color: STATUS.good },
    { key: "pending", label: "Pending", value: pending, color: STATUS.warning },
    { key: "declined", label: "Declined", value: declined, color: STATUS.critical },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>By status</CardTitle>
        <span className="text-xs font-normal text-muted-foreground">All time</span>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <EmptyState icon={TrendingUp} title="No payments yet" description="Status breakdown will chart here." />
        ) : (
          <div className="space-y-4">
            <div className="flex h-3 w-full overflow-hidden rounded-full" style={{ background: GRID }}>
              {segments.map((s) =>
                s.value === 0 ? null : (
                  <div
                    key={s.key}
                    style={{
                      width: `${(s.value / total) * 100}%`,
                      background: s.color,
                      marginRight: 2,
                    }}
                  />
                )
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {segments.map((s) => (
                <div key={s.key} className="flex items-center gap-2">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-sm font-semibold tabular-nums">
                      {s.value} <span className="font-normal text-muted-foreground">· {total ? Math.round((s.value / total) * 100) : 0}%</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
