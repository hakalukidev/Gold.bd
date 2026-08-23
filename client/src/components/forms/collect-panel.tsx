"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { collectSchema, COLLECT_WEIGHTS_G, type CollectForm, type CollectInput, type CollectMethod } from "@/lib/validations/collect";
import { useWallet } from "@/hooks/use-wallet";
import { formatBDT } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { SELECTED_GOLD } from "@/components/shared/payment-method-button";
import { cn } from "@/lib/utils";

const DELIVERY_FEE_BDT = 150;
const FREE_ABOVE_G = 2;

export function CollectPanel() {
  const { data: wallet } = useWallet();
  const available = wallet ? Number(wallet.goldBalanceGrams) : 0;

  const form = useForm<CollectInput>({
    resolver: zodResolver(collectSchema),
    defaultValues: {
      weightGrams: 1,
      form: "coin",
      method: "home",
      fullName: "",
      phone: "",
      district: "",
      postalCode: "",
      streetAddress: "",
    },
  });

  const weightGrams = form.watch("weightGrams");
  const selectedForm = form.watch("form") as CollectForm;
  const method = form.watch("method") as CollectMethod;
  const exceedsBalance = weightGrams > available;
  const deliveryFee = weightGrams >= FREE_ABOVE_G ? 0 : DELIVERY_FEE_BDT;

  async function onSubmit(values: CollectInput) {
    if (values.weightGrams > available) {
      form.setError("weightGrams", { message: `You only hold ${available.toFixed(3)} g` });
      return;
    }
    // No /api/gold/collect endpoint in this repo (see CLAUDE.md) — same
    // "record the request, no real fulfillment backend" pattern as the
    // marketing site's checkout flow.
    await new Promise((r) => setTimeout(r, 400));
    toast.success("Delivery request received — we'll email your tracking details");
    form.reset({ weightGrams: 1, form: "coin", method: "home", fullName: "", phone: "", district: "", postalCode: "", streetAddress: "" });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 lg:grid-cols-[1fr_340px] lg:items-start">
        <Card>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Weight to collect</Label>
              <div className="flex flex-wrap gap-2">
                {COLLECT_WEIGHTS_G.map((w) => (
                  <Button
                    key={w}
                    type="button"
                    variant="outline"
                    className={cn(weightGrams === w && SELECTED_GOLD)}
                    onClick={() => form.setValue("weightGrams", w, { shouldValidate: true })}
                  >
                    {w}g
                  </Button>
                ))}
              </div>
              {exceedsBalance && <p className="text-sm text-destructive">You only hold {available.toFixed(3)} g.</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Form</Label>
              <div className="flex gap-2">
                {(["bar", "coin"] as const).map((f) => (
                  <Button
                    key={f}
                    type="button"
                    variant="outline"
                    className={cn("capitalize", selectedForm === f && SELECTED_GOLD)}
                    onClick={() => form.setValue("form", f)}
                  >
                    {f}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Withdrawal method</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className={cn("h-auto py-2.5 whitespace-normal", method === "home" && SELECTED_GOLD)}
                  onClick={() => form.setValue("method", "home")}
                >
                  Home Delivery
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={cn("h-auto py-2.5 whitespace-normal", method === "pickup" && SELECTED_GOLD)}
                  onClick={() => form.setValue("method", "pickup")}
                >
                  Steadfast Pickup Point
                </Button>
              </div>
            </div>

            {method === "home" && (
              <div className="space-y-3">
                <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Delivery address</Label>
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="district"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="District" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Postal code" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="streetAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea rows={2} placeholder="Street address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <Button type="submit" variant="gold-solid" className="w-full" disabled={form.formState.isSubmitting || exceedsBalance}>
              {form.formState.isSubmitting ? "Submitting…" : "Confirm insured delivery"}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:sticky lg:top-6">
          <CardHeader>
            <CardTitle>Withdrawal details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Fully insured, tracked delivery anywhere in Bangladesh. Hallmarked bars and coins arrive tamper-sealed with a certificate of
              authenticity.
            </p>
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Estimated arrival</span>
              <span className="font-medium">5-7 days</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Delivery fee</span>
              <span className="font-medium">{deliveryFee === 0 ? `Free above ${FREE_ABOVE_G}g` : formatBDT(deliveryFee)}</span>
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}

