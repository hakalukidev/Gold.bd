"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useWallet } from "@/hooks/use-wallet";
import { useGoldRate } from "@/hooks/use-gold-rate";
import { formatBDT } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { SELECTED_GOLD } from "@/components/shared/payment-method-button";
import { cn } from "@/lib/utils";

const LTV_RATE = 0.8;
const INTEREST_RATE_PER_YEAR = 0.13;
const TENURES = [3, 6, 12] as const;
const DISBURSE_METHODS = ["Mobile Wallet", "Bank Account"] as const;

// Illustrative existing loan — there's no /api/loans endpoint in this repo
// (see CLAUDE.md); a real "Apply" doesn't create one of these, it's shown
// for layout parity with the reference design.
const ACTIVE_LOAN = {
  principalBDT: 18000,
  tenureMonths: 6,
  emisPaid: 2,
  nextDueLabel: "05 Sep 2026",
};

export function LoanPanel() {
  const { data: wallet } = useWallet();
  const { data: rate } = useGoldRate();
  const [tenure, setTenure] = useState<(typeof TENURES)[number]>(6);
  const [disburseTo, setDisburseTo] = useState<(typeof DISBURSE_METHODS)[number]>("Mobile Wallet");

  const collateralGrams = wallet ? Number(wallet.goldBalanceGrams) : null;
  const pricePerGram = rate ? Number(rate.pricePerGramBDT) : null;
  const maxEligible = collateralGrams !== null && pricePerGram !== null ? collateralGrams * pricePerGram * LTV_RATE : null;

  const [amount, setAmount] = useState(20000);
  const sliderMax = maxEligible && maxEligible > 0 ? maxEligible : 1;
  const clampedAmount = Math.min(amount, sliderMax);

  const totalInterest = clampedAmount * INTEREST_RATE_PER_YEAR * (tenure / 12);
  const monthlyEmi = (clampedAmount + totalInterest) / tenure;

  function apply() {
    toast.success(`Loan application for ${formatBDT(clampedAmount)} submitted`);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px] lg:items-start">
      <Card>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-md bg-muted px-4 py-3 text-sm">
            <div>
              <p className="text-muted-foreground">Your collateral</p>
              <p className="font-semibold">{collateralGrams !== null ? `${collateralGrams.toFixed(2)} g gold vaulted` : "…"}</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground">Max eligible (80% LTV)</p>
              <p className="font-semibold text-gold">{maxEligible !== null ? formatBDT(maxEligible) : "…"}</p>
            </div>
          </div>

          <div className="space-y-3 text-center">
            <Label className="block text-xs font-semibold tracking-wide text-muted-foreground uppercase">Loan amount</Label>
            <p className="text-4xl font-semibold">{formatBDT(clampedAmount)}</p>
            <Slider
              value={clampedAmount}
              min={0}
              max={sliderMax}
              step={500}
              disabled={!maxEligible}
              onValueChange={(v) => setAmount(Math.round(v))}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Tenure</Label>
            <div className="flex gap-2">
              {TENURES.map((t) => (
                <Button key={t} type="button" variant="outline" className={cn(tenure === t && SELECTED_GOLD)} onClick={() => setTenure(t)}>
                  {t} Months
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Disburse to</Label>
            <div className="grid grid-cols-2 gap-2">
              {DISBURSE_METHODS.map((m) => (
                <Button
                  key={m}
                  type="button"
                  variant="outline"
                  className={cn("h-auto py-2.5 whitespace-normal", disburseTo === m && SELECTED_GOLD)}
                  onClick={() => setDisburseTo(m)}
                >
                  {m}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2 text-center">
            <Button variant="gold-solid" className="w-full" disabled={!maxEligible || clampedAmount <= 0} onClick={apply}>
              Apply for {formatBDT(clampedAmount)} loan
            </Button>
            <p className="text-xs text-muted-foreground">Your gold stays insured in vault; released on full repayment</p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Loan summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <SummaryRow label="Principal" value={formatBDT(clampedAmount)} />
            <SummaryRow label="Interest rate" value={`${INTEREST_RATE_PER_YEAR * 100}% p.a.`} />
            <SummaryRow label={`Total interest (${tenure} Months)`} value={formatBDT(totalInterest)} />
            <div className="flex items-center justify-between text-base font-semibold">
              <span>Monthly EMI</span>
              <span className="tabular-nums">{formatBDT(monthlyEmi)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active loan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-medium">
                {formatBDT(ACTIVE_LOAN.principalBDT)} · {ACTIVE_LOAN.tenureMonths} Months
              </p>
              <Badge className="bg-emerald-500/15 text-emerald-500">On Track</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {ACTIVE_LOAN.emisPaid} of {ACTIVE_LOAN.tenureMonths} EMIs paid · Next due {ACTIVE_LOAN.nextDueLabel}
            </p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-gold" style={{ width: `${(ACTIVE_LOAN.emisPaid / ACTIVE_LOAN.tenureMonths) * 100}%` }} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}
