"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { depositSchema, withdrawSchema, type DepositInput } from "@/lib/validations/wallet";
import { ApiError } from "@/lib/api-client";
import { walletAuthApi } from "@/lib/wallet-auth-api";
import { walletPaymentsApi } from "@/lib/wallet-payments-api";
import { getAccessToken } from "@/lib/session";
import { useWithdraw, useWallet } from "@/hooks/use-wallet";
import { formatBDT } from "@/lib/format";
import { MOCK_WALLET } from "@/lib/mock-wallet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaymentMethodButton, SELECTED_GOLD } from "@/components/shared/payment-method-button";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/use-translation";

const AMOUNT_PRESETS = [500, 1000, 2000, 5000, 10000];

type Direction = "deposit" | "withdraw";

function MoneyMoveForm({ direction }: { direction: Direction }) {
  const { t } = useTranslation();
  // Which channel the shopper picks here is only a hint — SSLCommerz's own
  // hosted page (the actual next screen for a deposit) has its own bKash/Nagad/
  // card/bank picker, so this selection doesn't get sent anywhere. All four
  // stay enabled since SSLCommerz's sandbox supports each of them.
  const PAYMENT_METHODS: { key: string; label: string; enabled: boolean }[] = [
    { key: "bkash", label: "bKash", enabled: true },
    { key: "nagad", label: "Nagad", enabled: true },
    { key: "bank", label: t("addMoneyPanel.methods.bankTransfer"), enabled: true },
    { key: "card", label: t("addMoneyPanel.methods.card"), enabled: true },
  ];
  const withdraw = useWithdraw();
  const [method, setMethod] = useState(PAYMENT_METHODS[0].key);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const form = useForm<DepositInput>({
    resolver: zodResolver(direction === "deposit" ? depositSchema : withdrawSchema),
    defaultValues: { amountBDT: AMOUNT_PRESETS[1] },
  });

  const amountBDT = form.watch("amountBDT") || 0;
  const isBusy = direction === "withdraw" ? withdraw.isPending : isRedirecting;

  function selectMethod(key: string, enabled: boolean) {
    if (!enabled) return;
    setMethod(key);
  }

  /** Withdrawal still just debits the wallet directly (see CLAUDE.md — no
   * payout module exists yet). Adding money is real: it starts an SSLCommerz
   * sandbox session via wallet_server's payments module and sends the
   * browser to the hosted checkout page, the same gateway gold_commerce's
   * checkout uses. */
  async function onSubmit(values: DepositInput) {
    if (direction === "withdraw") {
      try {
        await withdraw.mutateAsync(values.amountBDT);
        toast.success(t("addMoneyPanel.withdrawalSuccess"));
        form.reset({ amountBDT: AMOUNT_PRESETS[1] });
      } catch (error) {
        toast.error(error instanceof ApiError ? error.message : t("addMoneyPanel.withdrawalFailed"));
      }
      return;
    }

    const accessToken = getAccessToken();
    if (!accessToken) {
      toast.error(t("addMoneyPanel.signInToAddMoney"));
      return;
    }

    try {
      setIsRedirecting(true);
      const me = await walletAuthApi.me(accessToken);
      const { gatewayUrl } = await walletPaymentsApi.initDeposit(
        {
          amount: values.amountBDT,
          customer: {
            name: me.fullName,
            email: me.email || `${me.phone.replace(/\D/g, "")}@customer.gold.bd`,
            phone: me.phone,
          },
          returnBaseUrl: `${window.location.origin}/wallet/payment`,
        },
        accessToken
      );
      window.location.href = gatewayUrl;
    } catch (error) {
      setIsRedirecting(false);
      toast.error(error instanceof ApiError ? error.message : t("addMoneyPanel.couldNotStartPayment"));
    }
  }

  return (
    <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      {/* Big value entry */}
      <FormField
        control={form.control}
        name="amountBDT"
        render={({ field }) => (
          <FormItem className="gap-1 text-center">
            <Label className="block text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {direction === "deposit" ? t("addMoneyPanel.addMoney") : t("addMoneyPanel.withdrawMoney")}
            </Label>
            <div className="flex items-center justify-center gap-1.5">
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  {...field}
                  onChange={(e) => field.onChange(Number.isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber)}
                  className="h-auto w-40 border-none bg-transparent text-center text-4xl font-semibold shadow-none focus-visible:ring-0"
                />
              </FormControl>
              <span className="text-xl font-medium text-muted-foreground">BDT</span>
            </div>
            <FormMessage className="text-sm" />
          </FormItem>
        )}
      />

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
        <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {t("addMoneyPanel.paymentMethod")}
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {PAYMENT_METHODS.map((m) => (
            <PaymentMethodButton key={m.key} method={m} selected={method === m.key} onSelect={selectMethod} />
          ))}
        </div>
      </div>

      <div className="space-y-2 text-center">
        <Button type="submit" variant="gold-solid" className="w-full" disabled={isBusy || amountBDT <= 0}>
          {direction === "deposit" ? <ArrowDownToLine /> : <ArrowUpFromLine />}
          {isBusy
            ? direction === "deposit"
              ? t("addMoneyPanel.redirecting")
              : t("addMoneyPanel.processing")
            : direction === "deposit"
              ? t("addMoneyPanel.addAmount", { amount: formatBDT(amountBDT || 0) })
              : t("addMoneyPanel.withdrawAmount", { amount: formatBDT(amountBDT || 0) })}
        </Button>
        <p className="text-xs text-muted-foreground">
          {direction === "deposit" ? t("addMoneyPanel.depositNote") : t("addMoneyPanel.withdrawNote")}
        </p>
      </div>
    </form>
    </Form>
  );
}

/** Add-money / withdraw tabs without a card around them — the wallet page
 * drops these straight into its "Manage balance" dialog, while AddMoneyPanel
 * below wraps the same thing in a Card for use inline on a page. */
export function MoneyMoveTabs({ defaultDirection = "deposit" }: { defaultDirection?: Direction }) {
  const { t } = useTranslation();
  const { data } = useWallet();
  const wallet = data ?? MOCK_WALLET;

  return (
    <Tabs defaultValue={defaultDirection}>
      <TabsList className="w-full">
        <TabsTrigger value="deposit" className="flex-1">
          {t("addMoneyPanel.addTab")}
        </TabsTrigger>
        <TabsTrigger value="withdraw" className="flex-1">
          {t("addMoneyPanel.withdrawTab")}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="deposit" className="pt-5">
        <MoneyMoveForm direction="deposit" />
      </TabsContent>
      <TabsContent value="withdraw" className="pt-5">
        <p className="mb-3 text-center text-xs text-muted-foreground">
          {t("addMoneyPanel.available", { amount: formatBDT(wallet.cashBalanceBDT) })}
        </p>
        <MoneyMoveForm direction="withdraw" />
      </TabsContent>
    </Tabs>
  );
}

export function AddMoneyPanel({ defaultDirection = "deposit" }: { defaultDirection?: Direction }) {
  return (
    <Card>
      <CardContent>
        <MoneyMoveTabs defaultDirection={defaultDirection} />
      </CardContent>
    </Card>
  );
}
