"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDownRight, Wallet as WalletIcon } from "lucide-react";
import { tradeGramsSchema } from "@/lib/validations/gold";
import { ApiError } from "@/lib/api-client";
import { useSellMetal } from "@/hooks/use-gold-trade";
import { useMetalRate, useMetalRateHistory } from "@/hooks/use-metal-rate";
import { useWallet } from "@/hooks/use-wallet";
import { computeSellPayout, SELL_SPREAD_RATE } from "@/lib/gold-fees";
import { formatBDT } from "@/lib/format";
import { getLatestRate, getRateHistory, type Metal } from "@/lib/mock-rates";
import { MOCK_WALLET } from "@/lib/mock-wallet";
import { METAL_LABEL, METALS, PAYOUT_METHODS } from "@/lib/trade-products";
import { MarketPriceChart, METAL_CHART_COLOR, toPricePoints } from "@/components/market/market-price-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { SELECTED_GOLD, SELECTED_SILVER } from "@/components/shared/payment-method-button";
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
  const { data: rateHistory } = useMetalRateHistory(metal);
  const sell = useSellMetal(metal);

  const wallet = walletData ?? MOCK_WALLET;
  const pricePerGram = Number((rateData ?? getLatestRate(metal)).pricePerGramBDT);
  // Both balances come straight off the wallet — no per-metal rate query
  // needed just to show stock, unlike the price calc above which does.
  const goldAvailable = Number(wallet.goldBalanceGrams);
  const silverAvailable = Number(wallet.silverBalanceGrams);
  const available = metal === "gold" ? goldAvailable : silverAvailable;
  const sliderMax = available > 0 ? available : 1;

  // Same chart the Market page draws — daily series, holding-value axis
  // driven by what's actually in the vault for whichever metal is selected.
  const pricePoints = toPricePoints(rateHistory ?? getRateHistory(metal), "daily");

  const grams = form.watch("value") || 0;
  const payout = computeSellPayout(grams, pricePerGram);
  const exceedsBalance = grams > available;
  const activePayout = PAYOUT_METHODS.find((m) => m.key === payoutKey);

  // Every "selected" highlight on this page follows whichever metal is
  // active, not a fixed gold accent — so switching to Silver re-colors the
  // payout chip, the sell button, etc. to match.
  const isSilver = metal === "silver";
  const selectedAccent = isSilver ? SELECTED_SILVER : SELECTED_GOLD;

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
            {/* Metal selector — leads with each metal's held stock, so it's
                the first thing shown rather than something you find out only
                after picking a metal and looking below the weight field. */}
            <div className="grid grid-cols-2 gap-2">
              {METALS.map((m) => (
                <MetalStockButton
                  key={m}
                  metal={m}
                  label={METAL_LABEL[m]}
                  available={m === "gold" ? goldAvailable : silverAvailable}
                  selected={metal === m}
                  onSelect={setMetal}
                />
              ))}
            </div>

            {/* Price chart for whichever metal is selected above — the same
                dual-axis chart the Market page uses, so switching tabs swaps
                both the data and the right-hand "what your stock is worth"
                axis (only drawn when you actually hold any). */}
            {pricePoints.length >= 2 && (
              <div className="rounded-md border border-gold/20 bg-gold/5 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{METAL_LABEL[metal]} price</p>
                  <span className="text-sm font-semibold text-gold tabular-nums">{formatBDT(pricePerGram)}/g</span>
                </div>
                <div className="mt-2">
                  <MarketPriceChart
                    data={pricePoints}
                    holdingGrams={available}
                    color={METAL_CHART_COLOR[metal]}
                    metalLabel={METAL_LABEL[metal]}
                  />
                </div>
                {available > 0 && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Left axis is the market price per gram; the right axis values your own {available.toFixed(3)} g of{" "}
                    {METAL_LABEL[metal].toLowerCase()} at the same price.
                  </p>
                )}
              </div>
            )}

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
                  <PayoutButton
                    key={m.key}
                    method={m}
                    selected={payoutKey === m.key}
                    onSelect={selectPayoutMethod}
                    accent={selectedAccent}
                  />
                ))}
                <PayoutButton
                  method={PAYOUT_METHODS[2]}
                  selected={payoutKey === PAYOUT_METHODS[2].key}
                  onSelect={selectPayoutMethod}
                  accent={selectedAccent}
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
                variant={isSilver ? "silver-solid" : "gold-solid"}
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

function MetalStockButton({
  metal,
  label,
  available,
  selected,
  onSelect,
}: {
  metal: Metal;
  label: string;
  available: number;
  selected: boolean;
  onSelect: (metal: Metal) => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      aria-pressed={selected}
      onClick={() => onSelect(metal)}
      className={cn(
        "h-auto flex-col gap-0.5 rounded-md py-2.5",
        // Each button colors itself as its own metal when active — the Gold
        // tile turns gold, the Silver tile turns silver — rather than both
        // always reading gold regardless of which one is selected.
        selected && (metal === "gold" ? SELECTED_GOLD : SELECTED_SILVER)
      )}
    >
      <span className="font-semibold">{label}</span>
      <span className={cn("text-xs font-normal", selected ? "text-ink/70" : "text-muted-foreground")}>
        {available.toFixed(3)} g in stock
      </span>
    </Button>
  );
}

function PayoutButton({
  method,
  selected,
  onSelect,
  accent = SELECTED_GOLD,
  className,
}: {
  method: { key: string; label: string; icon: typeof WalletIcon; enabled: boolean };
  selected: boolean;
  onSelect: (key: string, enabled: boolean) => void;
  /** Selected-state color — follows the active metal (gold/silver) on the
   * page this is used from. */
  accent?: string;
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
        selected && accent,
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
