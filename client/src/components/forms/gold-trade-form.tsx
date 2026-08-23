"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ArrowDownRight, ArrowUpRight, Gem, TrendingUp } from "lucide-react";
import { buyGoldSchema, sellGoldSchema, type BuyGoldInput } from "@/lib/validations/gold";
import { ApiError } from "@/lib/api-client";
import { useBuyGold, useSellGold } from "@/hooks/use-gold-trade";
import { useGoldRate } from "@/hooks/use-gold-rate";
import { useWallet } from "@/hooks/use-wallet";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { IconInput } from "@/components/shared/icon-input";
import { formatBDT } from "@/lib/format";
import { PRODUCT_WEIGHTS } from "@/lib/products";
import { cn } from "@/lib/utils";

export function GoldTradeForm({ side }: { side: "BUY" | "SELL" }) {
  const router = useRouter();
  const { data: rate } = useGoldRate();
  const { data: wallet } = useWallet();
  const buy = useBuyGold();
  const sell = useSellGold();
  const mutation = side === "BUY" ? buy : sell;

  const form = useForm<BuyGoldInput>({
    resolver: zodResolver(side === "BUY" ? buyGoldSchema : sellGoldSchema),
    defaultValues: { goldGrams: 0 },
  });

  const grams = form.watch("goldGrams");
  const estimate = rate && grams ? Number(rate.pricePerGramBDT) * Number(grams) : 0;

  async function onSubmit(values: BuyGoldInput) {
    try {
      await mutation.mutateAsync(values.goldGrams);
      toast.success(`${side === "BUY" ? "Purchase" : "Sale"} completed`);
      form.reset({ goldGrams: 0 });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Transaction failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-gold/20 bg-gold/5 px-3 py-2 text-sm">
        <span className="flex items-center gap-1.5 font-medium text-gold">
          <TrendingUp className="size-4" strokeWidth={1.75} />
          Live rate
        </span>
        <span className="font-semibold">{rate ? `${formatBDT(rate.pricePerGramBDT)} / g` : "Loading…"}</span>
      </div>

      {side === "BUY" && (
        <div>
          <p className="mb-2 text-sm font-medium">Categories</p>
          <div className="grid grid-cols-4 gap-2">
            {PRODUCT_WEIGHTS.map((weight) => {
              const cost = rate ? Number(rate.pricePerGramBDT) * weight.grams : null;
              const isSelected = grams === weight.grams;
              return (
                <button
                  key={weight.key}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => form.setValue("goldGrams", weight.grams, { shouldValidate: true })}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-center transition-colors",
                    isSelected ? "border-gold bg-gold/10" : "border-border hover:border-gold/40"
                  )}
                >
                  <Gem className={cn("size-4", isSelected ? "text-gold" : "text-muted-foreground")} strokeWidth={1.75} />
                  <span className="text-xs font-semibold">{weight.grams} g</span>
                  <span className="text-[11px] text-muted-foreground tabular-nums">{cost !== null ? formatBDT(cost) : "—"}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="goldGrams"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Grams of gold</FormLabel>
                <FormControl>
                  <IconInput
                    icon={Gem}
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="1.000"
                    {...field}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  />
                </FormControl>
                {side === "SELL" && wallet ? (
                  <FormDescription>You hold {wallet.goldBalanceGrams} g</FormDescription>
                ) : null}
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2.5 text-sm">
            <span className="text-muted-foreground">Estimated {side === "BUY" ? "cost" : "proceeds"}</span>
            <span className="font-semibold">{formatBDT(estimate || 0)}</span>
          </div>

          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {side === "BUY" ? <ArrowUpRight /> : <ArrowDownRight />}
            {form.formState.isSubmitting ? "Processing…" : side === "BUY" ? "Buy gold" : "Sell gold"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
