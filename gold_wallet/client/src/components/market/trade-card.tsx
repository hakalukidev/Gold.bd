"use client";

import { KaratSelector, type GoldKarat } from "@/components/shared/karat-selector";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDownRight, ArrowUpRight, Check, Gem, Wallet as WalletIcon } from "lucide-react";
import { ApiError } from "@/lib/api-client";
import { useBuyMetal, useSellMetal } from "@/hooks/use-gold-trade";
import { useMetalRate } from "@/hooks/use-metal-rate";
import { useWallet } from "@/hooks/use-wallet";
import { computeBuyOrderBreakdown, computeSellPayout, SELL_SPREAD_RATE } from "@/lib/gold-fees";
import { tradeAmountSchema, tradeGramsSchema } from "@/lib/validations/gold";
import { formatBDT } from "@/lib/format";
import type { Metal } from "@/lib/mock-rates";
import { MOCK_WALLET } from "@/lib/mock-wallet";
import {
  AMOUNT_PRESETS,
  METAL_LABEL_KEY,
  PAYOUT_METHODS,
  TRADE_PRODUCTS,
  productPricePerGram,
  type TradeProduct,
} from "@/lib/trade-products";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SELECTED_GOLD } from "@/components/shared/payment-method-button";
import { SectionLabel } from "@/components/shared/flow-stat-tile";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/use-translation";

type EntryMode = "amount" | "weight";

const TAB_TRIGGER = "flex-1 rounded-xl data-active:border-gold/40 data-active:bg-gold data-active:font-semibold data-active:text-ink dark:data-active:border-gold/40 dark:data-active:bg-gold dark:data-active:text-ink";
const TAB_LIST = "w-full rounded-2xl border border-border/60 bg-muted/50 p-1 group-data-horizontal/tabs:h-12";

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-4", strong ? "text-sm font-semibold [&>span:last-child]:text-lg [&>span:last-child]:text-gold-accent" : "text-xs leading-5")}>
      <span className={strong ? undefined : "text-muted-foreground"}>{label}</span>
      <span className="shrink-0 text-right tabular-nums">{value}</span>
    </div>
  );
}

/** Receipt-style box for the price breakdown — groups the line items visually
 * and sets the final (bold) row off with its own divider, so "Total payable" /
 * "You get" reads as the answer rather than just another row in the list. */
function SummaryPanel({ children, total }: { children: ReactNode; total: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2 rounded-2xl border border-border/60 bg-muted/20 p-4">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {t("trade.orderSummary")}
      </p>
      {children}
      <div className="mt-3 border-t border-dashed border-border pt-3">{total}</div>
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
function BuyForm({ metal, product }: { metal: Metal; product: TradeProduct }) {
  const router = useRouter();
  const { t } = useTranslation();
  const metalLabel = t(METAL_LABEL_KEY[metal]);
  const [karat, setKarat] = useState<GoldKarat>(22);
  const { data: rateData } = useMetalRate(metal);
  const { data: walletData } = useWallet();
  const buy = useBuyMetal(metal, karat);

  const form = useForm<{ value: number }>({ defaultValues: { value: AMOUNT_PRESETS[1] } });
  const [mode, setMode] = useState<EntryMode>("amount");

  const wallet = walletData ?? MOCK_WALLET;
  const fineRate = rateData ? Number(rateData.pricePerGramBDT) * (metal === "gold" ? karat / 22 : 1) : null;
  const pricePerGram = productPricePerGram(fineRate, { ...product, purity: 1 });

  const rawValue = form.watch("value") || 0;
  const amountBDT = mode === "amount" ? rawValue : pricePerGram ? rawValue * pricePerGram : 0;
  const breakdown = pricePerGram ? computeBuyOrderBreakdown(amountBDT, pricePerGram, metal) : null;

  const cashBDT = Number(wallet.cashBalanceBDT);
  const insufficient = !!breakdown && breakdown.totalPayableBDT > cashBDT;

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
      form.setError("value", { message: parsed.error.issues[0]?.message ?? t("trade.buy.enterValidAmount") });
      return;
    }
    if (!breakdown) return;
    if (insufficient) {
      form.setError("value", { message: t("trade.buy.cashWalletHolds", { amount: formatBDT(cashBDT) }) });
      return;
    }

    try {
      await buy.mutateAsync(Number(breakdown.grams.toFixed(4)));
      toast.success(t("trade.buy.purchaseCompleted"));
      form.reset({ value: AMOUNT_PRESETS[1] });
      setMode("amount");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t("trade.buy.purchaseFailed"));
    }
  }

  return (
    <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      {metal === "gold" && <KaratSelector value={karat} onChange={setKarat} />}
      <div className="space-y-3">
        <Tabs value={mode} onValueChange={(v) => handleModeChange(v as EntryMode)}>
          <TabsList aria-label={t("trade.buy.enterAmountOrWeight")} className={TAB_LIST}>
            <TabsTrigger value="amount" className={TAB_TRIGGER}>
              {t("trade.buy.amountBdt")}
            </TabsTrigger>
            <TabsTrigger value="weight" className={TAB_TRIGGER}>
              {t("trade.buy.weightGrams")}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="space-y-4 rounded-2xl border border-gold/25 bg-linear-to-b from-gold/8 to-transparent px-3 py-5 focus-within:border-gold/60">
        <p className="text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {mode === "amount" ? t("trade.buy.howMuchInvest") : t("trade.buy.howMuchBuy")}
        </p>
        <FormField
          control={form.control}
          name="value"
          render={({ field }) => (
            <FormItem className="gap-1 text-center">
              <div className="flex items-center justify-center gap-1.5">
                <FormControl>
                  <Input
                    type="number"
                    aria-label={mode === "amount" ? t("trade.buy.ariaAmount") : t("trade.buy.ariaWeight")}
                    min="0"
                    step={mode === "amount" ? "1" : "0.001"}
                    {...field}
                    onChange={(e) => field.onChange(Number.isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber)}
                    className="h-14 w-48 max-w-[75%] rounded-lg border-none bg-transparent px-0 text-center text-4xl font-semibold tracking-tight shadow-none focus-visible:ring-2 focus-visible:ring-gold/40 md:text-4xl dark:bg-transparent"
                  />
                </FormControl>
                <span className="text-lg font-medium text-muted-foreground">{mode === "amount" ? "BDT" : "g"}</span>
              </div>
              {form.formState.errors.value ? (
                <FormMessage className="text-center" />
              ) : (
                <p className="text-xs text-muted-foreground">
                  {mode === "amount"
                    ? t("trade.buy.approxOf", {
                        grams: breakdown ? breakdown.grams.toFixed(4) : "0.0000",
                        unit: metal === "gold" ? `${karat}K gold bar` : product.unitNoun,
                      })
                    : pricePerGram
                      ? t("trade.buy.approxBdt", { amount: formatBDT(rawValue * pricePerGram) })
                      : ""}
                </p>
              )}
            </FormItem>
          )}
        />

        {mode === "amount" && (
          <div className="flex flex-wrap justify-center gap-1.5">
            {AMOUNT_PRESETS.map((preset) => (
              <Button
                key={preset}
                type="button"
                variant="outline"
                size="sm"
                aria-pressed={rawValue === preset}
                className={cn("h-9 rounded-lg border-border/70 bg-background/50 px-2.5 text-xs transition-colors hover:border-gold/50", rawValue === preset && SELECTED_GOLD)}
                onClick={() => form.setValue("value", preset, { shouldValidate: true })}
              >
                {preset.toLocaleString("en-BD")}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Funding source — cash only */}
      <div className="space-y-1.5">
        <SectionLabel>{t("trade.buy.payWith")}</SectionLabel>
        <div
          className={cn(
            "flex items-center justify-between gap-3 rounded-2xl border p-4",
            insufficient ? "border-destructive/40 bg-destructive/5" : "border-gold/30 bg-gold/10"
          )}
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <span className="flex size-10 items-center justify-center rounded-xl bg-gold/15">
              <WalletIcon className="size-5 text-gold-accent" strokeWidth={1.75} />
            </span>
            <span>
              {t("wallet.myAccounts.cashWallet")}
              <span className="mt-0.5 block text-[10px] font-normal text-muted-foreground">
                {t("trade.buy.availableBalance")}
              </span>
            </span>
          </span>
          <span className="flex items-center gap-2 text-sm font-semibold tabular-nums">
            {formatBDT(cashBDT)}
            {!insufficient && <Check className="size-4 shrink-0 text-gold-accent" />}
          </span>
        </div>
        {insufficient ? (
          <p className="text-xs text-destructive">
            {t("trade.buy.notEnoughCash")}{" "}
            <Link href="/wallet" className="font-medium underline underline-offset-2">
              {t("trade.buy.addMoney")}
            </Link>
          </p>
        ) : (
          <p className="px-1 text-xs leading-relaxed text-muted-foreground">
            {t("trade.buy.paidDirectly")}{" "}
            <Link href="/wallet" className="font-medium text-gold-accent underline-offset-4 hover:underline">
              {t("trade.buy.addMoney")}
            </Link>
          </p>
        )}
      </div>

      <SummaryPanel total={<SummaryRow label={t("trade.buy.totalPayable")} value={breakdown ? formatBDT(breakdown.totalPayableBDT) : "—"} strong />}>
        <SummaryRow
          label={t("trade.buy.priceLabel", { product: product.label })}
          value={pricePerGram !== null ? `${formatBDT(pricePerGram)}/g` : "—"}
        />
        <SummaryRow label={t("trade.buy.youReceive")} value={breakdown ? `${breakdown.grams.toFixed(4)} g` : "—"} />
        {metal === "gold" && (
          <SummaryRow label={t("trade.buy.govtTax")} value={breakdown ? formatBDT(breakdown.govtTaxBDT) : "—"} />
        )}
        <SummaryRow label={t("trade.buy.transactionCharge")} value={breakdown ? formatBDT(breakdown.transactionChargeBDT) : "—"} />
      </SummaryPanel>

      <Button
        type="submit"
        variant="gold-solid"
        className="h-12 w-full rounded-xl text-sm font-semibold shadow-lg shadow-gold/10"
        disabled={form.formState.isSubmitting || pricePerGram === null || amountBDT <= 0 || insufficient}
      >
        <ArrowUpRight />
        {form.formState.isSubmitting
          ? t("trade.buy.processing")
          : amountBDT > 0
            ? t("trade.buy.buyMetalAmount", { metal: metalLabel, amount: formatBDT(breakdown?.totalPayableBDT ?? amountBDT) })
            : t("trade.buy.buyMetal", { metal: metalLabel })}
      </Button>
    </form>
    </Form>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sell                                                                       */
/* -------------------------------------------------------------------------- */

/** A sale is quoted on the metal's real 22K anchor rate, not a minted SKU
 * price — the vault carries one gold balance and one silver balance, not
 * per-SKU lots. */
function SellForm({ metal }: { metal: Metal }) {
  const router = useRouter();
  const { t } = useTranslation();
  const metalLabel = t(METAL_LABEL_KEY[metal]);
  const [karat, setKarat] = useState<GoldKarat>(22);
  const { data: rateData } = useMetalRate(metal);
  const { data: walletData } = useWallet();
  const sell = useSellMetal(metal, karat);

  const form = useForm<{ value: number }>({ defaultValues: { value: 0.5 } });
  const [payoutKey, setPayoutKey] = useState(PAYOUT_METHODS[0].key);

  const wallet = walletData ?? MOCK_WALLET;
  const fineRate = rateData ? Number(rateData.pricePerGramBDT) * (metal === "gold" ? karat / 22 : 1) : null;
  const available = Number(metal === "gold" ? wallet.goldBalanceGrams : wallet.silverBalanceGrams) / (metal === "gold" ? karat / 22 : 1);
  const sliderMax = available > 0 ? available : 1;

  const grams = form.watch("value") || 0;
  const payout = computeSellPayout(grams, fineRate ?? 0);
  const exceedsBalance = grams > available;
  const activePayout = PAYOUT_METHODS.find((m) => m.key === payoutKey);

  function selectPayout(key: string, enabled: boolean) {
    if (!enabled) {
      toast.info(t("trade.sell.comingSoon"));
      return;
    }
    setPayoutKey(key);
  }

  async function onSubmit(values: { value: number }) {
    const parsed = tradeGramsSchema(metal, "sell").safeParse(values.value);
    if (!parsed.success) {
      form.setError("value", { message: parsed.error.issues[0]?.message ?? t("trade.sell.enterValidWeight") });
      return;
    }
    if (values.value > available) {
      form.setError("value", { message: t("trade.sell.onlyHold", { amount: available.toFixed(3) }) });
      return;
    }

    try {
      await sell.mutateAsync(values.value);
      toast.success(t("trade.sell.saleCompleted"));
      form.reset({ value: 0.5 });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t("trade.sell.saleFailed"));
    }
  }

  return (
    <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {metal === "gold" && <KaratSelector value={karat} onChange={setKarat} />}
      <FormField
        control={form.control}
        name="value"
        render={({ field }) => (
          <FormItem className="gap-4 rounded-2xl border border-gold/25 bg-linear-to-b from-gold/8 to-transparent px-4 py-5 text-center">
            <SectionLabel>{t("trade.sell.youAreSelling")}</SectionLabel>
            <div className="flex items-center justify-center gap-1.5">
              <FormControl>
                <Input
                  type="number"
                  aria-label={t("trade.sell.ariaWeight")}
                  min="0"
                  step="0.001"
                  {...field}
                  onChange={(e) => field.onChange(Number.isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber)}
                  className="h-14 w-40 border-none bg-transparent text-center text-4xl font-semibold shadow-none focus-visible:ring-2 focus-visible:ring-gold/40 md:text-4xl dark:bg-transparent"
                />
              </FormControl>
              <span className="text-lg font-medium text-muted-foreground">g</span>
            </div>
            {form.formState.errors.value ? (
              <FormMessage className="text-center" />
            ) : (
              <p className="text-xs text-muted-foreground">
                {t("trade.sell.ofAvailable", { available: available.toFixed(3), metal: metalLabel })}
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
          </FormItem>
        )}
      />

      <div className="space-y-1.5">
        <SectionLabel>{t("trade.sell.receivePayoutVia")}</SectionLabel>
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
                  "h-auto min-h-14 justify-between gap-2 rounded-xl px-4 py-3 text-xs font-medium whitespace-normal",
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
                    {t("trade.sell.soon")}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>
      </div>

      <SummaryPanel total={<SummaryRow label={t("trade.sell.youGet")} value={formatBDT(payout.netPayoutBDT)} strong />}>
        <SummaryRow
          label={t("trade.sell.sellPrice", { metal: metalLabel })}
          value={fineRate !== null ? `${formatBDT(fineRate)}/g` : "…"}
        />
        <SummaryRow label={t("trade.sell.weight")} value={`${grams.toFixed(3)} g`} />
        <SummaryRow
          label={t("trade.sell.spread", { pct: (SELL_SPREAD_RATE * 100).toFixed(0) })}
          value={`-${formatBDT(payout.spreadBDT)}`}
        />
      </SummaryPanel>

      <div className="space-y-1.5 text-center">
        <Button
          type="submit"
          variant="gold-solid"
          className="h-12 w-full rounded-xl text-sm font-semibold shadow-lg shadow-gold/10"
          disabled={form.formState.isSubmitting || grams <= 0 || exceedsBalance || fineRate === null}
        >
          <ArrowDownRight />
          {form.formState.isSubmitting
            ? t("trade.buy.processing")
            : t("trade.sell.sellMetalAmount", { metal: metalLabel, amount: formatBDT(payout.netPayoutBDT) })}
        </Button>
        {activePayout && <p className="text-xs text-muted-foreground">{activePayout.note}</p>}
      </div>
    </form>
    </Form>
  );
}

/* -------------------------------------------------------------------------- */
/*  Drawer                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * The Market page's trade entry point: a Buy / Sell button pair that opens the
 * full trade form in a drawer sliding in from the right, so the chart and
 * holdings stay on screen the whole time a trade is in progress. `metal` is
 * owned by the page so the chart and trade form stay in step.
 */
export function TradeCard({ metal }: { metal: Metal; onMetalChange: (metal: Metal) => void }) {
  const { t } = useTranslation();
  const metalLabel = t(METAL_LABEL_KEY[metal]);
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const product = TRADE_PRODUCTS.find((p) => p.metal === metal)!;

  function openDrawer(next: "buy" | "sell") {
    setSide(next);
    setOpen(true);
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="gold-solid" size="sm" onClick={() => openDrawer("buy")}>
          <ArrowUpRight />
          {t("trade.buy.buyMetal", { metal: metalLabel })}
        </Button>
        <Button variant="outline" size="sm" onClick={() => openDrawer("sell")}>
          <ArrowDownRight />
          {t("trade.drawer.sell")} {metalLabel}
        </Button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="gap-0 overflow-y-auto border-gold/15 data-[side=right]:w-full data-[side=right]:sm:max-w-[440px]">
          <SheetHeader className="gap-3 border-b border-border/60 bg-linear-to-br from-gold/10 via-gold/3 to-transparent p-6 pr-12">
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-gold/25 bg-gold/10 text-gold-accent"><Gem className="size-6" strokeWidth={1.5} /></span>
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-accent">
                  {t("trade.drawer.yourNextInvestment")}
                </p>
                <SheetTitle className="text-xl font-semibold">{t("trade.drawer.tradeMetal", { metal: metalLabel })}</SheetTitle>
              </div>
            </div>
            <SheetDescription className="text-xs leading-relaxed">{t("trade.drawer.tagline")}</SheetDescription>
          </SheetHeader>

          <div className="p-4 sm:p-6">
            <Tabs value={side} onValueChange={(v) => setSide(v as "buy" | "sell")}>
              <TabsList aria-label={t("trade.drawer.tradeDirection")} className={TAB_LIST}>
                <TabsTrigger value="buy" className={TAB_TRIGGER}>
                  <ArrowUpRight className="size-4" /> {t("trade.drawer.buy")}
                </TabsTrigger>
                <TabsTrigger value="sell" className={TAB_TRIGGER}>
                  <ArrowDownRight className="size-4" /> {t("trade.drawer.sell")}
                </TabsTrigger>
              </TabsList>

              <div className="mt-4">
                <TabsContent value="buy">
                  <BuyForm metal={metal} product={product} />
                </TabsContent>
                <TabsContent value="sell">
                  <SellForm metal={metal} />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
