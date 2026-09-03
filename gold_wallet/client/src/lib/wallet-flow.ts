import { MOCK_MONTHLY_FLOW } from "@/lib/mock-wallet";
import { CREDIT_TYPES } from "@/lib/transaction-labels";
import type { TransactionSummary } from "@/types";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Beyond this many days a range is bucketed by month instead of by day —
 * ~two months of daily points is already as dense as the axis can label. */
const MAX_DAILY_BUCKETS = 62;

export interface FlowPoint {
  /** "Mon" / "12 Aug" / "Mar" — axis label, granularity-dependent. */
  label: string;
  inBDT: number;
  outBDT: number;
}

export interface WindowTotals {
  inBDT: number;
  outBDT: number;
  netBDT: number;
  /** How many transactions landed in the window — 0 means "no data", not "zero flow". */
  count: number;
}

/** The window the money-flow chart is drawn over, inclusive at both ends. */
export interface DateRange {
  start: Date;
  end: Date;
}

/** Named windows the chart's filter offers next to a custom calendar range. */
export type FlowPreset = "week" | "month" | "year";

/** What the money-flow filter is currently set to: one of the presets, or a
 * range picked day-by-day on the calendar. Kept as the selection rather than
 * the resolved range so a preset stays anchored to "now" across re-renders. */
export type FlowFilter =
  | { kind: "preset"; preset: FlowPreset }
  | { kind: "custom"; start: Date; end: Date };

/** Failed transactions never actually moved money, so nothing here counts them. */
function settled(t: TransactionSummary): boolean {
  return t.status !== "FAILED";
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

/** Whole days since the epoch, computed off the calendar date rather than the
 * timestamp so a DST shift can't drop or double a bucket. */
function dayNumber(d: Date): number {
  return Math.floor(
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS,
  );
}

function monthNumber(d: Date): number {
  return d.getFullYear() * 12 + d.getMonth();
}

/**
 * The range behind each preset: "week" is the last 7 days including today,
 * "month" and "year" run from the first of the current month/year to today —
 * calendar-aligned, so the last point is always the period the user is in.
 */
export function presetRange(preset: FlowPreset, now = new Date()): DateRange {
  const end = endOfDay(now);
  switch (preset) {
    case "week":
      return {
        start: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6),
        end,
      };
    case "month":
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end };
    case "year":
      return { start: new Date(now.getFullYear(), 0, 1), end };
  }
}

/** The range a filter selection resolves to — custom ends are widened to whole
 * days so a range picked as "12th to 12th" still covers that entire day. */
export function filterRange(filter: FlowFilter, now = new Date()): DateRange {
  return filter.kind === "preset"
    ? presetRange(filter.preset, now)
    : { start: startOfDay(filter.start), end: endOfDay(filter.end) };
}

/**
 * Money in/out over the last `days`, optionally offset into the past so the
 * same window can be compared against the one before it (`offsetDays: 30` with
 * `days: 30` gives days 30–60 ago). Direction follows CREDIT_TYPES, the same
 * rule the wallet activity feed colours its amounts by.
 */
export function windowTotals(
  transactions: TransactionSummary[],
  {
    days,
    offsetDays = 0,
    now = Date.now(),
  }: { days: number; offsetDays?: number; now?: number },
): WindowTotals {
  const end = now - offsetDays * DAY_MS;
  const start = end - days * DAY_MS;

  let inBDT = 0;
  let outBDT = 0;
  let count = 0;

  for (const t of transactions) {
    if (!settled(t)) continue;
    const at = new Date(t.createdAt).getTime();
    if (at < start || at > end) continue;
    count++;
    if (CREDIT_TYPES.includes(t.type)) inBDT += Number(t.totalAmountBDT);
    else outBDT += Number(t.totalAmountBDT);
  }

  return { inBDT, outBDT, netBDT: inBDT - outBDT, count };
}

/** Percent change between two window totals — null when there's no earlier
 * window to compare against, so the UI can leave the delta chip off rather
 * than invent a "+100%". */
export function percentChange(
  current: number,
  previous: number,
): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

/** Adds one settled transaction to whichever bucket its `index` names. */
function credit(points: FlowPoint[], index: number, t: TransactionSummary) {
  if (CREDIT_TYPES.includes(t.type))
    points[index].inBDT += Number(t.totalAmountBDT);
  else points[index].outBDT += Number(t.totalAmountBDT);
}

/** Only transactions that actually fall inside the range count — a custom
 * calendar range can start or end mid-month, so the month bucketing below
 * can't rely on its bucket bounds alone. */
function inRange(at: Date, range: DateRange): boolean {
  return at >= range.start && at <= range.end;
}

function buildDailyFlow(
  transactions: TransactionSummary[],
  range: DateRange,
  days: number,
): FlowPoint[] {
  const first = startOfDay(range.start);
  const points: FlowPoint[] = Array.from({ length: days }, (_, i) => {
    const day = new Date(
      first.getFullYear(),
      first.getMonth(),
      first.getDate() + i,
    );
    return {
      // A week reads better by weekday; anything longer needs the date itself.
      label:
        days <= 8
          ? day.toLocaleDateString("en-US", { weekday: "short" })
          : day.toLocaleDateString("en-US", { day: "numeric", month: "short" }),
      inBDT: 0,
      outBDT: 0,
    };
  });

  const firstDay = dayNumber(first);
  for (const t of transactions) {
    if (!settled(t)) continue;
    const at = new Date(t.createdAt);
    if (!inRange(at, range)) continue;
    credit(points, dayNumber(at) - firstDay, t);
  }

  return points;
}

/**
 * Month buckets across the range. Real aggregation belongs on the server;
 * until this repo has one, a feed that doesn't span at least two months can't
 * draw a trend, so those fall back to MOCK_MONTHLY_FLOW rather than rendering
 * a year of empty months. Day-bucketed ranges get no such fallback — a week or
 * a month is short enough that the real feed's gaps are the honest answer.
 */
function buildMonthlyFlow(
  transactions: TransactionSummary[],
  range: DateRange,
): FlowPoint[] {
  const first = startOfDay(range.start);
  const firstMonth = monthNumber(first);
  const months = monthNumber(range.end) - firstMonth + 1;

  const points: FlowPoint[] = Array.from({ length: months }, (_, i) => {
    const month = new Date(first.getFullYear(), first.getMonth() + i, 1);
    return {
      // Past a year the short month name alone stops being unambiguous.
      label: month.toLocaleDateString(
        "en-US",
        months > 12 ? { month: "short", year: "2-digit" } : { month: "short" },
      ),
      inBDT: 0,
      outBDT: 0,
    };
  });

  const monthsWithActivity = new Set<number>();
  for (const t of transactions) {
    if (!settled(t)) continue;
    const at = new Date(t.createdAt);
    if (!inRange(at, range)) continue;
    const index = monthNumber(at) - firstMonth;
    monthsWithActivity.add(index);
    credit(points, index, t);
  }

  if (monthsWithActivity.size >= 2) return points;

  // Align the demo series to the most recent months; if fewer months of demo
  // data exist than the range covers, the earliest points just stay empty.
  const demo = MOCK_MONTHLY_FLOW.slice(-months);
  const offset = points.length - demo.length;
  return points.map((p, i) =>
    demo[i - offset] ? { ...p, ...demo[i - offset] } : p,
  );
}

/**
 * Money in/out bucketed across `range`, oldest first — by day for ranges up to
 * ~two months, by month beyond that, so the axis stays readable whether the
 * filter is set to a week or to several years.
 */
export function buildFlow(
  transactions: TransactionSummary[],
  range: DateRange,
): FlowPoint[] {
  const days = dayNumber(range.end) - dayNumber(range.start) + 1;
  if (days < 1) return [];
  return days <= MAX_DAILY_BUCKETS
    ? buildDailyFlow(transactions, range, days)
    : buildMonthlyFlow(transactions, range);
}

/** "12 Aug – 25 Aug 2026" — the range restated next to the filter. */
export function formatRange({ start, end }: DateRange): string {
  const sameYear = start.getFullYear() === end.getFullYear();
  const from = start.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  const to = end.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return from === to ? to : `${from} – ${to}`;
}
