"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { useGoldRate } from "@/hooks/use-gold-rate";
import { formatBDT, formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/shared/empty-state";
import { SELECTED_GOLD } from "@/components/shared/payment-method-button";
import { cn } from "@/lib/utils";

type Frequency = "Daily" | "Weekly" | "Monthly";

const FREQUENCIES: Frequency[] = ["Daily", "Weekly", "Monthly"];
const PERIODS_PER_YEAR: Record<Frequency, number> = { Daily: 365, Weekly: 52, Monthly: 12 };
const AMOUNT_PRESETS = [500, 1000, 2000, 5000];

interface AutoSavePlan {
  id: string;
  frequency: Frequency;
  amountBDT: number;
  since: Date;
  totalSavedBDT: number;
}

// Illustrative starting plans — there's no /api/auto-save endpoint in this
// repo (see CLAUDE.md), so plans live in local component state only and
// reset on reload; "Start plan" below just appends to this same list.
const INITIAL_PLANS: AutoSavePlan[] = [
  { id: "seed-monthly", frequency: "Monthly", amountBDT: 1000, since: new Date("2026-01-05"), totalSavedBDT: 9000 },
  { id: "seed-weekly", frequency: "Weekly", amountBDT: 500, since: new Date("2026-03-02"), totalSavedBDT: 3500 },
];

export function AutoSavePanel() {
  const { data: rate } = useGoldRate();
  const [frequency, setFrequency] = useState<Frequency>("Monthly");
  const [amount, setAmount] = useState(1000);
  const [plans, setPlans] = useState<AutoSavePlan[]>(INITIAL_PLANS);

  const pricePerGram = rate ? Number(rate.pricePerGramBDT) : null;
  const projectedGrams = pricePerGram ? (amount * PERIODS_PER_YEAR[frequency]) / pricePerGram : null;

  function startPlan() {
    setPlans((prev) => [{ id: crypto.randomUUID(), frequency, amountBDT: amount, since: new Date(), totalSavedBDT: 0 }, ...prev]);
    toast.success(`${frequency} Auto-Save plan started`);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px] lg:items-start">
      <Card>
        <CardHeader>
          <CardTitle>Set up a new plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Frequency</Label>
            <div className="flex gap-2">
              {FREQUENCIES.map((f) => (
                <Button key={f} type="button" variant="outline" className={cn(frequency === f && SELECTED_GOLD)} onClick={() => setFrequency(f)}>
                  {f}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Amount per {frequency.toLowerCase()}</Label>
            <div className="flex flex-wrap gap-2">
              {AMOUNT_PRESETS.map((preset) => (
                <Button key={preset} type="button" variant="outline" className={cn(amount === preset && SELECTED_GOLD)} onClick={() => setAmount(preset)}>
                  {preset.toLocaleString("en-BD")}
                </Button>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-muted px-4 py-3">
            <p className="text-sm text-muted-foreground">Projected gold in 1 year</p>
            <p className="mt-1 text-2xl font-semibold text-gold">{projectedGrams !== null ? `${projectedGrams.toFixed(3)} g` : "…"}</p>
          </div>

          <Button variant="gold-solid" className="w-full" onClick={startPlan}>
            Start {frequency} plan · {formatBDT(amount)}
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
                <div key={plan.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{plan.frequency} Auto-Save</p>
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
