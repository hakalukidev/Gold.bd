"use client";

import { KaratSelector, type GoldKarat } from "@/components/shared/karat-selector";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowUpRight, Banknote, Scale, Wallet as WalletIcon } from "lucide-react";
import { ApiError } from "@/lib/api-client";
import { useBuyMetal } from "@/hooks/use-gold-trade";
import { useMetalRate, type Metal } from "@/hooks/use-metal-rate";
import { useWallet } from "@/hooks/use-wallet";
import { computeBuyOrderBreakdown, WEIGHT_UNITS, type WeightUnitKey } from "@/lib/gold-fees";
import { tradeAmountSchema, tradeGramsSchema } from "@/lib/validations/gold";
import { formatBDT } from "@/lib/format";
import { AMOUNT_PRESETS, METAL_LABEL_KEY, METALS } from "@/lib/trade-products";
import { MOCK_WALLET } from "@/lib/mock-wallet";
import { useTranslation } from "@/lib/i18n/use-translation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SELECTED_GOLD } from "@/components/shared/payment-method-button";
import { cn } from "@/lib/utils";

type EntryMode = "amount" | "weight";

const TAB_TRIGGER = "min-w-0 flex-1 gap-1 rounded-lg px-1 text-[11px] sm:gap-1.5 sm:px-2 sm:text-xs data-active:border-gold/40 data-active:bg-gold data-active:font-semibold data-active:text-ink dark:data-active:border-gold/40 dark:data-active:bg-gold dark:data-active:text-ink";
const TAB_LIST = "w-full rounded-2xl border border-border/60 bg-muted/40 p-1 group-data-horizontal/tabs:h-12";

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-3", strong ? "border-t border-dashed border-border pt-4 text-sm font-semibold [&>span:last-child]:text-lg [&>span:last-child]:text-gold-accent" : "text-xs leading-5")}>
      <span className={strong ? undefined : "text-muted-foreground"}>{label}</span>
      <span className="shrink-0 text-right tabular-nums">{value}</span>
    </div>
  );
}

/**
 * Digital Gold — the instant path: no SKU, no bar/coin, no delivery. A buyer
 * just names a metal and a weight (or a taka amount), it's priced off the
 * platform's real 22K/999 anchor rate with no minting premium, and it lands
 * in the wallet's `goldBalanceGrams`/`silverBalanceGrams` the moment the
 * order clears — the same balance the Physical Gold panel's SKUs are minted
 * out of, just without ever choosing a bar or coin. Sits above Physical Gold
 * on the buy page since it's the faster, no-forms way to buy.
 */
export function DigitalGoldPanel() {
  const router = useRouter();
  const { t } = useTranslation();
  const [karat, setKarat] = useState<GoldKarat>(22);
  const [metal, setMetal] = useState<Metal>("gold");
  const [mode, setMode] = useState<EntryMode>("amount");
  const [unitKey, setUnitKey] = useState<WeightUnitKey>("gram");
  const unit = WEIGHT_UNITS.find((u) => u.key === unitKey)!;
  const metalLabel = t(METAL_LABEL_KEY[metal]);

  const { data: rateData } = useMetalRate(metal);
  const { data: walletData } = useWallet();
  const buy = useBuyMetal(metal, karat);

  const form = useForm<{ value: number }>({ defaultValues: { value: AMOUNT_PRESETS[1] } });

  const wallet = walletData ?? MOCK_WALLET;
  const pricePerGram = rateData ? Number(rateData.pricePerGramBDT) * (metal === "gold" ? karat / 22 : 1) : null;

  const rawValue = form.watch("value") || 0;
  const amountBDT = mode === "amount" ? rawValue : pricePerGram ? rawValue * unit.grams * pricePerGram : 0;
  const breakdown = pricePerGram ? computeBuyOrderBreakdown(amountBDT, pricePerGram, metal) : null;

  const cashBDT = Number(wallet.cashBalanceBDT);
  const insufficient = !!breakdown && breakdown.totalPayableBDT > cashBDT;

  /** Converts the field's current value onto the target mode/unit so a
   * switch never silently changes how much metal is on the table. */
  function convert(nextMode: EntryMode, nextUnitKey: WeightUnitKey) {
    if (!pricePerGram) return rawValue;
    const grams = mode === "amount" ? rawValue / pricePerGram : rawValue * unit.grams;
    if (nextMode === "amount") return Number((grams * pricePerGram).toFixed(0));
    const nextUnit = WEIGHT_UNITS.find((u) => u.key === nextUnitKey)!;
    return Number((grams / nextUnit.grams).toFixed(4));
  }

  function handleModeChange(next: EntryMode) {
    form.setValue("value", convert(next, unitKey));
    setMode(next);
  }

  function handleUnitChange(next: WeightUnitKey) {
    form.setValue("value", convert("weight", next));
    setUnitKey(next);
  }

  function handleMetalChange(next: Metal) {
    setMetal(next);
    form.reset({ value: mode === "amount" ? AMOUNT_PRESETS[1] : 1 });
  }

  async function onSubmit(values: { value: number }) {
    const schema = mode === "amount" ? tradeAmountSchema : tradeGramsSchema(metal, "buy");
    const parsed = schema.safeParse(mode === "amount" ? values.value : values.value * unit.grams);
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
      toast.success(t("digitalGoldPanel.addedToWallet", { grams: breakdown.grams.toFixed(4), metal: metalLabel }));
      form.reset({ value: mode === "amount" ? AMOUNT_PRESETS[1] : 1 });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t("trade.buy.purchaseFailed"));
    }
  }

  return (
    <Card className="gap-0 overflow-hidden rounded-2xl border border-border/70 py-0">
      <CardHeader className="border-b border-border/60 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold-accent">
              <Image src="/wallet_assets/coins-pair.png" alt="" width={28} height={28} className="size-7 object-contain" />
            </span>
            <div>
              <CardTitle className="text-lg font-semibold">{t("buyGoldPanel.digitalGold")}</CardTitle>
            </div>
          </div>
          <Badge variant="outline" className="gap-1.5 rounded-full border-gold/30 bg-gold/10 px-2.5 py-1 text-gold-accent">
            <span className="size-1.5 rounded-full bg-current" /> {t("digitalGoldPanel.instantPurchase")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-5 sm:p-7">
        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-[1.15fr_1fr] lg:gap-7">
          <div className="min-w-0 space-y-5">
          <p className="text-sm font-semibold">{t("digitalGoldPanel.purchaseDetails")}</p>
          {metal === "gold" && <KaratSelector value={karat} onChange={setKarat} />}
          <div className="grid grid-cols-2 items-start gap-2 sm:gap-3">
          <Tabs value={metal} onValueChange={(v) => handleMetalChange(v as Metal)} className="min-w-0">
            <TabsList aria-label={t("digitalGoldPanel.chooseMetal")} className={TAB_LIST}>
              {METALS.map((m) => (
                <TabsTrigger key={m} value={m} className={TAB_TRIGGER}>
                  <Image src={`/products/${m}-coin.webp`} alt="" width={20} height={20} className="size-4 shrink-0 object-contain sm:size-5" />
                  {t(METAL_LABEL_KEY[m])}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

            <Tabs value={mode} onValueChange={(v) => handleModeChange(v as EntryMode)} className="min-w-0">
              <TabsList aria-label={t("trade.buy.enterAmountOrWeight")} className={TAB_LIST}>
                <TabsTrigger value="amount" className={TAB_TRIGGER}>
                  <Banknote aria-hidden="true" className="hidden size-3.5 sm:block" /> {t("digitalGoldPanel.amountTab")}
                  <span className="sr-only">{t("digitalGoldPanel.amountSrSuffix")}</span>
                </TabsTrigger>
                <TabsTrigger value="weight" className={TAB_TRIGGER}>
                  <Scale aria-hidden="true" className="hidden size-3.5 sm:block" /> {t("digitalGoldPanel.weightTab")}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
            {mode === "weight" && (
              <Tabs value={unitKey} onValueChange={(v) => handleUnitChange(v as WeightUnitKey)}>
                <TabsList aria-label={t("digitalGoldPanel.weightUnitAria")} className={TAB_LIST}>
                  {WEIGHT_UNITS.map((u) => (
                    <TabsTrigger key={u.key} value={u.key} className={cn(TAB_TRIGGER, "px-2.5 text-xs")}>
                      {t(u.labelKey)}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}

          <div className="space-y-5 rounded-2xl border border-gold/25 bg-linear-to-b from-gold/8 to-transparent px-3 py-6 focus-within:border-gold/60">
          <p className="text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {mode === "amount" ? t("digitalGoldPanel.investmentAmountLabel") : t("digitalGoldPanel.purchaseWeightLabel")}
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
                      aria-label={
                        mode === "amount"
                          ? t("digitalGoldPanel.investmentAmountAria")
                          : t("digitalGoldPanel.purchaseWeightAria", { unit: t(unit.labelKey) })
                      }
                      min="0"
                      step={mode === "amount" ? "1" : "0.0001"}
                      {...field}
                      onChange={(e) => field.onChange(Number.isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber)}
                      className="h-16 w-48 max-w-[70%] border-none bg-transparent px-0 text-center text-4xl font-semibold tracking-tight shadow-none focus-visible:ring-2 focus-visible:ring-gold/40 md:text-4xl dark:bg-transparent"
                    />
                  </FormControl>
                  <span className="text-lg font-medium text-muted-foreground">
                    {mode === "amount" ? "BDT" : t(unit.labelKey).toLowerCase()}
                  </span>
                </div>
                {form.formState.errors.value ? (
                  <FormMessage className="text-center" />
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {mode === "amount"
                      ? t("digitalGoldPanel.approxOfMetal", {
                          grams: breakdown ? breakdown.grams.toFixed(4) : "0.0000",
                          metal: metalLabel.toLowerCase(),
                        })
                      : pricePerGram
                        ? `≈ ${formatBDT(rawValue * unit.grams * pricePerGram)}`
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
                  className={cn("h-9 rounded-lg border-border/70 bg-background/50 px-2.5 text-xs hover:border-gold/50", rawValue === preset && SELECTED_GOLD)}
                  onClick={() => form.setValue("value", preset, { shouldValidate: true })}
                >
                  {preset.toLocaleString("en-BD")}
                </Button>
              ))}
            </div>
          )}

          </div>
          </div>
          <div className="min-w-0 space-y-5 rounded-2xl border border-border/60 bg-muted/20 p-4 sm:p-5">
          <p className="text-sm font-semibold">{t("trade.orderSummary")}</p>
          <div className="space-y-2">
            <div
              className={cn(
                "flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3",
                insufficient ? "border-destructive/40 bg-destructive/5" : "border-gold/30 bg-gold/10"
              )}
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <span className="flex size-9 items-center justify-center rounded-xl bg-gold/15"><WalletIcon className="size-4 text-gold-accent" strokeWidth={1.75} /></span>
                <span>
                  {t("wallet.myAccounts.cashWallet")}
                  <span className="mt-0.5 block text-[10px] font-normal text-muted-foreground">
                    {t("trade.buy.availableBalance")}
                  </span>
                </span>
              </span>
              <span className="text-sm font-semibold tabular-nums">{formatBDT(cashBDT)}</span>
            </div>
            {insufficient && (
              <p className="text-xs text-destructive">
                {t("trade.buy.notEnoughCash")}{" "}
                <Link href="/wallet" className="font-medium underline underline-offset-2">
                  {t("trade.buy.addMoney")}
                </Link>
              </p>
            )}
            {!insufficient && (
              <Link href="/wallet" className="text-xs font-medium text-gold-accent underline-offset-4 hover:underline">
                {t("trade.buy.addMoney")}
              </Link>
            )}
          </div>

          <Separator />

          <div className="space-y-3">
            <SummaryRow
              label={t("digitalGoldPanel.rateLabel", { metal: metalLabel, grade: metal === "gold" ? `${karat}K` : "999" })}
              value={pricePerGram !== null ? `${formatBDT(pricePerGram)}/g` : "—"}
            />
            <SummaryRow label={t("trade.buy.youReceive")} value={breakdown ? `${breakdown.grams.toFixed(4)} g` : "—"} />
            {metal === "gold" && (
              <SummaryRow label={t("trade.buy.govtTax")} value={breakdown ? formatBDT(breakdown.govtTaxBDT) : "—"} />
            )}
            <SummaryRow label={t("trade.buy.transactionCharge")} value={breakdown ? formatBDT(breakdown.transactionChargeBDT) : "—"} />
            <SummaryRow label={t("trade.buy.totalPayable")} value={breakdown ? formatBDT(breakdown.totalPayableBDT) : "—"} strong />
          </div>

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
          </div>
        </form>
        </Form>
      </CardContent>
    </Card>
  );
}
