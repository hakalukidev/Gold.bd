import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Icon + label + value tile, used for wallet/rate/summary stats across the
 * dashboard and admin pages. Kept on the neutral shadcn theme (light/dark
 * aware) with a small gold accent chip for brand identity, matching the
 * icon-chip pattern already used on the marketing page's features section. */
export function StatCard({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn(className)}>
      <CardContent className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-gold">
          <Icon className="size-4.5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="truncate text-xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
