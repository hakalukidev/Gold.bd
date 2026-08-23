"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowUpRight, Gem, ShieldCheck, TrendingUp } from "lucide-react";
import { buyGoldSchema, buyGoldAmountSchema } from "@/lib/validations/gold";
import { ApiError } from "@/lib/api-client";
import { useBuyGold } from "@/hooks/use-gold-trade";
import { useGoldRate } from "@/hooks/use-gold-rate";
import { useWallet } from "@/hooks/use-wallet";
import { computeBuyOrderBreakdown } from "@/lib/gold-fees";
import { formatBDT } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaymentMethodButton, SELECTED_GOLD } from "@/components/shared/payment-method-button";
import { cn } from "@/lib/utils";

type EntryMode = "amount" | "weight";

// Only "Gold Bar (22K)" is wired to a real rate + the /api/gold/buy mutation
// — the rest mirror the reference design but there's no coin/24K/silver
// buy-side pricing or endpoint in this repo yet (see CLAUDE.md), so they're
// shown for parity and marked "Soon" instead of silently doing the wrong thing.
const PRODUCT_OPTIONS: { key: string; label: string; enabled: boolean }[] = [
  { key: "gold-bar-22k", label: "Gold Bar (22K)", enabled: true },
  { key: "gold-coin-22k", label: "Gold Coin (22K)", enabled: false },
  { key: "gold-coin-24k", label: "Gold Coin (24K)", enabled: false },
  { key: "silver-bar-999", label: "Silver Bar (999)", enabled: false },
  { key: "silver-coin-999", label: "Silver Coin (999)", enabled: false },
];

const AMOUNT_PRESETS = [500, 1000, 2500, 5000, 10000];

// Only "Wallet balance" actually debits anything today — the rest are
// payment-gateway integrations this repo has no backend for.
const PAYMENT_METHODS: { key: string; label: string; enabled: boolean }[] = [
  { key: "wallet", label: "Wallet balance", enabled: true },
  { key: "bkash", label: "bKash", enabled: false },
  { key: "nagad", label: "Nagad", enabled: false },
  { key: "rocket", label: "Rocket", enabled: false },
  { key: "bank", label: "Bank transfer", enabled: false },
  { key: "card", label: "Card", enabled: false },
];

export function BuyGoldPanel() {
  const router = useRouter();
  const { data: rate } = useGoldRate();
  const { data: wallet } = useWallet();
  const buy = useBuyGold();

  const form = useForm<{ value: number }>({ defaultValues: { value: 1000 } });
  const [mode, setMode] = useState<EntryMode>("amount");
  const [product, setProduct] = useState(PRODUCT_OPTIONS[0].key);
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0].key);

  const pricePerGram = rate ? Number(rate.pricePerGramBDT) : null;
  const rawValue = form.watch("value") || 0;
  const amountBDT = mode === "amount" ? rawValue : pricePerGram ? rawValue * pricePerGram : 0;
  const breakdown = pricePerGram ? computeBuyOrderBreakdown(amountBDT, pricePerGram) : null;

  const insufficientBalance =
    paymentMethod === "wallet" && !!wallet && !!breakdown && breakdown.totalPayableBDT > Number(wallet.cashBalanceBDT);

  function handleModeChange(next: EntryMode) {
    if (next === mode || !pricePerGram) {
      setMode(next);
      return;
    }
    const converted = next === "weight" ? rawValue / pricePerGram : rawValue * pricePerGram;
    form.setValue("value", Number(converted.toFixed(next === "weight" ? 4 : 0)));
    setMode(next);
  }

  function selectProduct(key: string, enabled: boolean) {
    if (!enabled) {
      toast.info("Coming soon — only Gold Bar (22K) is available to buy right now.");
      return;
    }
    setProduct(key);
  }

  function selectPaymentMethod(key: string, enabled: boolean) {
    if (!enabled) {
      toast.info("Coming soon — pay with wallet balance for now.");
      return;
    }
    setPaymentMethod(key);
  }

  async function onSubmit(values: { value: number }) {
    const schema = mode === "amount" ? buyGoldAmountSchema.shape.amountBDT : buyGoldSchema.shape.goldGrams;
    const parsed = schema.safeParse(values.value);
    if (!parsed.success) {
      form.setError("value", { message: parsed.error.issues[0]?.message ?? "Enter a valid amount" });
      return;
    }
    if (!breakdown) return;

    try {
      await buy.mutateAsync(Number(breakdown.goldGrams.toFixed(4)));
      toast.success("Purchase completed");
      form.reset({ value: mode === "amount" ? AMOUNT_PRESETS[1] : 1 });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Purchase failed");
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px] lg:items-start">
      {/* ---------- Order form ---------- */}
      <Card>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Product / purity selector */}
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                {PRODUCT_OPTIONS.slice(0, 3).map((opt) => (
                  <ProductButton key={opt.key} option={opt} selected={product === opt.key} onSelect={selectProduct} />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {PRODUCT_OPTIONS.slice(3).map((opt) => (
                  <ProductButton key={opt.key} option={opt} selected={product === opt.key} onSelect={selectProduct} />
                ))}
              </div>
            </div>

            {/* Certification + live price */}
            <div className="flex items-center justify-between rounded-lg border border-gold/20 bg-gold/5 px-3 py-2">
              <Badge variant="outline" className="border-gold/30 bg-gold/15 text-gold">
                <ShieldCheck className="size-3" strokeWidth={1.75} />
                22K Hallmarked &amp; Certified
              </Badge>
              <span className="flex items-center gap-1.5 text-sm font-semibold tabular-nums">
                <TrendingUp className="size-3.5 text-gold" strokeWidth={1.75} />
                {pricePerGram ? `${formatBDT(pricePerGram)}/g` : "Loading…"}
              </span>
            </div>

            {/* Amount vs weight entry mode */}
            <Tabs value={mode} onValueChange={(v) => handleModeChange(v as EntryMode)}>
              <TabsList className="w-full">
                <TabsTrigger
                  value="amount"
                  className="flex-1 data-active:border-gold data-active:bg-gold data-active:font-semibold data-active:text-ink"
                >
                  Amount (BDT)
                </TabsTrigger>
                <TabsTrigger
                  value="weight"
                  className="flex-1 data-active:border-gold data-active:bg-gold data-active:font-semibold data-active:text-ink"
                >
                  Weight (grams)
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Big value entry */}
            <div className="space-y-1 text-center">
              <div className="flex items-center justify-center gap-1.5">
                <Input
                  type="number"
                  min="0"
                  step={mode === "amount" ? "1" : "0.001"}
                  {...form.register("value", { valueAsNumber: true })}
                  className="h-auto w-48 border-none bg-transparent text-center text-4xl font-semibold shadow-none focus-visible:ring-0"
                />
                <span className="text-xl font-medium text-muted-foreground">{mode === "amount" ? "BDT" : "g"}</span>
              </div>
              {form.formState.errors.value ? (
                <p className="text-sm text-destructive">{form.formState.errors.value.message}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {mode === "amount"
                    ? `≈ ${breakdown ? breakdown.goldGrams.toFixed(4) : "0.0000"} g of 22K gold bar`
                    : pricePerGram
                      ? `≈ ${formatBDT(rawValue * pricePerGram)}`
                      : ""}
                </p>
              )}
            </div>

            {mode === "amount" && (
              <div className="flex flex-wrap justify-center gap-2">
                {AMOUNT_PRESETS.map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(rawValue === preset && SELECTED_GOLD)}
                    onClick={() => form.setValue("value", preset, { shouldValidate: true })}
                  >
                    {preset.toLocaleString("en-BD")}
                  </Button>
                ))}
              </div>
            )}

            {/* Payment method */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Pay with</Label>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <PaymentMethodButton
                    key={method.key}
                    method={method}
                    selected={paymentMethod === method.key}
                    subtext={method.key === "wallet" && wallet ? formatBDT(wallet.cashBalanceBDT) : undefined}
                    onSelect={selectPaymentMethod}
                  />
                ))}
              </div>
            </div>

            {insufficientBalance && <p className="text-sm text-destructive">Insufficient wallet balance for this order.</p>}

            <Button
              type="submit"
              variant="gold-solid"
              className="w-full"
              disabled={form.formState.isSubmitting || !pricePerGram || amountBDT <= 0 || insufficientBalance}
            >
              <ArrowUpRight />
              {form.formState.isSubmitting ? "Processing…" : amountBDT > 0 ? `Buy gold · ${formatBDT(amountBDT)}` : "Buy gold"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ---------- Order summary ---------- */}
      <Card className="lg:sticky lg:top-6">
        <CardHeader>
          <CardTitle>Order summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <SummaryRow label="Gold Bar price (22K)" value={pricePerGram ? `${formatBDT(pricePerGram)}/g` : "—"} />
          <SummaryRow label="You receive" value={breakdown ? `${breakdown.goldGrams.toFixed(4)} g of 22K gold bar` : "—"} />
          <SummaryRow label="Govt. gold tax (2,500/bhori)" value={breakdown ? formatBDT(breakdown.govtTaxBDT) : "—"} />
          <SummaryRow label="Transaction charge (1.5%)" value={breakdown ? formatBDT(breakdown.transactionChargeBDT) : "—"} />
          <Separator />
          <div className="flex items-center justify-between text-base font-semibold">
            <span>Total payable</span>
            <span className="tabular-nums">{breakdown ? formatBDT(breakdown.totalPayableBDT) : "—"}</span>
          </div>
          <p className="pt-1 text-xs text-muted-foreground">
            Gold is stored instantly in your insured vault. Collect physical gold anytime from 0.5g.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ProductButton({
  option,
  selected,
  onSelect,
}: {
  option: { key: string; label: string; enabled: boolean };
  selected: boolean;
  onSelect: (key: string, enabled: boolean) => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      aria-pressed={selected}
      aria-disabled={!option.enabled}
      onClick={() => onSelect(option.key, option.enabled)}
      className={cn(
        "relative h-auto justify-center gap-1.5 rounded-lg py-2.5 text-center whitespace-normal",
        selected && SELECTED_GOLD,
        !option.enabled && "opacity-60"
      )}
    >
      <Gem className="size-3.5 shrink-0" strokeWidth={1.75} />
      {option.label}
      {!option.enabled && (
        <Badge variant="secondary" className="absolute -top-2 -right-2 text-[9px]">
          Soon
        </Badge>
      )}
    </Button>
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
