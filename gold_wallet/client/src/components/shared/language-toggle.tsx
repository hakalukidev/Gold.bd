"use client";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setLocale, type Locale } from "@/store/slices/ui-slice";
import { cn } from "@/lib/utils";

const OPTIONS: { id: Locale; label: string }[] = [
  { id: "en", label: "EN" },
  { id: "bn", label: "বাং" },
];

/** EN / বাং segmented switch for the dashboard chrome. The landing header keeps
 * its own copy because that surface is on the fixed dark brand palette (see
 * CLAUDE.md) while this one follows the neutral shadcn theme tokens. */
export function LanguageToggle({ className }: { className?: string }) {
  const locale = useAppSelector((state) => state.ui.locale);
  const dispatch = useAppDispatch();

  return (
    <div className={cn("flex items-center gap-0.5 rounded-full border bg-muted/60 p-0.5", className)}>
      {OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => dispatch(setLocale(opt.id))}
          aria-pressed={locale === opt.id}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-bold transition-colors",
            locale === opt.id
              ? "bg-gold text-ink"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
