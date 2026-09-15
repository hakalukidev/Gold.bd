"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api-client";
import { useT } from "@/lib/i18n/use-t";
import { formatBDT } from "@/lib/format";
import type { ManualPaymentInitResponse, PaymentMethodSettings } from "@/types";

const inputClass =
  "h-10 w-full rounded-md border border-black/15 bg-white px-3 text-sm text-neutral-900 outline-none focus:border-gold/60 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-ink dark:text-white";

const bdPhone = z
  .string()
  .trim()
  .regex(/^(?:\+?88)?01[3-9]\d{8}$/, "Enter a valid Bangladeshi mobile number");

const schema = z.object({
  senderNumber: bdPhone,
  transactionId: z.string().trim().min(4, "Enter the transaction ID").max(50),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  method: "bkash" | "nagad";
  orderId: string;
  amount: number;
  customer: { name: string; email?: string; phone: string };
  metadata: Record<string, unknown>;
  onSuccess: (result: ManualPaymentInitResponse) => void;
}

export function BkashNagadModal({ open, onOpenChange, method, orderId, amount, customer, metadata, onSuccess }: Props) {
  const t = useT().checkoutPage;
  const [submitting, setSubmitting] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: () => api.get<PaymentMethodSettings>("/api/payment-methods"),
    enabled: open,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { senderNumber: "", transactionId: "" },
  });

  const receiverNumber = (settings?.[method] as { receiverNumber?: string } | undefined)?.receiverNumber;

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("method", method);
      formData.set("orderId", orderId);
      formData.set("amount", String(amount));
      formData.set("currency", "BDT");
      formData.set("name", customer.name);
      if (customer.email) formData.set("email", customer.email);
      formData.set("phone", customer.phone);
      formData.set("metadata", JSON.stringify(metadata));
      formData.set("senderNumber", values.senderNumber);
      formData.set("transactionId", values.transactionId);

      const result = await api.postForm<ManualPaymentInitResponse>("/api/manual-payments", formData);
      onSuccess(result);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not submit your payment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{method === "bkash" ? t.bkashModalTitle : t.nagadModalTitle}</DialogTitle>
          <DialogDescription>{method === "bkash" ? t.bkashModalDescription : t.nagadModalDescription}</DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-gold/30 bg-gold/5 p-3 text-sm">
          <p className="text-neutral-600 dark:text-neutral-400">{t.manualPayToLabel}</p>
          <p className="mt-0.5 font-mono text-base font-bold text-gold">{receiverNumber || (settings ? "—" : "…")}</p>
          <p className="mt-1 text-xs text-neutral-500">{formatBDT(amount)}</p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs text-neutral-500 dark:text-neutral-400">{t.senderNumberLabel}</label>
            <input className={inputClass} placeholder={t.senderNumberPlaceholder} {...form.register("senderNumber")} />
            {form.formState.errors.senderNumber && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{form.formState.errors.senderNumber.message}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-500 dark:text-neutral-400">{t.transactionIdLabel}</label>
            <input className={inputClass} placeholder={t.transactionIdPlaceholder} {...form.register("transactionId")} />
            {form.formState.errors.transactionId && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{form.formState.errors.transactionId.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              {t.manualPayModalCancel}
            </Button>
            <Button type="submit" variant="gold-solid" disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {submitting ? t.manualPaySubmitting : t.manualPaySubmit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
