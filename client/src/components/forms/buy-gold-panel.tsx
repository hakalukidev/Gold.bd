"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowUpRight, Plus, ShieldCheck, TrendingUp, Wallet as WalletIcon, X } from "lucide-react";
import { tradeAmountSchema } from "@/lib/validations/gold";
import { ApiError } from "@/lib/api-client";
import { useBuyMetal } from "@/hooks/use-gold-trade";
import { useMetalRate, type Metal } from "@/hooks/use-metal-rate";
import { useWallet } from "@/hooks/use-wallet";
import { computeBuyOrderBreakdown } from "@/lib/gold-fees";
import { formatBDT } from "@/lib/format";
import { getLatestRate } from "@/lib/mock-rates";
import { MOCK_WALLET } from "@/lib/mock-wallet";
import { PRODUCT_IMAGES } from "@/lib/products";
import { AMOUNT_PRESETS, TRADE_PRODUCTS, productPricePerGram, type TradeProduct } from "@/lib/trade-products";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader } from "@/components/shared/page-header";
import { WalletBadge } from "@/components/shared/wallet-badge";
import { SELECTED_GOLD } from "@/components/shared/payment-method-button";
import { cn } from "@/lib/utils";

/** One SKU + weight sitting in the order — the form's `amount`/`weight`
 * fields configure the *next* line to add, they don't own the order itself. */
interface OrderLine {
  productKey: string;
  grams: number;
}

/**
 * Buying is funded from the cash wallet and nothing else — bKash/Nagad/card
 * top the wallet up (the wallet page's Add money flow) rather than settling a
 * trade — so this panel shows the one funding source it can actually debit and
 * routes to Add money when there isn't enough in it. Every SKU in
 * trade-products.ts is buyable: gold and silver both have a live rate and a
 * `/api/{metal}/buy` mutation (see use-gold-trade.ts).
 *
 * The order can mix both metals, but each mutation only buys one metal at a
 * time — so "Confirm order" fires at most one gold call and one silver call,
 * each summing every line of that metal rather than one call per line.
 */
export function BuyGoldPanel() {
  const router = useRouter();
  const { data: walletData } = useWallet();

  const form = useForm<{ amount: number }>({ defaultValues: { amount: AMOUNT_PRESETS[1] } });
  const [productKey, setProductKey] = useState(TRADE_PRODUCTS[0].key);
  const [orderLines, setOrderLines] = useState<OrderLine[]>([]);
  const [editingLineKey, setEditingLineKey] = useState<string | null>(null);

  const product = TRADE_PRODUCTS.find((p) => p.key === productKey)!;
  const { data: goldRateData } = useMetalRate("gold");
  const { data: silverRateData } = useMetalRate("silver");
  const buyGold = useBuyMetal("gold");
  const buySilver = useBuyMetal("silver");

  const wallet = walletData ?? MOCK_WALLET;
  const cashBDT = Number(wallet.cashBalanceBDT);

  const fineRateByMetal: Record<Metal, number> = {
    gold: Number((goldRateData ?? getLatestRate("gold")).pricePerGramBDT),
    silver: Number((silverRateData ?? getLatestRate("silver")).pricePerGramBDT),
  };
  const pricePerGram = productPricePerGram(fineRateByMetal[product.metal], product);

  // Amount (BDT) is the one value actually stored — weight is always derived
  // from it, and editing the weight field just writes a converted amount
  // back, so the two fields stay in sync without a separate source of truth.
  const amountBDT = form.watch("amount") || 0;
  const breakdown = pricePerGram ? computeBuyOrderBreakdown(amountBDT, pricePerGram, product.metal) : null;
  const weightGrams = breakdown?.grams ?? 0;

  function handleWeightChange(raw: string) {
    if (!pricePerGram) return;
    const grams = Number(raw) || 0;
    form.setValue("amount", Number((grams * pricePerGram).toFixed(0)), { shouldValidate: true });
  }

  // Each line re-prices off the live rate for its own metal (not the rate
  // that was in effect when it was added), so the summary always matches
  // what "Confirm order" will actually pay.
  const orderLineDetails = orderLines.map((line) => {
    const lineProduct = TRADE_PRODUCTS.find((p) => p.key === line.productKey)!;
    const lineRate = productPricePerGram(fineRateByMetal[lineProduct.metal], lineProduct);
    const lineAmountBDT = lineRate !== null ? line.grams * lineRate : 0;
    const lineBreakdown = lineRate !== null ? computeBuyOrderBreakdown(lineAmountBDT, lineRate, lineProduct.metal) : null;
    return { product: lineProduct, grams: line.grams, amountBDT: lineAmountBDT, breakdown: lineBreakdown };
  });

  const orderTotals = orderLineDetails.reduce(
    (acc, l) => ({
      subtotalBDT: acc.subtotalBDT + l.amountBDT,
      govtTaxBDT: acc.govtTaxBDT + (l.breakdown?.govtTaxBDT ?? 0),
      transactionChargeBDT: acc.transactionChargeBDT + (l.breakdown?.transactionChargeBDT ?? 0),
      totalPayableBDT: acc.totalPayableBDT + (l.breakdown?.totalPayableBDT ?? 0),
    }),
    { subtotalBDT: 0, govtTaxBDT: 0, transactionChargeBDT: 0, totalPayableBDT: 0 }
  );

  const gramsByMetal = orderLineDetails.reduce<Record<Metal, number>>(
    (acc, l) => ({ ...acc, [l.product.metal]: acc[l.product.metal] + l.grams }),
    { gold: 0, silver: 0 }
  );

  const hasGoldLine = orderLineDetails.some((l) => l.product.metal === "gold");
  const orderInsufficientBalance = orderLines.length > 0 && orderTotals.totalPayableBDT > cashBDT;
  const isConfirming = buyGold.isPending || buySilver.isPending;

  function onAddToOrder(values: { amount: number }) {
    const parsed = tradeAmountSchema.safeParse(values.amount);
    if (!parsed.success) {
      form.setError("amount", { message: parsed.error.issues[0]?.message ?? "Enter a valid amount" });
      return;
    }
    if (!breakdown) return;

    setOrderLines((prev) => {
      const existing = prev.find((l) => l.productKey === product.key);
      if (existing) {
        return prev.map((l) => (l.productKey === product.key ? { ...l, grams: l.grams + breakdown.grams } : l));
      }
      return [...prev, { productKey: product.key, grams: breakdown.grams }];
    });
    toast.success(`Added ${product.label} to order`);
    form.setValue("amount", AMOUNT_PRESETS[1]);
  }

  function handleRemoveLine(key: string) {
    setOrderLines((prev) => prev.filter((l) => l.productKey !== key));
    if (editingLineKey === key) setEditingLineKey(null);
  }

  function handleEditLineGrams(key: string, raw: string) {
    const grams = Math.max(0, Number(raw) || 0);
    setOrderLines((prev) => prev.map((l) => (l.productKey === key ? { ...l, grams } : l)));
  }

  /** Editing down to 0g drops the line instead of leaving a dead ৳0.00 row. */
  function finishEditingLine(key: string) {
    setEditingLineKey(null);
    setOrderLines((prev) => prev.filter((l) => l.productKey !== key || l.grams > 0));
  }

  async function handleConfirmOrder() {
    if (orderLines.length === 0 || orderInsufficientBalance || isConfirming) return;
    try {
      if (gramsByMetal.gold > 0) await buyGold.mutateAsync(Number(gramsByMetal.gold.toFixed(4)));
      if (gramsByMetal.silver > 0) await buySilver.mutateAsync(Number(gramsByMetal.silver.toFixed(4)));
      toast.success("Order confirmed");
      setOrderLines([]);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Order failed");
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px] lg:items-start">
      {/* ---------- Order form — configures one line at a time ---------- */}
      <Card>
        {/* Heading lives on the card itself (not the two-column grid above
            it), so it's centered against this card's own width rather than
            the wider form+summary layout. */}
        <CardHeader className="flex-col items-center border-b text-center">
          <PageHeader
            centered
            title="Buy gold & silver"
            description="Bars and coins from as low as ৳500, paid from your cash wallet"
            action={<WalletBadge />}
          />
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onAddToOrder)} className="space-y-5">
            {/* Product / purity selector — one evenly-spread row of boxed,
                image-led cards, like the landing page's why-us cards. */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {TRADE_PRODUCTS.map((opt) => (
                <ProductButton key={opt.key} option={opt} selected={product.key === opt.key} onSelect={setProductKey} />
              ))}
            </div>

            {/* Certification + live price */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-gold/20 bg-gold/5 px-2.5 py-1.5">
              <Badge variant="outline" className="border-gold/30 bg-gold/15 text-gold">
                <ShieldCheck className="size-3" strokeWidth={1.75} />
                {product.purityNote}
              </Badge>
              <span className="flex items-center gap-1.5 text-sm font-semibold tabular-nums">
                <TrendingUp className="size-3.5 text-gold" strokeWidth={1.75} />
                {pricePerGram !== null ? `${formatBDT(pricePerGram)}/g` : "Loading…"}
              </span>
            </div>

            {/* Product spotlight — photo(s) + specs for the selected SKU */}
            <ProductSpotlight product={product} />

            {/* Amount and weight side by side, always both editable — typing
                in either updates the other via the shared `amount` value. */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="buy-amount" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Amount (BDT)
                </Label>
                <div className="relative">
                  <Input
                    id="buy-amount"
                    type="number"
                    min="0"
                    step="1"
                    {...form.register("amount", { valueAsNumber: true })}
                    className="pr-11 text-lg font-semibold tabular-nums"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-medium text-muted-foreground">
                    BDT
                  </span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="buy-weight" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Weight (grams)
                </Label>
                <div className="relative">
                  <Input
                    id="buy-weight"
                    type="number"
                    min="0"
                    step="0.001"
                    value={weightGrams ? Number(weightGrams.toFixed(4)) : 0}
                    onChange={(e) => handleWeightChange(e.target.value)}
                    className="pr-7 text-lg font-semibold tabular-nums"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-medium text-muted-foreground">
                    g
                  </span>
                </div>
              </div>
            </div>
            <p className="-mt-2 text-center text-sm text-muted-foreground">
              {form.formState.errors.amount ? (
                <span className="text-destructive">{form.formState.errors.amount.message}</span>
              ) : (
                `${weightGrams.toFixed(4)} g of ${product.unitNoun}`
              )}
            </p>

            <div className="flex flex-wrap justify-center gap-2">
              {AMOUNT_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(amountBDT === preset && SELECTED_GOLD)}
                  onClick={() => form.setValue("amount", preset, { shouldValidate: true })}
                >
                  {preset.toLocaleString("en-BD")}
                </Button>
              ))}
            </div>

            {/* Funding source — cash only, shown for context; affordability
                is actually checked against the whole order, in the summary. */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Pay with</Label>
              <div className="flex items-center justify-between gap-2 rounded-md border border-gold/30 bg-gold/10 px-3 py-2.5">
                <span className="flex items-center gap-2 font-medium">
                  <WalletIcon className="size-4 text-gold" strokeWidth={1.75} />
                  Cash wallet
                </span>
                <span className="font-semibold tabular-nums">{formatBDT(cashBDT)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Gold and silver are bought with wallet cash — top the wallet up with bKash, Nagad, bank transfer or card first.
              </p>
            </div>

            {/* Adds this line to the order on the right — doesn't buy
                anything yet, that's what "Confirm order" over there does. */}
            <Button type="submit" variant="gold-outline" className="w-full" disabled={pricePerGram === null || amountBDT <= 0}>
              <Plus />
              Add to order
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ---------- Order summary — every line added, confirmed together ---------- */}
      <Card className="lg:sticky lg:top-6">
        <CardHeader className="flex items-center justify-between gap-2">
          <CardTitle>Order summary</CardTitle>
          <Badge variant="secondary" className="shrink-0">
            {orderLines.length} item{orderLines.length === 1 ? "" : "s"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {orderLineDetails.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              Your order is empty. Pick a product on the left and press “Add to order”.
            </div>
          ) : (
            <div className="space-y-3">
              {orderLineDetails.map((line) => (
                <div key={line.product.key} className="relative flex gap-3 rounded-md border p-3">
                  <button
                    type="button"
                    aria-label={`Remove ${line.product.label}`}
                    onClick={() => handleRemoveLine(line.product.key)}
                    className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm transition-colors hover:border-destructive hover:text-destructive"
                  >
                    <X className="size-3" />
                  </button>
                  <div className="flex size-16 shrink-0 items-center justify-center rounded-md border bg-muted/40 p-2">
                    <Image
                      src={PRODUCT_IMAGES[line.product.metal][line.product.form]}
                      alt=""
                      width={48}
                      height={48}
                      className="size-full object-contain"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{line.product.label}</p>
                    <p className="text-xs text-muted-foreground">{line.product.purityNote}</p>
                    <div className="mt-2 flex items-center justify-between gap-2 text-sm">
                      {editingLineKey === line.product.key ? (
                        <Input
                          autoFocus
                          type="number"
                          min="0"
                          step="0.001"
                          value={line.grams}
                          onChange={(e) => handleEditLineGrams(line.product.key, e.target.value)}
                          onBlur={() => finishEditingLine(line.product.key)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              finishEditingLine(line.product.key);
                            }
                          }}
                          className="h-7 w-24 px-2 text-sm tabular-nums"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingLineKey(line.product.key)}
                          className="rounded text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground"
                        >
                          {line.grams.toFixed(4)} g
                        </button>
                      )}
                      <span className="font-semibold tabular-nums">{formatBDT(line.amountBDT)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pricing breakdown */}
          <div className="space-y-2 rounded-md bg-muted/40 p-3">
            <SummaryRow label="Subtotal" value={orderLines.length ? formatBDT(orderTotals.subtotalBDT) : "—"} />
            {hasGoldLine && <SummaryRow label="Govt. gold tax (2,500/bhori)" value={formatBDT(orderTotals.govtTaxBDT)} />}
            <SummaryRow label="Transaction charge (1.5%)" value={orderLines.length ? formatBDT(orderTotals.transactionChargeBDT) : "—"} />
          </div>
          <Separator />
          <div className="flex items-center justify-between text-base font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{orderLines.length ? formatBDT(orderTotals.totalPayableBDT) : "—"}</span>
          </div>
          {orderInsufficientBalance && (
            <p className="text-sm text-destructive">
              Not enough cash for this order.{" "}
              <Link href="/wallet" className="font-medium underline underline-offset-2">
                Add money
              </Link>
            </p>
          )}

          <Button
            type="button"
            variant="gold-solid"
            className="w-full"
            onClick={handleConfirmOrder}
            disabled={orderLines.length === 0 || orderInsufficientBalance || isConfirming}
          >
            {isConfirming ? <Spinner /> : <ArrowUpRight />}
            {isConfirming
              ? "Confirming…"
              : orderLines.length > 0
                ? `Confirm order · ${formatBDT(orderTotals.totalPayableBDT)}`
                : "Confirm order"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Gold and silver are stored instantly in your insured vault. Collect physical metal anytime from 0.5g.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/** Photo + a short spec sheet for the currently selected SKU. */
function ProductSpotlight({ product }: { product: TradeProduct }) {
  const image = PRODUCT_IMAGES[product.metal][product.form];

  return (
    <div className="flex flex-col gap-4 rounded-md border border-gold/20 bg-gold/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <Image src={image} alt="" width={112} height={112} className="mx-auto size-24 shrink-0 object-contain sm:mx-0 sm:size-28" />
      <div className="min-w-0 text-right">
        <p className="font-semibold">{product.label}</p>
        <dl className="mt-2 space-y-1.5 text-sm">
          <div className="flex items-center justify-end gap-2">
            <dt className="text-muted-foreground">Purity:</dt>
            <dd className="font-medium">{product.purityNote}</dd>
          </div>
          <div className="flex items-center justify-end gap-2">
            <dt className="text-muted-foreground">Sourced from:</dt>
            <dd className="font-medium">BAJUS-certified refiners</dd>
          </div>
          <div className="flex items-center justify-end gap-2">
            <dt className="text-muted-foreground">Quality:</dt>
            <dd className="font-medium">Assay-certified, tamper-sealed</dd>
          </div>
        </dl>
      </div>
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
      className={cn("h-auto flex-col gap-2 rounded-md p-3 text-center text-xs whitespace-normal", selected && SELECTED_GOLD)}
    >
      <Image src={PRODUCT_IMAGES[option.metal][option.form]} alt="" width={48} height={48} className="size-12 object-contain" />
      <span className="font-semibold">{option.label}</span>
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
