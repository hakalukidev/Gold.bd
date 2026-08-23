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
import { cn } from "@/lib/utils";

const OCCASIONS = [
  { key: "eid", label: "Eid Mubarak", quote: "A gift of gold, made to last." },
  { key: "wedding", label: "Wedding", quote: "Wishing you a golden beginning." },
  { key: "birthday", label: "Birthday", quote: "Another year, a little more golden." },
  { key: "anniversary", label: "Anniversary", quote: "Cherishing gold, and each other." },
] as const;

const AMOUNT_PRESETS = [1000, 2000, 5000, 10000];

export function GiftGoldPanel() {
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
      form.setError("recipientPhone", { message: "Enter a valid Bangladeshi mobile number" });
      return;
    }
    // No /api/gold/gift endpoint in this repo (see CLAUDE.md) — recorded
    // locally only, same "no fulfillment backend" pattern as checkout.
    await new Promise((r) => setTimeout(r, 400));
    toast.success(`Gift sent to ${phone}`);
    form.reset({ recipientPhone: "", message: "" });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 lg:grid-cols-[1fr_340px] lg:items-start">
      <Card>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Occasion</Label>
            <div className="grid grid-cols-2 gap-2">
              {OCCASIONS.map((o) => (
                <Button
                  key={o.key}
                  type="button"
                  variant="outline"
                  className={cn("h-auto py-2.5 whitespace-normal", occasionKey === o.key && SELECTED_GOLD)}
                  onClick={() => setOccasionKey(o.key)}
                >
                  {o.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gift-recipient" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Recipient
            </Label>
            <Input id="gift-recipient" placeholder="Recipient phone number" {...form.register("recipientPhone")} />
            {form.formState.errors.recipientPhone && (
              <p className="text-sm text-destructive">{form.formState.errors.recipientPhone.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Gift amount</Label>
            <div className="flex flex-wrap gap-2">
              {AMOUNT_PRESETS.map((preset) => (
                <Button key={preset} type="button" variant="outline" className={cn(amount === preset && SELECTED_GOLD)} onClick={() => setAmount(preset)}>
                  {preset.toLocaleString("en-BD")}
                </Button>
              ))}
            </div>
          </div>

          <Textarea placeholder="Add a personal message…" rows={3} {...form.register("message")} />

          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Custom photo print on coin</p>
              <p className="text-xs text-muted-foreground">Engrave a portrait or photo onto a physical gold coin</p>
            </div>
            <Switch checked={customPhoto} onCheckedChange={setCustomPhoto} />
          </div>

          <Button type="submit" variant="gold-solid" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Sending…" : `Send gift · ${formatBDT(amount)}`}
          </Button>
        </CardContent>
      </Card>

      <Card className="lg:sticky lg:top-6">
        <CardContent className="space-y-2">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{occasion.label}</p>
          <p className="font-serif text-xl italic">{occasion.quote}</p>
          <p className="pt-2 text-sm text-muted-foreground">
            {formatBDT(amount)} {grams !== null ? `≈ ${grams.toFixed(4)} g` : ""} of 22K certified gold, delivered instantly to their Gold.bd
            vault.
          </p>
        </CardContent>
      </Card>
    </form>
  );
}
