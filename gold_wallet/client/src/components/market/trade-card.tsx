"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDownRight, ArrowUpRight, ShieldCheck, Wallet as WalletIcon } from "lucide-react";
import { ApiError } from "@/lib/api-client";
import { useBuyMetal, useSellMetal } from "@/hooks/use-gold-trade";
import { useMetalRate } from "@/hooks/use-metal-rate";
import { useWallet } from "@/hooks/use-wallet";
import { computeBuyOrderBreakdown, computeSellPayout, SELL_SPREAD_RATE } from "@/lib/gold-fees";
import { tradeAmountSchema, tradeGramsSchema } from "@/lib/validations/gold";
import { formatBDT } from "@/lib/format";
import { getLatestRate, type Metal } from "@/lib/mock-rates";
import { MOCK_WALLET } from "@/lib/mock-wallet";
import {
  AMOUNT_PRESETS,
  METAL_LABEL,
  PAYOUT_METHODS,
  TRADE_PRODUCTS,
  productPricePerGram,
  type TradeProduct,
} from "@/lib/trade-products";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SELECTED_GOLD } from "@/components/shared/payment-method-button";
import { SectionLabel } from "@/components/shared/flow-stat-tile";
import { cn } from "@/lib/utils";

type EntryMode = "amount" | "weight";

const TAB_TRIGGER = "flex-1 data-active:border-gold data-active:bg-gold data-active:font-semibold data-active:text-ink";

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-2", strong ? "text-sm font-semibold" : "text-xs")}>
      <span className={strong ? undefined : "text-muted-foreground"}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

/** Live per-gram price for the selected SKU + its certification line. */
function PriceStrip({ product, pricePerGram }: { product: TradeProduct; pricePerGram: number | null }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-gold/20 bg-gold/5 px-2.5 py-2">
      <Badge variant="outline" className="border-gold/30 bg-gold/15 text-[10px] text-gold">
        <ShieldCheck className="size-3" strokeWidth={1.75} />
        {product.purityNote}
      </Badge>
      <span className="text-sm font-semibold tabular-nums">{pricePerGram !== null ? `${formatBDT(pricePerGram)}/g` : "…"}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Buy                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Buying is funded from the cash wallet and nothing else — bKash/Nagad/card top
 * the wallet up (the wallet page's Add money flow) rather than settling a trade,
 * so this shows the one funding source it can actually debit and routes to Add
 * money when there isn't enough in it.
 */
function BuyForm({ metal, product, onProductChange }: { metal: Metal; product: TradeProduct; onProductChange: (p: TradeProduct) => void }) {
  const router = useRouter();
  const { data: rateData } = useMetalRate(metal);
  const { data: walletData } = useWallet();
  const buy = useBuyMetal(metal);

  const form = useForm<{ value: number }>({ defaultValues: { value: AMOUNT_PRESETS[1] } });
  const [mode, setMode] = useState<EntryMode>("amount");

  const wallet = walletData ?? MOCK_WALLET;
  const fineRate = Number((rateData ?? getLatestRate(metal)).pricePerGramBDT);
  const pricePerGram = productPricePerGram(fineRate, product);

  const rawValue = form.watch("value") || 0;
  const amountBDT = mode === "amount" ? rawValue : pricePerGram ? rawValue * pricePerGram : 0;
  const breakdown = pricePerGram ? computeBuyOrderBreakdown(amountBDT, pricePerGram, metal) : null;

  const cashBDT = Number(wallet.cashBalanceBDT);
  const insufficient = !!breakdown && breakdown.totalPayableBDT > cashBDT;

  const metalProducts = TRADE_PRODUCTS.filter((p) => p.metal === metal);

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
    const schema = mode === "amount" ? tradeAmountSchema : tradeGramsSchema(metal, "buy");
    const parsed = schema.safeParse(values.value);
    if (!parsed.success) {
      form.setError("value", { message: parsed.error.issues[0]?.message ?? "Enter a valid amount" });
      return;
    }
    if (!breakdown) return;
    if (insufficient) {
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
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3.5">
      <Select value={product.key} onValueChange={(key) => onProductChange(metalProducts.find((p) => p.key === key)!)}>
        <SelectTrigger className="w-full">
          <SelectValue>{(key: string) => metalProducts.find((p) => p.key === key)?.shortLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {metalProducts.map((p) => (
            <SelectItem key={p.key} value={p.key}>
              {p.shortLabel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <PriceStrip product={product} pricePerGram={pricePerGram} />

      <Tabs value={mode} onValueChange={(v) => handleModeChange(v as EntryMode)}>
        <TabsList className="w-full">
          <TabsTrigger value="amount" className={TAB_TRIGGER}>
            Amount (BDT)
          </TabsTrigger>
          <TabsTrigger value="weight" className={TAB_TRIGGER}>
            Weight (grams)
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-1 text-center">
        <div className="flex items-center justify-center gap-1.5">
          <Input
            type="number"
            min="0"
            step={mode === "amount" ? "1" : "0.001"}
            {...form.register("value", { valueAsNumber: true })}
            className="h-auto w-40 border-none bg-transparent text-center text-3xl font-semibold shadow-none focus-visible:ring-0"
          />
          <span className="text-lg font-medium text-muted-foreground">{mode === "amount" ? "BDT" : "g"}</span>
        </div>
        {form.formState.errors.value ? (
          <p className="text-xs text-destructive">{form.formState.errors.value.message}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {mode === "amount"
              ? `≈ ${breakdown ? breakdown.grams.toFixed(4) : "0.0000"} g of ${product.unitNoun}`
              : pricePerGram
                ? `≈ ${formatBDT(rawValue * pricePerGram)}`
                : ""}
          </p>
        )}
      </div>

      {mode === "amount" && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {AMOUNT_PRESETS.map((preset) => (
            <Button
              key={preset}
              type="button"
              variant="outline"
              size="sm"
              className={cn("px-2.5 text-xs", rawValue === preset && SELECTED_GOLD)}
              onClick={() => form.setValue("value", preset, { shouldValidate: true })}
            >
              {preset.toLocaleString("en-BD")}
            </Button>
          ))}
        </div>
      )}

      {/* Funding source — cash only */}
      <div className="space-y-1.5">
        <SectionLabel>Pay with</SectionLabel>
        <div
          className={cn(
            "flex items-center justify-between gap-2 rounded-md border px-3 py-2.5",
            insufficient ? "border-destructive/40 bg-destructive/5" : "border-gold/30 bg-gold/10"
          )}
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <WalletIcon className="size-4 text-gold" strokeWidth={1.75} />
            Cash wallet
          </span>
          <span className="text-sm font-semibold tabular-nums">{formatBDT(cashBDT)}</span>
        </div>
        {insufficient ? (
          <p className="text-xs text-destructive">
            Not enough cash for this order.{" "}
            <Link href="/wallet" className="font-medium underline underline-offset-2">
              Add money
            </Link>
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Gold and silver are bought with wallet cash — top up first to buy more.</p>
        )}
      </div>

      <Separator />

      <div className="space-y-1.5">
        <SummaryRow label={`${product.label} price`} value={pricePerGram !== null ? `${formatBDT(pricePerGram)}/g` : "—"} />
        <SummaryRow label="You receive" value={breakdown ? `${breakdown.grams.toFixed(4)} g` : "—"} />
        {metal === "gold" && <SummaryRow label="Govt. gold tax (2,500/bhori)" value={breakdown ? formatBDT(breakdown.govtTaxBDT) : "—"} />}
        <SummaryRow label="Transaction charge (1.5%)" value={breakdown ? formatBDT(breakdown.transactionChargeBDT) : "—"} />
        <SummaryRow label="Total payable" value={breakdown ? formatBDT(breakdown.totalPayableBDT) : "—"} strong />
      </div>

      <Button
        type="submit"
        variant="gold-solid"
        className="w-full"
        disabled={form.formState.isSubmitting || pricePerGram === null || amountBDT <= 0 || insufficient}
      >
        <ArrowUpRight />
        {form.formState.isSubmitting
          ? "Processing…"
          : amountBDT > 0
            ? `Buy ${METAL_LABEL[metal]} · ${formatBDT(amountBDT)}`
            : `Buy ${METAL_LABEL[metal]}`}
      </Button>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sell                                                                       */
/* -------------------------------------------------------------------------- */

/** A sale is quoted on the fine metal rate, not a minted SKU price — the vault
 * carries one gold balance and one silver balance, not per-SKU lots. */
function SellForm({ metal }: { metal: Metal }) {
  const router = useRouter();
  const { data: rateData } = useMetalRate(metal);
  const { data: walletData } = useWallet();
  const sell = useSellMetal(metal);

  const form = useForm<{ value: number }>({ defaultValues: { value: 0.5 } });
  const [payoutKey, setPayoutKey] = useState(PAYOUT_METHODS[0].key);

  const wallet = walletData ?? MOCK_WALLET;
  const fineRate = Number((rateData ?? getLatestRate(metal)).pricePerGramBDT);
  const available = Number(metal === "gold" ? wallet.goldBalanceGrams : wallet.silverBalanceGrams);
  const sliderMax = available > 0 ? available : 1;

  const grams = form.watch("value") || 0;
  const payout = computeSellPayout(grams, fineRate);
  const exceedsBalance = grams > available;
  const activePayout = PAYOUT_METHODS.find((m) => m.key === payoutKey);

  function selectPayout(key: string, enabled: boolean) {
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
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3.5">
      <div className="space-y-2 text-center">
        <SectionLabel>You are selling</SectionLabel>
        <div className="flex items-center justify-center gap-1.5">
          <Input
            type="number"
            min="0"
            step="0.001"
            {...form.register("value", { valueAsNumber: true })}
            className="h-auto w-32 border-none bg-transparent text-center text-3xl font-semibold shadow-none focus-visible:ring-0"
          />
          <span className="text-lg font-medium text-muted-foreground">g</span>
        </div>
        {form.formState.errors.value ? (
          <p className="text-xs text-destructive">{form.formState.errors.value.message}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            of {available.toFixed(3)} g available · {METAL_LABEL[metal]}
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

      <div className="space-y-1.5">
        <SectionLabel>Receive payout via</SectionLabel>
        <div className="grid gap-1.5">
          {PAYOUT_METHODS.map((m) => {
            const Icon = m.icon;
            return (
              <Button
                key={m.key}
                type="button"
                variant="outline"
                aria-pressed={payoutKey === m.key}
                aria-disabled={!m.enabled}
                onClick={() => selectPayout(m.key, m.enabled)}
                className={cn(
                  "h-auto justify-between gap-2 py-2 text-xs font-medium whitespace-normal",
                  payoutKey === m.key && SELECTED_GOLD,
                  !m.enabled && "opacity-60"
                )}
              >
                <span className="flex items-center gap-2">
                  <Icon className="size-4" strokeWidth={1.75} />
                  {m.label}
                </span>
                {!m.enabled && (
                  <Badge variant="secondary" className="text-[9px]">
                    Soon
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>
      </div>

      <Separator />

      <div className="space-y-1.5">
        <SummaryRow label={`Sell price (${METAL_LABEL[metal]})`} value={`${formatBDT(fineRate)}/g`} />
        <SummaryRow label="Weight" value={`${grams.toFixed(3)} g`} />
        <SummaryRow label={`Spread (${(SELL_SPREAD_RATE * 100).toFixed(0)}%)`} value={`-${formatBDT(payout.spreadBDT)}`} />
        <SummaryRow label="You get" value={formatBDT(payout.netPayoutBDT)} strong />
      </div>

      <div className="space-y-1.5 text-center">
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
  );
}

/* -------------------------------------------------------------------------- */
/*  Card                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The Market page's trade panel: buy or sell either metal without leaving the
 * chart. `metal` is owned by the page so the two stay in step — picking a
 * silver SKU here swings the graph (and its holding axis) to silver, and vice
 * versa.
 */
export function TradeCard({ metal, onMetalChange }: { metal: Metal; onMetalChange: (metal: Metal) => void }) {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [productKey, setProductKey] = useState(TRADE_PRODUCTS[0].key);

  // Derived rather than synced in an effect: when the page switches metal, the
  // first SKU of that metal takes over unless the current one already matches.
  const product = TRADE_PRODUCTS.find((p) => p.key === productKey && p.metal === metal) ?? TRADE_PRODUCTS.find((p) => p.metal === metal)!;

  function selectProduct(next: TradeProduct) {
    setProductKey(next.key);
    if (next.metal !== metal) onMetalChange(next.metal);
  }

  return (
    <Card>
      <CardContent className="space-y-3.5">
        <Tabs value={side} onValueChange={(v) => setSide(v as "buy" | "sell")}>
          <TabsList className="w-full">
            <TabsTrigger value="buy" className={TAB_TRIGGER}>
              Buy
            </TabsTrigger>
            <TabsTrigger value="sell" className={TAB_TRIGGER}>
              Sell
            </TabsTrigger>
          </TabsList>

          <div className="mt-3 space-y-3.5">
            <TabsContent value="buy">
              <BuyForm metal={metal} product={product} onProductChange={selectProduct} />
            </TabsContent>
            <TabsContent value="sell">
              <SellForm metal={metal} />
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}
