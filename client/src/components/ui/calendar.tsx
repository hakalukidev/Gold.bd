"use client";

import { useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function isBetween(day: Date, a: Date, b: Date) {
  const [from, to] = isAfter(a, b) ? [b, a] : [a, b];
  return !isBefore(day, from) && !isAfter(day, to);
}

/**
 * Two-click range calendar: the first click sets the start, the second closes
 * the range (either direction — clicking backwards is read as start/end
 * swapped rather than rejected). Days after `max` can't be picked, since a
 * wallet has no flow in the future.
 */
export function RangeCalendar({
  start,
  end,
  onSelect,
  max = new Date(),
  className,
}: {
  start: Date | null;
  end: Date | null;
  onSelect: (start: Date, end: Date) => void;
  max?: Date;
  className?: string;
}) {
  const [month, setMonth] = useState(() => startOfMonth(start ?? max));
  // Set while the range is half-picked, so the grid can preview the span the
  // pointer is currently over.
  const [pendingStart, setPendingStart] = useState<Date | null>(null);
  const [hovered, setHovered] = useState<Date | null>(null);

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month)),
    end: endOfWeek(endOfMonth(month)),
  });

  const previewStart = pendingStart ?? start;
  const previewEnd = pendingStart ? hovered : end;

  function handleClick(day: Date) {
    if (pendingStart) {
      setPendingStart(null);
      setHovered(null);
      onSelect(
        isAfter(day, pendingStart) ? pendingStart : day,
        isAfter(day, pendingStart) ? day : pendingStart,
      );
      return;
    }
    setPendingStart(day);
    setHovered(day);
  }

  return (
    <div className={cn("w-fit select-none", className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setMonth(addMonths(month, -1))}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-sm font-medium">{format(month, "MMMM yyyy")}</span>
        <button
          type="button"
          aria-label="Next month"
          disabled={!isBefore(endOfMonth(month), max)}
          onClick={() => setMonth(addMonths(month, 1))}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-0.5 text-center">
        {WEEKDAYS.map((day) => (
          <span
            key={day}
            className="pb-1 text-[10px] font-medium text-muted-foreground"
          >
            {day}
          </span>
        ))}

        {days.map((day) => {
          const disabled = isAfter(day, max);
          const isEdge =
            (previewStart && isSameDay(day, previewStart)) ||
            (previewEnd && isSameDay(day, previewEnd));
          const inRange =
            previewStart && previewEnd && isBetween(day, previewStart, previewEnd);

          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={disabled}
              onClick={() => handleClick(day)}
              onPointerEnter={() => pendingStart && setHovered(day)}
              className={cn(
                "size-8 rounded-md text-xs tabular-nums transition-colors",
                !isSameMonth(day, month) && "text-muted-foreground/50",
                inRange && !isEdge && "bg-gold/15 text-foreground",
                isEdge && "bg-gold font-semibold text-ink",
                !isEdge && !inRange && "hover:bg-accent",
                disabled && "pointer-events-none opacity-30",
              )}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
