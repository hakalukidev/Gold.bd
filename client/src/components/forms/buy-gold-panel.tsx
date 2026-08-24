"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowUpRight, Gem, ShieldCheck, TrendingUp, Wallet as WalletIcon } from "lucide-react";
import { tradeAmountSchema, tradeGramsSchema } from "@/lib/validations/gold";
import { ApiError } from "@/lib/api-client";
import { useBuyMetal } from "@/hooks/use-gold-trade";
import { useMetalRate } from "@/hooks/use-metal-rate";
import { useWallet } from "@/hooks/use-wallet";
import { computeBuyOrderBreakdown } from "@/lib/gold-fees";
import { formatBDT } from "@/lib/format";
import { getLatestRate } from "@/lib/mock-rates";
import { MOCK_WALLET } from "@/lib/mock-wallet";
import { AMOUNT_PRESETS, METAL_LABEL, TRADE_PRODUCTS, productPricePerGram, type TradeProduct } from "@/lib/trade-products";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SELECTED_GOLD } from "@/components/shared/payment-method-button";
import { cn } from "@/lib/utils";

type EntryMode = "amount" | "weight";

/**
 * Buying is funded from the cash wallet and nothing else — bKash/Nagad/card
 * top the wallet up (the wallet page's Add money flow) rather than settling a
 * trade — so this panel shows the one funding source it can actually debit and
 * routes to Add money when there isn't enough in it. Every SKU in
 * trade-products.ts is buyable: gold and silver both have a live rate and a
 * `/api/{metal}/buy` mutation (see use-gold-trade.ts).
 */
export function BuyGoldPanel() {
  const router = useRouter();
  const { data: walletData } = useWallet();

  const form = useForm<{ value: number }>({ defaultValues: { value: AMOUNT_PRESETS[1] } });
  const [mode, setMode] = useState<EntryMode>("amount");
  const [productKey, setProductKey] = useState(TRADE_PRODUCTS[0].key);

  const product = TRADE_PRODUCTS.find((p) => p.key === productKey)!;
  const { data: rateData } = useMetalRate(product.metal);
  const buy = useBuyMetal(product.metal);

  const wallet = walletData ?? MOCK_WALLET;
  const fineRate = Number((rateData ?? getLatestRate(product.metal)).pricePerGramBDT);
  const pricePerGram = productPricePerGram(fineRate, product);

  const rawValue = form.watch("value") || 0;
  const amountBDT = mode === "amount" ? rawValue : pricePerGram ? rawValue * pricePerGram : 0;
  const breakdown = pricePerGram ? computeBuyOrderBreakdown(amountBDT, pricePerGram, product.metal) : null;

  const cashBDT = Number(wallet.cashBalanceBDT);
  const insufficientBalance = !!breakdown && breakdown.totalPayableBDT > cashBDT;

  function handleModeChange(next: EntryMode) {
    if (next === mode || !pricePerGram) {
      setMode(next);
      return;
    }
    const converted = next === "weight" ? rawValue / pricePerGram : rawValue * pricePerGram;
    form.setValue("value", Number(converted.toFixed(next === "weight" ? 4 : 0)));
    setMode(next);
  }

  async function onSubmit(values: { value: number }) {
    const schema = mode === "amount" ? tradeAmountSchema : tradeGramsSchema(product.metal, "buy");
    const parsed = schema.safeParse(values.value);
    if (!parsed.success) {
      form.setError("value", { message: parsed.error.issues[0]?.message ?? "Enter a valid amount" });
      return;
    }
    if (!breakdown) return;
    if (insufficientBalance) {
      form.setError("value", { message: `Your cash wallet holds ${formatBDT(cashBDT)}` });
      return;
    }

    try {
      await buy.mutateAsync(Number(breakdown.grams.toFixed(4)));
      toast.success("Purchase completed");
      form.reset({ value: AMOUNT_PRESETS[1] });
      setMode("amount");
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
                {TRADE_PRODUCTS.slice(0, 3).map((opt) => (
                  <ProductButton key={opt.key} option={opt} selected={product.key === opt.key} onSelect={setProductKey} />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {TRADE_PRODUCTS.slice(3).map((opt) => (
                  <ProductButton key={opt.key} option={opt} selected={product.key === opt.key} onSelect={setProductKey} />
                ))}
              </div>
            </div>

            {/* Certification + live price */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-gold/20 bg-gold/5 px-3 py-2">
              <Badge variant="outline" className="border-gold/30 bg-gold/15 text-gold">
                <ShieldCheck className="size-3" strokeWidth={1.75} />
                {product.purityNote}
              </Badge>
              <span className="flex items-center gap-1.5 text-sm font-semibold tabular-nums">
                <TrendingUp className="size-3.5 text-gold" strokeWidth={1.75} />
                {pricePerGram !== null ? `${formatBDT(pricePerGram)}/g` : "Loading…"}
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
                    ? `≈ ${breakdown ? breakdown.grams.toFixed(4) : "0.0000"} g of ${product.unitNoun}`
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

            {/* Funding source — cash only */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Pay with</Label>
              <div
                className={cn(
                  "flex items-center justify-between gap-2 rounded-md border px-3 py-2.5",
                  insufficientBalance ? "border-destructive/40 bg-destructive/5" : "border-gold/30 bg-gold/10"
                )}
              >
                <span className="flex items-center gap-2 font-medium">
                  <WalletIcon className="size-4 text-gold" strokeWidth={1.75} />
                  Cash wallet
                </span>
                <span className="font-semibold tabular-nums">{formatBDT(cashBDT)}</span>
              </div>
              {insufficientBalance ? (
                <p className="text-sm text-destructive">
                  Not enough cash for this order.{" "}
                  <Link href="/wallet" className="font-medium underline underline-offset-2">
                    Add money
                  </Link>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Gold and silver are bought with wallet cash — top the wallet up with bKash, Nagad, bank transfer or card first.
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="gold-solid"
              className="w-full"
              disabled={form.formState.isSubmitting || pricePerGram === null || amountBDT <= 0 || insufficientBalance}
            >
              <ArrowUpRight />
              {form.formState.isSubmitting
                ? "Processing…"
                : amountBDT > 0
                  ? `Buy ${METAL_LABEL[product.metal]} · ${formatBDT(amountBDT)}`
                  : `Buy ${METAL_LABEL[product.metal]}`}
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
          <SummaryRow label={`${product.label} price`} value={pricePerGram !== null ? `${formatBDT(pricePerGram)}/g` : "—"} />
          <SummaryRow label="You receive" value={breakdown ? `${breakdown.grams.toFixed(4)} g of ${product.unitNoun}` : "—"} />
          {product.metal === "gold" && (
            <SummaryRow label="Govt. gold tax (2,500/bhori)" value={breakdown ? formatBDT(breakdown.govtTaxBDT) : "—"} />
          )}
          <SummaryRow label="Transaction charge (1.5%)" value={breakdown ? formatBDT(breakdown.transactionChargeBDT) : "—"} />
          <Separator />
          <div className="flex items-center justify-between text-base font-semibold">
            <span>Total payable</span>
            <span className="tabular-nums">{breakdown ? formatBDT(breakdown.totalPayableBDT) : "—"}</span>
          </div>
          <p className="pt-1 text-xs text-muted-foreground">
            {METAL_LABEL[product.metal]} is stored instantly in your insured vault. Collect physical metal anytime from 0.5g.
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
  option: TradeProduct;
  selected: boolean;
  onSelect: (key: string) => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      aria-pressed={selected}
      onClick={() => onSelect(option.key)}
      className={cn("h-auto justify-center gap-1.5 rounded-md py-2.5 text-center whitespace-normal", selected && SELECTED_GOLD)}
    >
      <Gem className="size-3.5 shrink-0" strokeWidth={1.75} />
      {option.label}
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
