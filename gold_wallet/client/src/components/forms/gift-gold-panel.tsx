"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { normalizeBdPhone } from "@/lib/format";
import { useGoldRate } from "@/hooks/use-gold-rate";
import { formatBDT } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { SELECTED_GOLD } from "@/components/shared/payment-method-button";
import { AnniversaryIcon, BirthdayIcon, EidIcon, WeddingIcon } from "@/components/forms/occasion-icons";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/use-translation";

const OCCASIONS = [
  { key: "eid", labelKey: "giftGoldPanel.occasions.eid.label", quoteKey: "giftGoldPanel.occasions.eid.quote", icon: EidIcon },
  {
    key: "wedding",
    labelKey: "giftGoldPanel.occasions.wedding.label",
    quoteKey: "giftGoldPanel.occasions.wedding.quote",
    icon: WeddingIcon,
  },
  {
    key: "birthday",
    labelKey: "giftGoldPanel.occasions.birthday.label",
    quoteKey: "giftGoldPanel.occasions.birthday.quote",
    icon: BirthdayIcon,
  },
  {
    key: "anniversary",
    labelKey: "giftGoldPanel.occasions.anniversary.label",
    quoteKey: "giftGoldPanel.occasions.anniversary.quote",
    icon: AnniversaryIcon,
  },
] as const;

const AMOUNT_PRESETS = [1000, 2000, 5000, 10000];

export function GiftGoldPanel() {
  const { t } = useTranslation();
  const { data: rate } = useGoldRate();
  const [occasionKey, setOccasionKey] = useState<(typeof OCCASIONS)[number]["key"]>("eid");
  const [amount, setAmount] = useState(2000);
  const [customPhoto, setCustomPhoto] = useState(false);
  const form = useForm<{ recipientPhone: string; message: string }>({
    defaultValues: { recipientPhone: "", message: "" },
  });

  const pricePerGram = rate ? Number(rate.pricePerGramBDT) : null;
  const grams = pricePerGram ? amount / pricePerGram : null;
  const occasion = OCCASIONS.find((o) => o.key === occasionKey)!;

  async function onSubmit(values: { recipientPhone: string; message: string }) {
    const phone = normalizeBdPhone(values.recipientPhone);
    if (!phone) {
      form.setError("recipientPhone", { message: t("giftGoldPanel.invalidPhone") });
      return;
    }
    // No /api/gold/gift endpoint in this repo (see CLAUDE.md) — recorded
    // locally only, same "no fulfillment backend" pattern as checkout.
    await new Promise((r) => setTimeout(r, 400));
    toast.success(t("giftGoldPanel.giftSent", { phone }));
    form.reset({ recipientPhone: "", message: "" });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 lg:grid-cols-[1fr_340px] lg:items-start">
      <Card>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t("giftGoldPanel.occasion")}
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {OCCASIONS.map((o) => {
                const Icon = o.icon;
                return (
                  <Button
                    key={o.key}
                    type="button"
                    variant="outline"
                    aria-pressed={occasionKey === o.key}
                    className={cn(
                      "h-auto aspect-square flex-col items-center justify-center gap-1 rounded-md bg-gold/5 p-1.5",
                      occasionKey === o.key && "border-gold ring-2 ring-gold bg-gold/10"
                    )}
                    onClick={() => setOccasionKey(o.key)}
                  >
                    <Icon className="size-14 sm:size-20 lg:size-24" />
                    <span className="text-center text-[10px] leading-tight font-semibold sm:text-xs">{t(o.labelKey)}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gift-recipient" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t("giftGoldPanel.recipient")}
            </Label>
            <Input
              id="gift-recipient"
              placeholder={t("giftGoldPanel.recipientPlaceholder")}
              {...form.register("recipientPhone")}
            />
            {form.formState.errors.recipientPhone && (
              <p className="text-sm text-destructive">{form.formState.errors.recipientPhone.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t("giftGoldPanel.giftAmount")}
            </Label>
            <div className="flex flex-wrap gap-2">
              {AMOUNT_PRESETS.map((preset) => (
                <Button key={preset} type="button" variant="outline" className={cn(amount === preset && SELECTED_GOLD)} onClick={() => setAmount(preset)}>
                  {preset.toLocaleString("en-BD")}
                </Button>
              ))}
            </div>
          </div>

          <Textarea placeholder={t("giftGoldPanel.messagePlaceholder")} rows={3} {...form.register("message")} />

          <div className="flex items-center justify-between gap-4 rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">{t("giftGoldPanel.customPhoto.title")}</p>
              <p className="text-xs text-muted-foreground">{t("giftGoldPanel.customPhoto.description")}</p>
            </div>
            <Switch checked={customPhoto} onCheckedChange={setCustomPhoto} />
          </div>

          <Button type="submit" variant="gold-solid" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting
              ? t("giftGoldPanel.sending")
              : t("giftGoldPanel.sendGift", { amount: formatBDT(amount) })}
          </Button>
        </CardContent>
      </Card>

      <Card className="lg:sticky lg:top-6">
        <CardContent className="space-y-2">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t(occasion.labelKey)}</p>
          <p className="font-serif text-xl italic">{t(occasion.quoteKey)}</p>
          <p className="pt-2 text-sm text-muted-foreground">
            {t("giftGoldPanel.previewDescription", {
              amount: formatBDT(amount),
              grams: grams !== null ? `≈ ${grams.toFixed(4)} g` : "",
            })}
          </p>
        </CardContent>
      </Card>
    </form>
  );
}
