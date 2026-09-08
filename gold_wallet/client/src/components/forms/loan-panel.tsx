"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Building2, CalendarClock, Smartphone } from "lucide-react";
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
import { useTranslation } from "@/lib/i18n/use-translation";

const LTV_RATE = 0.8;
const INTEREST_RATE_PER_YEAR = 0.13;
const TENURES = [3, 6, 12] as const;
const DISBURSE_METHODS = ["Mobile Wallet", "Bank Account"] as const;
// Same labels/icons as sell-gold-panel's PAYOUT_METHODS, so "Mobile Wallet"
// and "Bank Account" read consistently wherever a payout method shows up.
const DISBURSE_ICON: Record<(typeof DISBURSE_METHODS)[number], typeof Smartphone> = {
  "Mobile Wallet": Smartphone,
  "Bank Account": Building2,
};
const DISBURSE_LABEL_KEY: Record<(typeof DISBURSE_METHODS)[number], string> = {
  "Mobile Wallet": "loanPanel.disburseMethods.mobileWallet",
  "Bank Account": "loanPanel.disburseMethods.bankAccount",
};

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
  const { t } = useTranslation();
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
    toast.success(t("loanPanel.applicationSubmitted", { amount: formatBDT(clampedAmount) }));
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px] lg:items-start">
      <Card>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-md bg-muted px-4 py-3 text-sm">
            <div>
              <p className="text-muted-foreground">{t("loanPanel.yourCollateral")}</p>
              <p className="font-semibold">
                {collateralGrams !== null ? t("loanPanel.gGoldVaulted", { grams: collateralGrams.toFixed(2) }) : "…"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground">{t("loanPanel.maxEligible")}</p>
              <p className="font-semibold text-gold">{maxEligible !== null ? formatBDT(maxEligible) : "…"}</p>
            </div>
          </div>

          <div className="space-y-3 text-center">
            <Label className="block text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t("loanPanel.loanAmount")}
            </Label>
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
            <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t("loanPanel.tenure")}
            </Label>
            <div className="flex gap-2">
              {TENURES.map((months) => (
                <Button
                  key={months}
                  type="button"
                  variant="outline"
                  className={cn(tenure === months && SELECTED_GOLD)}
                  onClick={() => setTenure(months)}
                >
                  <CalendarClock className="size-4" />
                  {t("loanPanel.months", { n: months })}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t("loanPanel.disburseTo")}
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {DISBURSE_METHODS.map((m) => {
                const Icon = DISBURSE_ICON[m];
                return (
                  <Button
                    key={m}
                    type="button"
                    variant="outline"
                    className={cn("h-auto gap-1.5 py-2.5 whitespace-normal", disburseTo === m && SELECTED_GOLD)}
                    onClick={() => setDisburseTo(m)}
                  >
                    <Icon className="size-4" />
                    {t(DISBURSE_LABEL_KEY[m])}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2 text-center">
            <Button variant="gold-solid" className="w-full" disabled={!maxEligible || clampedAmount <= 0} onClick={apply}>
              {t("loanPanel.applyForLoan", { amount: formatBDT(clampedAmount) })}
            </Button>
            <p className="text-xs text-muted-foreground">{t("loanPanel.insuredNote")}</p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{t("loanPanel.summary.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <SummaryRow label={t("loanPanel.summary.principal")} value={formatBDT(clampedAmount)} />
            <SummaryRow
              label={t("loanPanel.summary.interestRate")}
              value={t("loanPanel.summary.interestRateValue", { pct: INTEREST_RATE_PER_YEAR * 100 })}
            />
            <SummaryRow
              label={t("loanPanel.summary.totalInterest", { months: tenure })}
              value={formatBDT(totalInterest)}
            />
            <div className="flex items-center justify-between text-base font-semibold">
              <span>{t("loanPanel.summary.monthlyEmi")}</span>
              <span className="tabular-nums">{formatBDT(monthlyEmi)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("loanPanel.activeLoan.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-medium">
                {t("loanPanel.activeLoan.principalTenure", {
                  principal: formatBDT(ACTIVE_LOAN.principalBDT),
                  months: ACTIVE_LOAN.tenureMonths,
                })}
              </p>
              <Badge className="bg-emerald-500/15 text-emerald-500">{t("loanPanel.activeLoan.onTrack")}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("loanPanel.activeLoan.progress", {
                paid: ACTIVE_LOAN.emisPaid,
                total: ACTIVE_LOAN.tenureMonths,
                date: ACTIVE_LOAN.nextDueLabel,
              })}
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
