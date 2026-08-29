"use client";

import { useAppSelector } from "@/store/hooks";
import { cn } from "@/lib/utils";

/**
 * Static placeholder rates for the scrolling ticker — this platform's real
 * price comes from useGoldRate()/the admin panel, not an external market
 * feed, so this strip is intentionally dummy/decorative only.
 */
type TickerItem = {
  label: string;
  value: string;
  meta?: string;
  metaTone?: "up" | "down" | "neutral";
};

const TICKER_DATA: Record<"bn" | "en", TickerItem[]> = {
  bn: [
    { label: "USD/BDT", value: "৳১২১.৯০", meta: "ইন্টারব্যাংক" },
    { label: "২২ক্যা/গ্রাম", value: "৳২০,০২৪", meta: "−০.২০%", metaTone: "down" },
    { label: "২২ক্যা/ভরি", value: "৳২,৩৩,৫৬৪", meta: "BAJUS" },
    { label: "২৪ক্যা/গ্রাম", value: "৳২১,৮৩৯", meta: "৯৯.৯%" },
    { label: "২১ক্যা/গ্রাম", value: "৳১৯,১২৭", meta: "৮৭.৫%" },
    { label: "১৮ক্যা/গ্রাম", value: "৳১৬,৪২২", meta: "৭৫.০%" },
    { label: "রূপা/গ্রাম", value: "৳৩৮৫", meta: "—" },
    { label: "XAU/USD", value: "$৩,৪১২", meta: "স্পট" },
  ],
  en: [
    { label: "USD/BDT", value: "121.90", meta: "interbank" },
    { label: "22kt/g", value: "৳20,024", meta: "−0.20%", metaTone: "down" },
    { label: "22kt/bhori", value: "৳2,33,564", meta: "BAJUS" },
    { label: "24kt/g", value: "৳21,839", meta: "99.9%" },
    { label: "21kt/g", value: "৳19,127", meta: "87.5%" },
    { label: "18kt/g", value: "৳16,422", meta: "75.0%" },
    { label: "Silver/g", value: "৳385", meta: "—" },
    { label: "XAU/USD", value: "$3,412", meta: "spot" },
  ],
};

function TickerRow({ items }: { items: TickerItem[] }) {
  return (
    <div className="flex shrink-0 items-center">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2 whitespace-nowrap px-5 py-1.5 text-xs">
          <span className="text-amber-50/90">{item.label}</span>
          <span className="font-semibold text-white">{item.value}</span>
          {item.meta && (
            <span
              className={cn(
                "text-[10px] font-medium",
                item.metaTone === "down" && "text-red-400",
                item.metaTone === "up" && "text-emerald-400",
                (!item.metaTone || item.metaTone === "neutral") &&
                  (item.meta === "BAJUS" || item.meta?.includes("%") ? "text-ink/70" : "text-amber-100/80")
              )}
            >
              {item.meta}
            </span>
          )}
          <span className="text-ink/40" aria-hidden="true">
            •
          </span>
        </div>
      ))}
    </div>
  );
}

export function GoldPriceTicker() {
  const locale = useAppSelector((state) => state.ui.locale);
  const items = TICKER_DATA[locale];

  return (
    <div className="relative w-full overflow-hidden border-b border-gold-light/40 bg-linear-to-r from-[#4a3308] via-[#b8891a] to-[#e8c66a]">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-linear-to-r from-[#4a3308] to-transparent sm:w-16" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-linear-to-l from-[#4a3308] to-transparent sm:w-16" />
      <div className="flex w-max animate-[ticker-scroll_35s_linear_infinite] hover:[animation-play-state:paused]">
        <TickerRow items={items} />
        <TickerRow items={items} />
      </div>
    </div>
  );
}
