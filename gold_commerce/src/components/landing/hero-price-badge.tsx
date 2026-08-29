"use client";

import { useT } from "@/lib/i18n/use-t";
import { TrendArrowIcon } from "./trend-arrow-icon";

export function HeroPriceBadge() {
  const t = useT();
  const { label, price, changeAbs, changePct } = t.hero.priceBadge;

  return (
    <div className="inline-flex flex-wrap items-baseline gap-x-2.5 gap-y-1 text-sm">
      <span className="text-xs font-medium text-neutral-300">{label}</span>
      <span className="text-base font-bold text-white">{price}</span>
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-400">
        <TrendArrowIcon direction="down" className="size-2.5" />
        {changeAbs} ({changePct})
      </span>
    </div>
  );
}
