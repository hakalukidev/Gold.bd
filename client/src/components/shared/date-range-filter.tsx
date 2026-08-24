"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { RangeCalendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  filterRange,
  formatRange,
  type FlowFilter,
  type FlowPreset,
} from "@/lib/wallet-flow";
import { cn } from "@/lib/utils";

const PRESETS: { key: FlowPreset; label: string }[] = [
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
];

/**
 * Week / Month / Year presets plus a calendar for any other span, sharing one
 * selection so exactly one of the four always reads as active. The resolved
 * range is spelled out underneath the presets — "Month" alone doesn't say
 * which month, and a custom range needs its dates stated somewhere.
 */
export function DateRangeFilter({
  value,
  onChange,
  className,
}: {
  value: FlowFilter;
  onChange: (filter: FlowFilter) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const range = filterRange(value);
  const custom = value.kind === "custom";

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div className="flex rounded-md border p-0.5">
        {PRESETS.map(({ key, label }) => {
          const active = value.kind === "preset" && value.preset === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => onChange({ kind: "preset", preset: key })}
              className={cn(
                "rounded-md px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                active
                  ? "bg-gold/15 text-gold-accent"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={cn(
            "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors",
            custom
              ? "border-gold/40 bg-gold/15 text-gold-accent"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <CalendarDays className="size-3.5" />
          {custom ? formatRange(range) : "Calendar"}
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-3">
          <RangeCalendar
            start={range.start}
            end={range.end}
            onSelect={(start, end) => {
              onChange({ kind: "custom", start, end });
              setOpen(false);
            }}
          />
          <p className="mt-2 border-t pt-2 text-center text-[11px] text-muted-foreground">
            {formatRange(range)}
          </p>
        </PopoverContent>
      </Popover>
    </div>
  );
}
