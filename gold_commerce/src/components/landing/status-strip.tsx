"use client";

import { useSyncExternalStore } from "react";
import { useAppSelector } from "@/store/hooks";
import { useT } from "@/lib/i18n/use-t";

// getSnapshot must return a stable value between calls when nothing has
// changed — returning a fresh Date.now() on every call makes React think
// the store changes on every render, which is an infinite update loop.
// Cache it and only advance the cached value on the interval tick.
let cachedNowMs = Date.now();

function subscribeToClock(callback: () => void) {
  const id = setInterval(() => {
    cachedNowMs = Date.now();
    callback();
  }, 30_000);
  return () => clearInterval(id);
}

function getClockSnapshot() {
  return cachedNowMs;
}

// Server has no wall clock to render against, so it renders no time —
// the client fills it in on mount, avoiding a hydration mismatch.
function getServerClockSnapshot() {
  return null;
}

export function StatusStrip() {
  const locale = useAppSelector((state) => state.ui.locale);
  const t = useT();
  const nowMs = useSyncExternalStore(subscribeToClock, getClockSnapshot, getServerClockSnapshot);
  const now = nowMs === null ? null : new Date(nowMs);

  const dateLabel = now
    ? new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-BD", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(now)
    : "";

  const timeLabel = now
    ? locale === "bn"
      ? new Intl.DateTimeFormat("bn-BD", { hour: "numeric", minute: "2-digit", dayPeriod: "short" }).format(now)
      : new Intl.DateTimeFormat("en-BD", { hour: "numeric", minute: "2-digit", hour12: true }).format(now)
    : "";

  return (
    <div className="w-full border-b border-[rgba(212,166,42,0.15)] bg-black">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-end gap-x-6 gap-y-1 px-4 py-2 text-[11px] font-medium text-neutral-400 sm:px-6 lg:px-8">
        <span className="tabular-nums">
          {dateLabel} <span className="text-neutral-600">·</span> {t.statusStrip.city}
        </span>
        <span aria-hidden="true" className="hidden h-3 w-px bg-[rgba(212,166,42,0.25)] sm:block" />
        <span className="hidden items-center gap-1.5 sm:flex">
          {t.statusStrip.rateSource}
          <span className="font-semibold text-gold/80">BAJUS</span>
          <span aria-hidden="true" className="text-neutral-600">
            •
          </span>
          <span className="font-semibold text-gold/80">XAU/USD</span>
        </span>
        <span aria-hidden="true" className="h-3 w-px bg-[rgba(212,166,42,0.25)]" />
        <span className="tabular-nums">{timeLabel}</span>
      </div>
    </div>
  );
}
