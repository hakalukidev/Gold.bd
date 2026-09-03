import type { LucideIcon } from "lucide-react";

/** Icon + message placeholder for empty tables/lists (no transactions yet,
 * nothing pending, etc.) — replaces bare "No X yet." text. */
export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" strokeWidth={1.75} />
      </span>
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="max-w-xs text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}
