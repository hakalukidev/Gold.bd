import type { ReactNode } from "react";
import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** "+4.2%" pill — renders nothing when there's no earlier period to compare
 * against, rather than inventing a delta the data can't support. Money-out is
 * the one figure where a rise is the bad direction, hence `invertColor`. */
export function DeltaChip({ pct, invertColor = false }: { pct: number | null; invertColor?: boolean }) {
  if (pct === null) return null;
  const up = pct >= 0;
  const good = invertColor ? !up : up;

  return (
    <span
      className={cn(
        "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
        good ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
      )}
    >
      {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {Math.abs(pct).toFixed(2)}%
    </span>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{children}</p>;
}

/** Money in / money out / net tile — shared by the wallet page and the
 * History page so the two always describe a window the same way. */
export function FlowStatTile({
  icon: Icon,
  label,
  value,
  pct,
  invertColor,
  accent,
  caption = "Last 30 days",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  pct: number | null;
  invertColor?: boolean;
  accent: string;
  caption?: string;
}) {
  return (
    <Card size="sm">
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2">
          <span className={cn("flex size-7 items-center justify-center rounded-md", accent)}>
            <Icon className="size-3.5" strokeWidth={2} />
          </span>
          <SectionLabel>{label}</SectionLabel>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xl font-bold tracking-tight tabular-nums">{value}</p>
          <DeltaChip pct={pct} invertColor={invertColor} />
        </div>
        <p className="text-[11px] text-muted-foreground">{caption}</p>
      </CardContent>
    </Card>
  );
}

/** Tailwind classes for the three tile accents, kept next to the tile so the
 * wallet and History pages can't drift into different colour pairings. */
export const FLOW_ACCENT = {
  in: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  out: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  net: "border border-gold/25 bg-gold/10 text-gold",
} as const;
