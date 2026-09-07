"use client";

import { Button } from "@/components/ui/button";
import { SELECTED_GOLD } from "@/components/shared/payment-method-button";
import { cn } from "@/lib/utils";

export type GoldKarat = 22 | 21 | 18;

export function KaratSelector({ value, onChange }: { value: GoldKarat; onChange: (value: GoldKarat) => void }) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Gold karat</legend>
      <div className="grid grid-cols-3 gap-2">
        {([22, 21, 18] as const).map((karat) => (
          <Button
            key={karat}
            type="button"
            variant="outline"
            aria-pressed={value === karat}
            onClick={() => onChange(karat)}
            className={cn(
              "h-11 rounded-xl border-border/70 bg-background/50 font-semibold transition-colors hover:border-gold/50",
              value === karat && SELECTED_GOLD
            )}
          >
            {karat}K
          </Button>
        ))}
      </div>
    </fieldset>
  );
}
