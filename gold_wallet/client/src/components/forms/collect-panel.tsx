"use client";

import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { MapPin, Truck } from "lucide-react";
import { collectSchema, COLLECT_WEIGHTS_G, type CollectForm, type CollectInput, type CollectMethod } from "@/lib/validations/collect";
import { useWallet } from "@/hooks/use-wallet";
import { formatBDT } from "@/lib/format";
import { PRODUCT_IMAGES } from "@/lib/products";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { SELECTED_GOLD } from "@/components/shared/payment-method-button";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/use-translation";

const DELIVERY_FEE_BDT = 150;
const FREE_ABOVE_G = 2;
const FORM_LABEL_KEY: Record<"bar" | "coin", string> = {
  bar: "collectPanel.formOptions.bar",
  coin: "collectPanel.formOptions.coin",
};

export function CollectPanel() {
  const { t } = useTranslation();
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
      form.setError("weightGrams", { message: t("collectPanel.onlyHold", { amount: available.toFixed(3) }) });
      return;
    }
    // No /api/gold/collect endpoint in this repo (see CLAUDE.md) — same
    // "record the request, no real fulfillment backend" pattern as the
    // marketing site's checkout flow.
    await new Promise((r) => setTimeout(r, 400));
    toast.success(t("collectPanel.requestReceived"));
    form.reset({ weightGrams: 1, form: "coin", method: "home", fullName: "", phone: "", district: "", postalCode: "", streetAddress: "" });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 lg:grid-cols-[1fr_340px] lg:items-start">
        <Card>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {t("collectPanel.weightToCollect")}
              </Label>
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
              {exceedsBalance && (
                <p className="text-sm text-destructive">{t("collectPanel.onlyHold", { amount: available.toFixed(3) })}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {t("collectPanel.form")}
              </Label>
              <div className="flex gap-2">
                {(["bar", "coin"] as const).map((f) => (
                  <Button
                    key={f}
                    type="button"
                    variant="outline"
                    className={cn("h-auto gap-1.5 py-1.5 capitalize", selectedForm === f && SELECTED_GOLD)}
                    onClick={() => form.setValue("form", f)}
                  >
                    <Image src={PRODUCT_IMAGES.gold[f]} alt="" width={20} height={20} className="size-5 object-contain" />
                    {t(FORM_LABEL_KEY[f])}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {t("collectPanel.withdrawalMethod")}
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className={cn("h-auto gap-1.5 py-2.5 whitespace-normal", method === "home" && SELECTED_GOLD)}
                  onClick={() => form.setValue("method", "home")}
                >
                  <Truck className="size-4" strokeWidth={1.75} />
                  {t("collectPanel.homeDelivery")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={cn("h-auto gap-1.5 py-2.5 whitespace-normal", method === "pickup" && SELECTED_GOLD)}
                  onClick={() => form.setValue("method", "pickup")}
                >
                  <MapPin className="size-4" strokeWidth={1.75} />
                  {t("collectPanel.pickupPoint")}
                </Button>
              </div>
            </div>

            {method === "home" && (
              <div className="space-y-3">
                <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {t("collectPanel.deliveryAddress")}
                </Label>
                <FormField
                  control={form.control}
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
                  control={form.control}
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
                    control={form.control}
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
                    control={form.control}
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
                  control={form.control}
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
              </div>
            )}

            <Button type="submit" variant="gold-solid" className="w-full" disabled={form.formState.isSubmitting || exceedsBalance}>
              {form.formState.isSubmitting ? t("collectPanel.submitting") : t("collectPanel.confirmDelivery")}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:sticky lg:top-6">
          <CardHeader>
            <CardTitle>{t("collectPanel.withdrawalDetails")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("collectPanel.insuredDescription")}</p>
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("collectPanel.estimatedArrival")}</span>
              <span className="font-medium">{t("collectPanel.estimatedArrivalValue")}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("collectPanel.deliveryFee")}</span>
              <span className="font-medium">
                {deliveryFee === 0 ? t("collectPanel.freeAbove", { grams: FREE_ABOVE_G }) : formatBDT(deliveryFee)}
              </span>
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}

