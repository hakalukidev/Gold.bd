"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDownRight, Wallet as WalletIcon } from "lucide-react";
import { tradeGramsSchema } from "@/lib/validations/gold";
import { ApiError } from "@/lib/api-client";
import { useSellMetal } from "@/hooks/use-gold-trade";
import { useMetalRate } from "@/hooks/use-metal-rate";
import { useWallet } from "@/hooks/use-wallet";
import { computeSellPayout, SELL_SPREAD_RATE } from "@/lib/gold-fees";
import { formatBDT } from "@/lib/format";
import { getLatestRate, type Metal } from "@/lib/mock-rates";
import { MOCK_WALLET } from "@/lib/mock-wallet";
import { METAL_LABEL, METALS, PAYOUT_METHODS } from "@/lib/trade-products";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { SELECTED_GOLD } from "@/components/shared/payment-method-button";
import { cn } from "@/lib/utils";

/**
 * Selling quotes the *fine* metal rate rather than a minted SKU price — the
 * vault carries one gold balance and one silver balance, not per-SKU lots — and
 * both metals go through the same `/api/{metal}/sell` mutation (see
 * use-gold-trade.ts). Only the Gold.bd Wallet payout is wired to anything in
 * this repo; the two cash-out routes are gateway integrations with no backend
 * (see CLAUDE.md), so they're marked "Soon" rather than faked.
 */
export function SellGoldPanel() {
  const router = useRouter();
  const { data: walletData } = useWallet();

  const form = useForm<{ value: number }>({ defaultValues: { value: 0.5 } });
  const [metal, setMetal] = useState<Metal>("gold");
  const [payoutKey, setPayoutKey] = useState(PAYOUT_METHODS[0].key);

  const { data: rateData } = useMetalRate(metal);
  const sell = useSellMetal(metal);

  const wallet = walletData ?? MOCK_WALLET;
  const pricePerGram = Number((rateData ?? getLatestRate(metal)).pricePerGramBDT);
  const available = Number(metal === "gold" ? wallet.goldBalanceGrams : wallet.silverBalanceGrams);
  const sliderMax = available > 0 ? available : 1;

  const grams = form.watch("value") || 0;
  const payout = computeSellPayout(grams, pricePerGram);
  const exceedsBalance = grams > available;
  const activePayout = PAYOUT_METHODS.find((m) => m.key === payoutKey);

  function selectPayoutMethod(key: string, enabled: boolean) {
    if (!enabled) {
      toast.info("Coming soon — payouts go to your Gold.bd Wallet for now.");
      return;
    }
    setPayoutKey(key);
  }

  async function onSubmit(values: { value: number }) {
    const parsed = tradeGramsSchema(metal, "sell").safeParse(values.value);
    if (!parsed.success) {
      form.setError("value", { message: parsed.error.issues[0]?.message ?? "Enter a valid weight" });
      return;
    }
    if (values.value > available) {
      form.setError("value", { message: `You only hold ${available.toFixed(3)} g` });
      return;
    }

    try {
      await sell.mutateAsync(values.value);
      toast.success("Sale completed");
      form.reset({ value: 0.5 });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Sale failed");
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px] lg:items-start">
      {/* ---------- Sell form ---------- */}
      <Card>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Metal selector */}
            <div className="flex gap-2">
              {METALS.map((m) => (
                <Button
                  key={m}
                  type="button"
                  variant="outline"
                  aria-pressed={metal === m}
                  onClick={() => setMetal(m)}
                  className={cn(metal === m && SELECTED_GOLD)}
                >
                  {METAL_LABEL[m]}
                </Button>
              ))}
            </div>

            {/* Big weight entry */}
            <div className="space-y-3 text-center">
              <Label className="block text-xs font-semibold tracking-wide text-muted-foreground uppercase">You are selling</Label>
              <div className="flex items-center justify-center gap-1.5">
                <Input
                  type="number"
                  min="0"
                  step="0.001"
                  {...form.register("value", { valueAsNumber: true })}
                  className="h-auto w-32 border-none bg-transparent text-center text-4xl font-semibold shadow-none focus-visible:ring-0"
                />
                <span className="text-xl font-medium text-muted-foreground">g</span>
              </div>
              {form.formState.errors.value ? (
                <p className="text-sm text-destructive">{form.formState.errors.value.message}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  of {available.toFixed(3)}g available · {METAL_LABEL[metal]}
                </p>
              )}

              <Slider
                value={Math.min(grams, sliderMax)}
                min={0}
                max={sliderMax}
                step={sliderMax / 100}
                disabled={available <= 0}
                onValueChange={(v) => form.setValue("value", Number(v.toFixed(3)), { shouldValidate: true })}
              />
            </div>

            {/* Payout method */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Receive payout via</Label>
              <div className="grid grid-cols-2 gap-2">
                {PAYOUT_METHODS.slice(0, 2).map((m) => (
                  <PayoutButton key={m.key} method={m} selected={payoutKey === m.key} onSelect={selectPayoutMethod} />
                ))}
                <PayoutButton
                  method={PAYOUT_METHODS[2]}
                  selected={payoutKey === PAYOUT_METHODS[2].key}
                  onSelect={selectPayoutMethod}
                  className="col-span-2"
                />
              </div>
            </div>

            {exceedsBalance && !form.formState.errors.value && (
              <p className="text-sm text-destructive">You only hold {available.toFixed(3)} g.</p>
            )}

            <div className="space-y-2 text-center">
              <Button
                type="submit"
                variant="gold-solid"
                className="w-full"
                disabled={form.formState.isSubmitting || grams <= 0 || exceedsBalance}
              >
                <ArrowDownRight />
                {form.formState.isSubmitting ? "Processing…" : `Sell ${METAL_LABEL[metal]} · ${formatBDT(payout.netPayoutBDT)}`}
              </Button>
              {activePayout && <p className="text-xs text-muted-foreground">{activePayout.note}</p>}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ---------- Payout summary ---------- */}
      <Card className="lg:sticky lg:top-6">
        <CardHeader>
          <CardTitle>Payout summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <SummaryRow label={`Sell price (${METAL_LABEL[metal]})`} value={`${formatBDT(pricePerGram)}/g`} />
          <SummaryRow label="Weight" value={`${grams.toFixed(3)} g`} />
          <SummaryRow label={`Spread (${(SELL_SPREAD_RATE * 100).toFixed(0)}%)`} value={`-${formatBDT(payout.spreadBDT)}`} />
          <Separator />
          <div className="flex items-center justify-between text-base font-semibold">
            <span>You get</span>
            <span className="tabular-nums">{formatBDT(payout.netPayoutBDT)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PayoutButton({
  method,
  selected,
  onSelect,
  className,
}: {
  method: { key: string; label: string; icon: typeof WalletIcon; enabled: boolean };
  selected: boolean;
  onSelect: (key: string, enabled: boolean) => void;
  className?: string;
}) {
  const Icon = method.icon;
  return (
    <Button
      type="button"
      variant="outline"
      aria-pressed={selected}
      aria-disabled={!method.enabled}
      onClick={() => onSelect(method.key, method.enabled)}
      className={cn(
        "h-auto justify-center gap-2 rounded-md py-2.5 font-medium whitespace-normal",
        selected && SELECTED_GOLD,
        !method.enabled && "opacity-60",
        className
      )}
    >
      <Icon className="size-4" strokeWidth={1.75} />
      {method.label}
      {!method.enabled && (
        <Badge variant="secondary" className="text-[10px]">
          Soon
        </Badge>
      )}
    </Button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}
