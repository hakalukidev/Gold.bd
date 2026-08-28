"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarClock, CalendarDays, CalendarRange, Sparkles } from "lucide-react";
import { useMetalRate } from "@/hooks/use-metal-rate";
import { formatBDT, formatDateTime } from "@/lib/format";
import type { Metal } from "@/lib/mock-rates";
import { METAL_LABEL, METALS } from "@/lib/trade-products";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { EmptyState } from "@/components/shared/empty-state";
import { SELECTED_GOLD, SELECTED_SILVER } from "@/components/shared/payment-method-button";
import { cn } from "@/lib/utils";

type Frequency = "Daily" | "Weekly" | "Monthly";

const FREQUENCIES: Frequency[] = ["Daily", "Weekly", "Monthly"];
const PERIODS_PER_YEAR: Record<Frequency, number> = { Daily: 365, Weekly: 52, Monthly: 12 };
const FREQUENCY_ICON: Record<Frequency, typeof CalendarDays> = { Daily: CalendarDays, Weekly: CalendarRange, Monthly: CalendarClock };

// A small bullion-ingot glyph — lucide has coin/bank icons but nothing bar-
// shaped, and this sits before "Gold"/"Silver" where a bar reads truer than a
// stack of coins. Drawn in lucide's own stroke style (24x24, currentColor) so
// it inherits the button's gold/silver tint like every other icon here.
function BarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M7 8h10l3 9H4l3-9Z" />
      <path d="M9.5 12.5h5" />
    </svg>
  );
}

const MIN_AMOUNT = 5;
const MAX_AMOUNT = 20000;

// Non-uniform tick set so the slider steps coarsen with the amount — 5, 10,
// 15 … 45, then 50, 100 … 450, then 500, 1000 … MAX_AMOUNT. The slider itself
// only ever moves across this array by index; the free-text input beside it
// covers anything in between, fractions included.
function buildAmountTicks(max: number) {
  const ticks: number[] = [];
  for (let v = 5; v < 50; v += 5) ticks.push(v);
  for (let v = 50; v < 500; v += 50) ticks.push(v);
  for (let v = 500; v <= max; v += 500) ticks.push(v);
  return ticks;
}

const AMOUNT_TICKS = buildAmountTicks(MAX_AMOUNT);

function nearestTickIndex(amount: number) {
  let closest = 0;
  let smallestDiff = Infinity;
  AMOUNT_TICKS.forEach((tick, i) => {
    const diff = Math.abs(tick - amount);
    if (diff < smallestDiff) {
      smallestDiff = diff;
      closest = i;
    }
  });
  return closest;
}

interface AutoSavePlan {
  id: string;
  metal: Metal;
  frequency: Frequency;
  amountBDT: number;
  since: Date;
  totalSavedBDT: number;
}

// Illustrative starting plans — there's no /api/auto-save endpoint in this
// repo (see CLAUDE.md), so plans live in local component state only and
// reset on reload; "Start plan" below just appends to this same list.
const INITIAL_PLANS: AutoSavePlan[] = [
  { id: "seed-monthly", metal: "gold", frequency: "Monthly", amountBDT: 1000, since: new Date("2026-01-05"), totalSavedBDT: 9000 },
  { id: "seed-weekly", metal: "silver", frequency: "Weekly", amountBDT: 500, since: new Date("2026-03-02"), totalSavedBDT: 3500 },
];

export function AutoSavePanel() {
  const [metal, setMetal] = useState<Metal>("gold");
  const { data: rate } = useMetalRate(metal);
  const [frequency, setFrequency] = useState<Frequency>("Monthly");
  const [amount, setAmount] = useState(1000);
  const [amountInput, setAmountInput] = useState("1000");
  const [plans, setPlans] = useState<AutoSavePlan[]>(INITIAL_PLANS);

  const isSilver = metal === "silver";
  const selectedAccent = isSilver ? SELECTED_SILVER : SELECTED_GOLD;
  const pricePerGram = rate ? Number(rate.pricePerGramBDT) : null;
  const projectedGrams = pricePerGram ? (amount * PERIODS_PER_YEAR[frequency]) / pricePerGram : null;
  const tickIndex = useMemo(() => nearestTickIndex(amount), [amount]);

  // Rounds to 2 decimals so someone entering a fraction (e.g. 12.5) doesn't
  // pick up float noise, then keeps the visible input text in sync.
  function commitAmount(next: number) {
    const clamped = Math.max(MIN_AMOUNT, Math.round(next * 100) / 100);
    setAmount(clamped);
    setAmountInput(String(clamped));
  }

  function handleAmountInputChange(raw: string) {
    setAmountInput(raw);
    const parsed = Number(raw);
    if (raw.trim() !== "" && Number.isFinite(parsed) && parsed > 0) {
      setAmount(parsed);
    }
  }

  function handleAmountInputBlur() {
    const parsed = Number(amountInput);
    commitAmount(amountInput.trim() !== "" && Number.isFinite(parsed) && parsed > 0 ? parsed : MIN_AMOUNT);
  }

  function startPlan() {
    setPlans((prev) => [{ id: crypto.randomUUID(), metal, frequency, amountBDT: amount, since: new Date(), totalSavedBDT: 0 }, ...prev]);
    toast.success(`${frequency} ${METAL_LABEL[metal]} Auto-Save plan started`);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px] lg:items-start">
      <Card>
        <CardHeader>
          <CardTitle>Set up a new plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Metal</Label>
            <div className="grid grid-cols-2 gap-2">
              {METALS.map((m) => (
                <Button
                  key={m}
                  type="button"
                  variant="outline"
                  aria-pressed={metal === m}
                  className={cn(metal === m && (m === "gold" ? SELECTED_GOLD : SELECTED_SILVER))}
                  onClick={() => setMetal(m)}
                >
                  <BarIcon className="size-4" />
                  {METAL_LABEL[m]}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Frequency</Label>
            <div className="flex gap-2">
              {FREQUENCIES.map((f) => {
                const Icon = FREQUENCY_ICON[f];
                return (
                  <Button key={f} type="button" variant="outline" className={cn(frequency === f && selectedAccent)} onClick={() => setFrequency(f)}>
                    <Icon className="size-4" />
                    {f}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Amount per {frequency.toLowerCase()}</Label>
              <div className="relative w-28">
                <Input
                  type="number"
                  inputMode="decimal"
                  min={MIN_AMOUNT}
                  step="any"
                  value={amountInput}
                  onChange={(e) => handleAmountInputChange(e.target.value)}
                  onBlur={handleAmountInputBlur}
                  className="pr-7 text-right text-sm font-semibold"
                />
                <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-muted-foreground">৳</span>
              </div>
            </div>
            <Slider value={tickIndex} min={0} max={AMOUNT_TICKS.length - 1} step={1} onValueChange={(i) => commitAmount(AMOUNT_TICKS[i])} />
            <p className="text-xs text-muted-foreground">Drag in steps of 5, 50, then 500 as the amount grows — or type an exact amount, fractions included.</p>
          </div>

          <div className="rounded-md bg-muted px-4 py-3">
            <p className="text-sm text-muted-foreground">Projected {METAL_LABEL[metal].toLowerCase()} in 1 year</p>
            <p className={cn("mt-1 text-2xl font-semibold", isSilver ? "text-foreground" : "text-gold")}>
              {projectedGrams !== null ? `${projectedGrams.toFixed(3)} g` : "…"}
            </p>
          </div>

          <Button variant={isSilver ? "silver-solid" : "gold-solid"} className="w-full" onClick={startPlan}>
            Start {frequency} {METAL_LABEL[metal]} plan · {formatBDT(amount)}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active plans</CardTitle>
        </CardHeader>
        <CardContent>
          {plans.length === 0 ? (
            <EmptyState icon={Sparkles} title="No plans yet" description="Set up a plan to start saving automatically." />
          ) : (
            <div className="space-y-3">
              {plans.map((plan) => (
                <div key={plan.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">
                      {plan.frequency} {METAL_LABEL[plan.metal]} Auto-Save
                    </p>
                    <Badge className="bg-emerald-500/15 text-emerald-500">Active</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Since {formatDateTime(plan.since).split(",")[0]} · {formatBDT(plan.totalSavedBDT)} saved
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
