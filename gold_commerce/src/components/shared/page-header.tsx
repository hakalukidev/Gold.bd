import type { ReactNode } from "react";

/** Consistent heading block for dashboard/admin pages — title + optional
 * description on the left, an optional action (button, badge…) on the right.
 * Pass `centered` to stack title/description/action centered instead — used
 * by pages that want the landing page's centered-heading look. */
export function PageHeader({
  title,
  description,
  action,
  centered = false,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  centered?: boolean;
}) {
  if (centered) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        {/* Dot-and-dash flourish flanking the title, like the landing page's
            section headings. */}
        <div className="flex items-center justify-center gap-2.5">
          <span className="flex items-center gap-2">
            <span className="size-1 shrink-0 rounded-full bg-gold" />
            <span className="h-px w-8 shrink-0 bg-gold/40 sm:w-12" />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <span className="flex items-center gap-2">
            <span className="h-px w-8 shrink-0 bg-gold/40 sm:w-12" />
            <span className="size-1 shrink-0 rounded-full bg-gold" />
          </span>
        </div>

        {/* Description and action share one row — wraps only if the
            viewport is too narrow to fit both. */}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
          {action}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
