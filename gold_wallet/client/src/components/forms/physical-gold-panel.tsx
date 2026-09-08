"use client";

import { KaratSelector, type GoldKarat } from "@/components/shared/karat-selector";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowUpRight, CheckCircle2, Gem, Printer, ShieldCheck, TrendingUp, Truck, Wallet as WalletIcon } from "lucide-react";
import { ApiError } from "@/lib/api-client";
import { useBuyMetal } from "@/hooks/use-gold-trade";
import { useMetalRate } from "@/hooks/use-metal-rate";
import { useWallet } from "@/hooks/use-wallet";
import { computeBuyOrderBreakdown, WEIGHT_UNITS, type WeightUnitKey } from "@/lib/gold-fees";
import { tradeAmountSchema, tradeGramsSchema } from "@/lib/validations/gold";
import { physicalOrderAddressSchema, type PhysicalOrderAddress } from "@/lib/validations/physical-order";
import { formatBDT, formatDateTime } from "@/lib/format";
import { MOCK_WALLET } from "@/lib/mock-wallet";
import { PRODUCT_IMAGES } from "@/lib/products";
import { AMOUNT_PRESETS, productPricePerGram, TRADE_PRODUCTS, type TradeProduct } from "@/lib/trade-products";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { SELECTED_GOLD } from "@/components/shared/payment-method-button";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/use-translation";

type Step = "details" | "address" | "receipt";
const TAB_LIST = "w-full rounded-2xl border border-border/60 bg-muted/40 p-1 group-data-horizontal/tabs:h-12";
const TAB_TRIGGER = "flex-1 rounded-xl data-active:border-gold/40 data-active:bg-gold data-active:font-semibold data-active:text-ink dark:data-active:border-gold/40 dark:data-active:bg-gold dark:data-active:text-ink";
const STEPS: { key: Step; labelKey: string }[] = [
  { key: "details", labelKey: "physicalGoldPanel.steps.details" },
  { key: "address", labelKey: "physicalGoldPanel.steps.address" },
  { key: "receipt", labelKey: "physicalGoldPanel.steps.receipt" },
];

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 text-xs leading-5", strong && "border-t border-dashed border-border pt-4 text-sm font-semibold [&>span:last-child]:text-lg [&>span:last-child]:text-gold-accent")}>
      <span className={strong ? undefined : "text-muted-foreground"}>{label}</span>
      <span className="shrink-0 text-right font-medium tabular-nums">{value}</span>
    </div>
  );
}

/** What "receipt" actually renders off — captured the moment the order pays,
 * so it keeps showing the price/weight that cleared even if rates move
 * afterwards. */
interface Invoice {
  orderId: string;
  placedAt: string;
  product: TradeProduct;
  grams: number;
  pricePerGram: number;
  govtTaxBDT: number;
  transactionChargeBDT: number;
  totalPayableBDT: number;
  address: PhysicalOrderAddress;
}

/**
 * Physical Gold — the same TRADE_PRODUCTS SKUs as Digital Gold's plain
 * weight, minted into an actual bar or coin and couriered to a delivery
 * address. One product per order rather than a cart, so the flow is a plain
 * three-step wizard: price and check the balance, take delivery details,
 * then pay and hand back an invoice — closer to how a checkout works than to
 * the instant, address-free Digital Gold buy above it.
 */
export function PhysicalGoldPanel() {
  const router = useRouter();
  const { t } = useTranslation();
  const [karat, setKarat] = useState<GoldKarat>(22);
  const [step, setStep] = useState<Step>("details");
  const stepIndex = STEPS.findIndex((s) => s.key === step);
  const [productKey, setProductKey] = useState(TRADE_PRODUCTS[0].key);
  const [unitKey, setUnitKey] = useState<WeightUnitKey>("gram");
  const [invoice, setInvoice] = useState<Invoice | null>(null);

  const baseProduct = TRADE_PRODUCTS.find((p) => p.key === productKey)!;
  const product = baseProduct.metal === "gold" ? { ...baseProduct, purity: karat / 22, label: `Gold ${baseProduct.form === "bar" ? "Bar" : "Coin"} (${karat}K)`, unitNoun: `${karat}K gold ${baseProduct.form}`, purityNote: `${karat}K Hallmarked & Certified` } : baseProduct;
  const unit = WEIGHT_UNITS.find((u) => u.key === unitKey)!;

  const { data: walletData } = useWallet();
  const { data: rateData } = useMetalRate(product.metal);
  const buy = useBuyMetal(product.metal, karat);

  const amountForm = useForm<{ value: number }>({ defaultValues: { value: AMOUNT_PRESETS[1] } });
  const [mode, setMode] = useState<"amount" | "weight">("amount");

  const addressForm = useForm<PhysicalOrderAddress>({
    resolver: zodResolver(physicalOrderAddressSchema),
    defaultValues: { fullName: "", phone: "", district: "", postalCode: "", streetAddress: "" },
  });

  const wallet = walletData ?? MOCK_WALLET;
  const cashBDT = Number(wallet.cashBalanceBDT);
  const fineRate = rateData ? Number(rateData.pricePerGramBDT) : null;
  const pricePerGram = productPricePerGram(fineRate, product);

  const rawValue = amountForm.watch("value") || 0;
  const amountBDT = mode === "amount" ? rawValue : pricePerGram ? rawValue * unit.grams * pricePerGram : 0;
  const breakdown = pricePerGram ? computeBuyOrderBreakdown(amountBDT, pricePerGram, product.metal) : null;
  const insufficient = !!breakdown && breakdown.totalPayableBDT > cashBDT;

  function convert(nextMode: "amount" | "weight", nextUnitKey: WeightUnitKey) {
    if (!pricePerGram) return rawValue;
    const grams = mode === "amount" ? rawValue / pricePerGram : rawValue * unit.grams;
    if (nextMode === "amount") return Number((grams * pricePerGram).toFixed(0));
    const nextUnit = WEIGHT_UNITS.find((u) => u.key === nextUnitKey)!;
    return Number((grams / nextUnit.grams).toFixed(4));
  }

  function handleModeChange(next: "amount" | "weight") {
    amountForm.setValue("value", convert(next, unitKey));
    setMode(next);
  }

  function handleUnitChange(next: WeightUnitKey) {
    amountForm.setValue("value", convert("weight", next));
    setUnitKey(next);
  }

  function goToAddress(values: { value: number }) {
    const schema = mode === "amount" ? tradeAmountSchema : tradeGramsSchema(product.metal, "buy");
    const parsed = schema.safeParse(mode === "amount" ? values.value : values.value * unit.grams);
    if (!parsed.success) {
      amountForm.setError("value", { message: parsed.error.issues[0]?.message ?? t("trade.buy.enterValidAmount") });
      return;
    }
    if (!breakdown) return;
    if (insufficient) {
      amountForm.setError("value", { message: t("trade.buy.cashWalletHolds", { amount: formatBDT(cashBDT) }) });
      return;
    }
    setStep("address");
  }

  async function submitOrder(address: PhysicalOrderAddress) {
    if (!breakdown || !pricePerGram) return;
    try {
      const grams = Number(breakdown.grams.toFixed(4));
      await buy.mutateAsync(grams);
      setInvoice({
        orderId: `PG-${Date.now().toString(36).toUpperCase()}`,
        placedAt: new Date().toISOString(),
        product,
        grams,
        pricePerGram,
        govtTaxBDT: breakdown.govtTaxBDT,
        transactionChargeBDT: breakdown.transactionChargeBDT,
        totalPayableBDT: breakdown.totalPayableBDT,
        address,
      });
      toast.success(t("physicalGoldPanel.orderPaid"));
      setStep("receipt");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t("physicalGoldPanel.orderFailed"));
    }
  }

  function startNewOrder() {
    setInvoice(null);
    setStep("details");
    amountForm.reset({ value: AMOUNT_PRESETS[1] });
    setMode("amount");
    addressForm.reset({ fullName: "", phone: "", district: "", postalCode: "", streetAddress: "" });
  }

  return (
    <Card className="gap-0 overflow-hidden rounded-2xl border border-border/70 py-0">
      <CardHeader className="border-b border-border/60 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold-accent">
              <Gem className="size-5" strokeWidth={1.5} />
            </span>
            <div>
              <CardTitle className="text-lg font-semibold">{t("physicalGoldPanel.title")}</CardTitle>
            </div>
          </div>
          <div aria-label={t("physicalGoldPanel.orderProgress")} className="flex flex-wrap gap-2 text-xs font-medium text-muted-foreground">
            {STEPS.map((s, i) => (
              <span
                key={s.key}
                aria-current={i === stepIndex ? "step" : undefined}
                className={cn("rounded-full border px-3 py-2", i <= stepIndex ? "border-gold/30 bg-gold/10 text-gold-accent" : "border-border/60")}
              >
                {t(s.labelKey)}
              </span>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-7">
        {step === "details" && (
          <Form {...amountForm}>
          <form onSubmit={amountForm.handleSubmit(goToAddress)} className="grid items-start gap-7 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,1fr)]">
            <div className="min-w-0 space-y-5">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold">{t("physicalGoldPanel.selectProduct")}</h2>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-5">
              {TRADE_PRODUCTS.filter((opt) => opt.key !== "gold-coin-24k").map((opt) => (
                <ProductButton key={opt.key} option={opt} selected={product.key === opt.key} onSelect={setProductKey} />
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold/20 bg-gold/5 p-4">
              <Badge variant="outline" className="rounded-full border-gold/30 bg-gold/10 text-gold-accent">
                <ShieldCheck className="size-3" strokeWidth={1.75} />
                {product.purityNote}
              </Badge>
              <span className="flex items-center gap-1.5 text-sm font-semibold tabular-nums">
                <TrendingUp className="size-3.5 text-gold" strokeWidth={1.75} />
                {pricePerGram !== null ? `${formatBDT(pricePerGram)}/g` : "Loading…"}
              </span>
            </div>

            {product.metal === "gold" && <KaratSelector value={karat} onChange={setKarat} />}
            <ProductSpotlight product={product} />
            </div>

            <div className="min-w-0 space-y-5 rounded-2xl border border-border/60 bg-muted/20 p-4 sm:p-5">
            <h2 className="text-base font-semibold">{t("physicalGoldPanel.yourOrder")}</h2>
            <div className="flex flex-col gap-2">
              <Tabs value={mode} onValueChange={(v) => handleModeChange(v as "amount" | "weight")} className="flex-1">
                <TabsList aria-label={t("trade.buy.enterAmountOrWeight")} className={TAB_LIST}>
                  <TabsTrigger value="amount" className={TAB_TRIGGER}>
                    {t("trade.buy.amountBdt")}
                  </TabsTrigger>
                  <TabsTrigger value="weight" className={TAB_TRIGGER}>
                    {t("digitalGoldPanel.weightTab")}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              {mode === "weight" && (
                <Tabs value={unitKey} onValueChange={(v) => handleUnitChange(v as WeightUnitKey)}>
                  <TabsList aria-label={t("digitalGoldPanel.weightUnitAria")} className={TAB_LIST}>
                    {WEIGHT_UNITS.map((u) => (
                      <TabsTrigger
                        key={u.key}
                        value={u.key}
                        className={cn(TAB_TRIGGER, "px-2.5 text-xs")}
                      >
                        {t(u.labelKey)}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              )}
            </div>

            <div className="space-y-4 rounded-2xl border border-gold/25 bg-linear-to-b from-gold/8 to-transparent px-3 py-5 focus-within:border-gold/60">
            <p className="text-center text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              {mode === "amount" ? t("physicalGoldPanel.purchaseAmountLabel") : t("digitalGoldPanel.purchaseWeightLabel")}
            </p>
            <FormField
              control={amountForm.control}
              name="value"
              render={({ field }) => (
                <FormItem className="gap-1 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <FormControl>
                      <Input
                        type="number"
                        aria-label={
                          mode === "amount"
                            ? t("physicalGoldPanel.purchaseAmountAria")
                            : t("digitalGoldPanel.purchaseWeightAria", { unit: t(unit.labelKey) })
                        }
                        min="0"
                        step={mode === "amount" ? "1" : "0.0001"}
                        {...field}
                        onChange={(e) => field.onChange(Number.isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber)}
                        className="h-14 w-48 max-w-[70%] border-none bg-transparent px-0 text-center text-4xl font-semibold tracking-tight shadow-none focus-visible:ring-2 focus-visible:ring-gold/40 md:text-4xl dark:bg-transparent"
                      />
                    </FormControl>
                    <span className="text-lg font-medium text-muted-foreground">
                      {mode === "amount" ? "BDT" : t(unit.labelKey).toLowerCase()}
                    </span>
                  </div>
                  {amountForm.formState.errors.value ? (
                    <FormMessage className="text-center" />
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {mode === "amount"
                        ? t("trade.buy.approxOf", {
                            grams: breakdown ? breakdown.grams.toFixed(4) : "0.0000",
                            unit: product.unitNoun,
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
                    onClick={() => amountForm.setValue("value", preset, { shouldValidate: true })}
                  >
                    {preset.toLocaleString("en-BD")}
                  </Button>
                ))}
              </div>
            )}

            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {t("trade.buy.payWith")}
              </Label>
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
            </div>

            <Separator />

            <div className="space-y-3">
              <SummaryRow label={t("trade.buy.priceLabel", { product: product.label })} value={pricePerGram !== null ? `${formatBDT(pricePerGram)}/g` : "—"} />
              <SummaryRow label={t("trade.buy.youReceive")} value={breakdown ? `${breakdown.grams.toFixed(4)} g` : "—"} />
              {product.metal === "gold" && (
                <SummaryRow label={t("trade.buy.govtTax")} value={breakdown ? formatBDT(breakdown.govtTaxBDT) : "—"} />
              )}
              <SummaryRow label={t("trade.buy.transactionCharge")} value={breakdown ? formatBDT(breakdown.transactionChargeBDT) : "—"} />
              <SummaryRow label={t("trade.buy.totalPayable")} value={breakdown ? formatBDT(breakdown.totalPayableBDT) : "—"} strong />
            </div>

            <Button type="submit" variant="gold-solid" className="h-12 w-full rounded-xl text-sm font-semibold" disabled={pricePerGram === null || amountBDT <= 0 || insufficient}>
              <Truck />
              {t("physicalGoldPanel.continueToDelivery")}
            </Button>
            </div>
          </form>
          </Form>
        )}

        {step === "address" && breakdown && (
          <Form {...addressForm}>
            <form onSubmit={addressForm.handleSubmit(submitOrder)} className="mx-auto max-w-3xl space-y-6 rounded-2xl border border-border/60 bg-muted/20 p-4 sm:p-6 [&_input]:h-12 [&_input]:rounded-xl [&_textarea]:rounded-xl">
              <div className="flex items-center gap-3 rounded-md border bg-muted/40 p-3">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-md border bg-background p-2">
                  <Image src={PRODUCT_IMAGES[product.metal][product.form]} alt="" width={40} height={40} className="size-full object-contain" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{product.label}</p>
                  <p className="text-xs text-muted-foreground">{breakdown.grams.toFixed(4)} g</p>
                </div>
                <span className="text-sm font-semibold tabular-nums">{formatBDT(breakdown.totalPayableBDT)}</span>
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {t("physicalGoldPanel.courierAddress")}
                </Label>
                <FormField
                  control={addressForm.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder={t("collectPanel.fullNamePlaceholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addressForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder={t("collectPanel.phonePlaceholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={addressForm.control}
                    name="district"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder={t("collectPanel.districtPlaceholder")} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addressForm.control}
                    name="postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder={t("collectPanel.postalCodePlaceholder")} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={addressForm.control}
                  name="streetAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea rows={2} placeholder={t("collectPanel.streetAddressPlaceholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <p className="text-xs text-muted-foreground">{t("physicalGoldPanel.insuredDeliveryNote")}</p>
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" className="h-12 rounded-xl" onClick={() => setStep("details")} disabled={buy.isPending}>
                  <ArrowLeft />
                  {t("kyc.back")}
                </Button>
                <Button type="submit" variant="gold-solid" className="h-auto min-h-12 flex-1 rounded-xl whitespace-normal" disabled={buy.isPending}>
                  <ArrowUpRight />
                  {buy.isPending
                    ? t("trade.buy.processing")
                    : t("physicalGoldPanel.submitOrderPay", { amount: formatBDT(breakdown.totalPayableBDT) })}
                </Button>
              </div>
            </form>
          </Form>
        )}

        {step === "receipt" && invoice && <ReceiptStep invoice={invoice} onNewOrder={startNewOrder} />}
      </CardContent>
    </Card>
  );
}

function ReceiptStep({ invoice, onNewOrder }: { invoice: Invoice; onNewOrder: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-3xl space-y-6 rounded-2xl border border-border/60 p-4 sm:p-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-6" strokeWidth={1.75} />
        </span>
        <p className="text-lg font-semibold">{t("physicalGoldPanel.orderConfirmed")}</p>
        <p className="text-sm text-muted-foreground">
          {t("physicalGoldPanel.invoiceMeta", { orderId: invoice.orderId, date: formatDateTime(invoice.placedAt) })}
        </p>
      </div>

      <div className="flex items-center gap-3 rounded-md border bg-muted/40 p-3">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-md border bg-background p-2">
          <Image src={PRODUCT_IMAGES[invoice.product.metal][invoice.product.form]} alt="" width={40} height={40} className="size-full object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{invoice.product.label}</p>
          <p className="text-xs text-muted-foreground">{invoice.product.purityNote}</p>
        </div>
        <span className="text-sm font-semibold tabular-nums">{invoice.grams.toFixed(4)} g</span>
      </div>

      <div className="space-y-1.5 rounded-md bg-muted/40 p-3">
        <SummaryRow label={t("trade.buy.priceLabel", { product: invoice.product.label })} value={`${formatBDT(invoice.pricePerGram)}/g`} />
        <SummaryRow label={t("trade.sell.weight")} value={`${invoice.grams.toFixed(4)} g`} />
        {invoice.product.metal === "gold" && (
          <SummaryRow label={t("trade.buy.govtTax")} value={formatBDT(invoice.govtTaxBDT)} />
        )}
        <SummaryRow label={t("trade.buy.transactionCharge")} value={formatBDT(invoice.transactionChargeBDT)} />
        <Separator />
        <SummaryRow label={t("physicalGoldPanel.totalPaid")} value={formatBDT(invoice.totalPayableBDT)} strong />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {t("physicalGoldPanel.deliveryTo")}
        </Label>
        <div className="rounded-md border p-3 text-sm">
          <p className="font-medium">{invoice.address.fullName}</p>
          <p className="text-muted-foreground">{invoice.address.phone}</p>
          <p className="text-muted-foreground">
            {invoice.address.streetAddress}, {invoice.address.district} {invoice.address.postalCode}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">{t("physicalGoldPanel.insuredDeliveryNote")}</p>
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={() => window.print()}>
          <Printer />
          {t("physicalGoldPanel.printInvoice")}
        </Button>
        <Button type="button" variant="gold-solid" className="flex-1" onClick={onNewOrder}>
          {t("physicalGoldPanel.makeAnotherPurchase")}
        </Button>
      </div>
    </div>
  );
}

function ProductSpotlight({ product }: { product: TradeProduct }) {
  const { t } = useTranslation();
  const image = PRODUCT_IMAGES[product.metal][product.form];

  return (
    <div className="overflow-hidden rounded-2xl border border-gold/20 bg-linear-to-br from-gold/10 via-background to-muted/30">
      <div className="relative flex min-h-64 items-center justify-center border-b border-gold/10 p-8 sm:min-h-80">
        <span aria-hidden="true" className="absolute size-48 rounded-full bg-gold/10 blur-3xl" />
        <Image src={image} alt={product.label} width={240} height={240} className="relative size-48 object-contain drop-shadow-2xl sm:size-60" />
      </div>
      <div className="min-w-0 p-5 sm:p-6">
        <p className="text-xl font-semibold">{product.label}</p>
        <dl className="mt-5 space-y-3 text-xs sm:text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <dt className="text-muted-foreground">{t("physicalGoldPanel.purity")}</dt>
            <dd className="font-medium">{product.purityNote}</dd>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <dt className="text-muted-foreground">{t("physicalGoldPanel.sourcedFrom")}</dt>
            <dd className="font-medium">{t("physicalGoldPanel.sourcedFromValue")}</dd>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <dt className="text-muted-foreground">{t("physicalGoldPanel.quality")}</dt>
            <dd className="font-medium">{t("physicalGoldPanel.qualityValue")}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

function ProductButton({ option, selected, onSelect }: { option: TradeProduct; selected: boolean; onSelect: (key: string) => void }) {
  return (
    <Button
      type="button"
      variant="outline"
      aria-pressed={selected}
      onClick={() => onSelect(option.key)}
      className={cn("relative h-auto min-h-32 flex-col gap-3 rounded-2xl border-border/70 bg-muted/20 p-3 text-center text-xs whitespace-normal transition-colors hover:border-gold/50 hover:bg-gold/5", selected && "border-gold/60 bg-gold/10 text-gold-accent hover:bg-gold/15 dark:bg-gold/10")}
    >
      {selected && <CheckCircle2 className="absolute top-2 right-2 size-3.5 text-gold-accent" />}
      <Image src={PRODUCT_IMAGES[option.metal][option.form]} alt="" width={64} height={64} className="size-16 object-contain" />
      <span className="font-semibold">{option.label}</span>
    </Button>
  );
}
