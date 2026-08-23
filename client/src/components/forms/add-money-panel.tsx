"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { depositSchema, withdrawSchema, type DepositInput } from "@/lib/validations/wallet";
import { ApiError } from "@/lib/api-client";
import { useDeposit, useWithdraw, useWallet } from "@/hooks/use-wallet";
import { formatBDT } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaymentMethodButton, SELECTED_GOLD } from "@/components/shared/payment-method-button";
import { cn } from "@/lib/utils";

const AMOUNT_PRESETS = [500, 1000, 2000, 5000, 10000];

// There's no live payment-gateway integration in this repo (see CLAUDE.md) —
// /api/wallet/deposit and /withdraw just move amountBDT directly, with no
// method field. So unlike buy-gold's "wallet balance" vs. "Soon" split,
// none of these is more real than another; all four stay selectable and the
// helper line under the button says so instead of arbitrarily flagging some
// "Soon" when none of them are actually wired to a gateway yet.
const PAYMENT_METHODS: { key: string; label: string; enabled: boolean }[] = [
  { key: "bkash", label: "bKash", enabled: true },
  { key: "nagad", label: "Nagad", enabled: true },
  { key: "bank", label: "Bank Transfer", enabled: true },
  { key: "card", label: "Card", enabled: true },
];

type Direction = "deposit" | "withdraw";

function MoneyMoveForm({ direction }: { direction: Direction }) {
  const deposit = useDeposit();
  const withdraw = useWithdraw();
  const mutation = direction === "deposit" ? deposit : withdraw;
  const [method, setMethod] = useState(PAYMENT_METHODS[0].key);

  const form = useForm<DepositInput>({
    resolver: zodResolver(direction === "deposit" ? depositSchema : withdrawSchema),
    defaultValues: { amountBDT: AMOUNT_PRESETS[1] },
  });

  const amountBDT = form.watch("amountBDT") || 0;

  function selectMethod(key: string, enabled: boolean) {
    if (!enabled) return;
    setMethod(key);
  }

  async function onSubmit(values: DepositInput) {
    try {
      await mutation.mutateAsync(values.amountBDT);
      toast.success(direction === "deposit" ? "Deposit successful" : "Withdrawal successful");
      form.reset({ amountBDT: AMOUNT_PRESETS[1] });
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : direction === "deposit" ? "Deposit failed" : "Withdrawal failed");
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      {/* Big value entry */}
      <div className="space-y-1 text-center">
        <Label className="block text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {direction === "deposit" ? "Add money" : "Withdraw money"}
        </Label>
        <div className="flex items-center justify-center gap-1.5">
          <Input
            type="number"
            min="0"
            step="1"
            {...form.register("amountBDT", { valueAsNumber: true })}
            className="h-auto w-40 border-none bg-transparent text-center text-4xl font-semibold shadow-none focus-visible:ring-0"
          />
          <span className="text-xl font-medium text-muted-foreground">BDT</span>
        </div>
        {form.formState.errors.amountBDT && <p className="text-sm text-destructive">{form.formState.errors.amountBDT.message}</p>}
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {AMOUNT_PRESETS.map((preset) => (
          <Button
            key={preset}
            type="button"
            variant="outline"
            size="sm"
            className={cn(amountBDT === preset && SELECTED_GOLD)}
            onClick={() => form.setValue("amountBDT", preset, { shouldValidate: true })}
          >
            {preset.toLocaleString("en-BD")}
          </Button>
        ))}
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Payment method</Label>
        <div className="grid grid-cols-2 gap-2">
          {PAYMENT_METHODS.map((m) => (
            <PaymentMethodButton key={m.key} method={m} selected={method === m.key} onSelect={selectMethod} />
          ))}
        </div>
      </div>

      <div className="space-y-2 text-center">
        <Button type="submit" variant="gold-solid" className="w-full" disabled={form.formState.isSubmitting || amountBDT <= 0}>
          {direction === "deposit" ? <ArrowDownToLine /> : <ArrowUpFromLine />}
          {form.formState.isSubmitting
            ? "Processing…"
            : `${direction === "deposit" ? "Add" : "Withdraw"} ${formatBDT(amountBDT || 0)}`}
        </Button>
        <p className="text-xs text-muted-foreground">
          Demo flow — no live payment gateway yet, this {direction === "deposit" ? "credits" : "debits"} your wallet directly.
        </p>
      </div>
    </form>
  );
}

export function AddMoneyPanel() {
  const { data: wallet } = useWallet();

  return (
    <Card>
      <CardContent>
        <Tabs defaultValue="deposit">
          <TabsList className="w-full">
            <TabsTrigger value="deposit" className="flex-1">
              Add money
            </TabsTrigger>
            <TabsTrigger value="withdraw" className="flex-1">
              Withdraw
            </TabsTrigger>
          </TabsList>
          <TabsContent value="deposit" className="pt-5">
            <MoneyMoveForm direction="deposit" />
          </TabsContent>
          <TabsContent value="withdraw" className="pt-5">
            {wallet && (
              <p className="mb-3 text-center text-xs text-muted-foreground">Available: {formatBDT(wallet.cashBalanceBDT)}</p>
            )}
            <MoneyMoveForm direction="withdraw" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
