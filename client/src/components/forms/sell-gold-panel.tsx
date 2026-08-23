"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDownRight, Building2, Smartphone, Wallet as WalletIcon } from "lucide-react";
import { sellGoldSchema } from "@/lib/validations/gold";
import { ApiError } from "@/lib/api-client";
import { useSellGold } from "@/hooks/use-gold-trade";
import { useGoldRate } from "@/hooks/use-gold-rate";
import { useWallet } from "@/hooks/use-wallet";
import { computeSellPayout } from "@/lib/gold-fees";
import { formatBDT } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { SELECTED_GOLD } from "@/components/shared/payment-method-button";
import { cn } from "@/lib/utils";

const METALS: { key: string; label: string; enabled: boolean }[] = [
  { key: "gold", label: "Gold", enabled: true },
  // No /api/silver/sell endpoint in this repo yet (see CLAUDE.md) — shown
  // for parity with the reference design, disabled instead of faked.
  { key: "silver", label: "Silver", enabled: false },
];

// Only "Gold.bd Wallet" actually credits anything today — mobile wallet /
// bank cash-out are payment-gateway integrations this repo has no backend for.
const PAYOUT_METHODS: { key: string; label: string; icon: typeof WalletIcon; enabled: boolean; note: string }[] = [
  { key: "goldbd-wallet", label: "Gold.bd Wallet", icon: WalletIcon, enabled: true, note: "Cash is credited to your wallet instantly." },
  { key: "mobile-wallet", label: "Mobile Wallet", icon: Smartphone, enabled: false, note: "Cash arrives in 3 working days." },
  { key: "bank-account", label: "Bank Account", icon: Building2, enabled: false, note: "Cash arrives in 3 working days." },
];

export function SellGoldPanel() {
  const router = useRouter();
  const { data: rate } = useGoldRate();
  const { data: wallet } = useWallet();
  const sell = useSellGold();

  const form = useForm<{ value: number }>({ defaultValues: { value: 0.5 } });
  const [metal, setMetal] = useState(METALS[0].key);
  const [payoutMethod, setPayoutMethod] = useState(PAYOUT_METHODS[0].key);

  const pricePerGram = rate ? Number(rate.pricePerGramBDT) : null;
  const available = wallet ? Number(wallet.goldBalanceGrams) : 0;
  const sliderMax = available > 0 ? available : 1;
  const grams = form.watch("value") || 0;
  const payout = pricePerGram ? computeSellPayout(grams, pricePerGram) : null;

  const exceedsBalance = grams > available;
  const activePayout = PAYOUT_METHODS.find((m) => m.key === payoutMethod);

  function selectMetal(key: string, enabled: boolean) {
    if (!enabled) {
      toast.info("Coming soon — only Gold can be sold right now.");
      return;
    }
    setMetal(key);
  }

  function selectPayoutMethod(key: string, enabled: boolean) {
    if (!enabled) {
      toast.info("Coming soon — payouts go to your Gold.bd Wallet for now.");
      return;
    }
    setPayoutMethod(key);
  }

  async function onSubmit(values: { value: number }) {
    const parsed = sellGoldSchema.shape.goldGrams.safeParse(values.value);
    if (!parsed.success) {
      form.setError("value", { message: parsed.error.issues[0]?.message ?? "Enter a valid weight" });
      return;
    }
    if (values.value > available) {
      form.setError("value", { message: `You only hold ${available} g` });
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
                  key={m.key}
                  type="button"
                  variant="outline"
                  aria-pressed={metal === m.key}
                  aria-disabled={!m.enabled}
                  onClick={() => selectMetal(m.key, m.enabled)}
                  className={cn(metal === m.key && SELECTED_GOLD, !m.enabled && "opacity-60")}
                >
                  {m.label}
                  {!m.enabled && (
                    <Badge variant="secondary" className="text-[9px]">
                      Soon
                    </Badge>
                  )}
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
                  of {available.toFixed(3)}g available · {metal === "gold" ? "Gold" : "Silver"}
                </p>
              )}

              <Slider
                value={Math.min(grams, sliderMax)}
                min={0}
                max={sliderMax}
                step={0.01}
                disabled={available <= 0}
                onValueChange={(v) => form.setValue("value", Number(v.toFixed(3)), { shouldValidate: true })}
              />
            </div>

            {/* Payout method */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Receive payout via</Label>
              <div className="grid grid-cols-2 gap-2">
                {PAYOUT_METHODS.slice(0, 2).map((m) => (
                  <PayoutButton key={m.key} method={m} selected={payoutMethod === m.key} onSelect={selectPayoutMethod} />
                ))}
                <PayoutButton
                  method={PAYOUT_METHODS[2]}
                  selected={payoutMethod === PAYOUT_METHODS[2].key}
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
                disabled={form.formState.isSubmitting || !pricePerGram || grams <= 0 || exceedsBalance}
              >
                <ArrowDownRight />
                {form.formState.isSubmitting ? "Processing…" : payout ? `Sell gold · ${formatBDT(payout.netPayoutBDT)}` : "Sell gold"}
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
          <SummaryRow label="Sell price (Gold)" value={pricePerGram ? `${formatBDT(pricePerGram)}/g` : "—"} />
          <SummaryRow label="Weight" value={`${grams.toFixed(3)} g`} />
          <SummaryRow label="Spread (2%)" value={payout ? `-${formatBDT(payout.spreadBDT)}` : "—"} />
          <Separator />
          <div className="flex items-center justify-between text-base font-semibold">
            <span>You get</span>
            <span className="tabular-nums">{payout ? formatBDT(payout.netPayoutBDT) : "—"}</span>
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
        "h-auto justify-center gap-2 rounded-lg py-2.5 font-medium whitespace-normal",
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
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}
