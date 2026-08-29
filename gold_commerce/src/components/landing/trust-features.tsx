"use client";

import { Gem, Lock, RotateCcw } from "lucide-react";
import { useT } from "@/lib/i18n/use-t";
import { BangladeshMapIcon } from "./bangladesh-map-icon";

const ICONS = [BangladeshMapIcon, Gem, RotateCcw, Lock] as const;

export function TrustFeatures() {
  const t = useT();

  return (
    <div className="flex w-full flex-nowrap items-center justify-between divide-x divide-gold/15">
      {t.hero.trustFeatures.map((feature, i) => {
        const Icon = ICONS[i];
        const isMapIcon = Icon === BangladeshMapIcon;
        return (
          <div key={feature.label} className="flex flex-1 items-center justify-center gap-2 px-2 sm:px-4">
            <Icon
              className={
                isMapIcon
                  ? "h-7 w-5 shrink-0 text-gold sm:h-8 sm:w-6"
                  : "size-6 shrink-0 text-gold sm:size-7"
              }
              strokeWidth={1.5}
            />
            <span className="w-16 text-[9px] leading-tight font-semibold tracking-wide text-neutral-200 uppercase sm:w-20 sm:text-[11px]">
              {feature.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
