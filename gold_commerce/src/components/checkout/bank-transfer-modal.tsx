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
import type { BankDetails, ManualPaymentInitResponse, PaymentMethodSettings } from "@/types";

const inputClass =
  "h-10 w-full rounded-md border border-black/15 bg-white px-3 text-sm text-neutral-900 outline-none focus:border-gold/60 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-ink dark:text-white";

const schema = z.object({
  bankAccountNumber: z.string().trim().min(4, "Enter the account number").max(40),
  bankAccountName: z.string().trim().min(2, "Enter the account holder's name").max(100),
  bankName: z.string().trim().min(2, "Enter the bank name").max(100),
  bankBranch: z.string().trim().min(2, "Enter the branch name").max(100),
});
type FormValues = z.infer<typeof schema>;

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  amount: number;
  customer: { name: string; email?: string; phone: string };
  metadata: Record<string, unknown>;
  onSuccess: (result: ManualPaymentInitResponse) => void;
}

export function BankTransferModal({ open, onOpenChange, orderId, amount, customer, metadata, onSuccess }: Props) {
  const t = useT().checkoutPage;
  const [submitting, setSubmitting] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);

  const { data: settings } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: () => api.get<PaymentMethodSettings>("/api/payment-methods"),
    enabled: open,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { bankAccountNumber: "", bankAccountName: "", bankName: "", bankBranch: "" },
  });

  const receivingAccount = settings?.bank as BankDetails | undefined;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setProofError(null);
    if (!file) {
      setProofFile(null);
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setProofError("Upload a JPEG, PNG, or WebP image");
      setProofFile(null);
      return;
    }
    if (file.size > MAX_BYTES) {
      setProofError("Image must be 5MB or smaller");
      setProofFile(null);
      return;
    }
    setProofFile(file);
  }

  async function onSubmit(values: FormValues) {
    if (!proofFile) {
      setProofError("Upload a photo of your payment proof");
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("method", "bank");
      formData.set("orderId", orderId);
      formData.set("amount", String(amount));
      formData.set("currency", "BDT");
      formData.set("name", customer.name);
      if (customer.email) formData.set("email", customer.email);
      formData.set("phone", customer.phone);
      formData.set("metadata", JSON.stringify(metadata));
      formData.set("bankAccountNumber", values.bankAccountNumber);
      formData.set("bankAccountName", values.bankAccountName);
      formData.set("bankName", values.bankName);
      formData.set("bankBranch", values.bankBranch);
      formData.set("proofImage", proofFile);

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
          <DialogTitle>{t.bankModalTitle}</DialogTitle>
          <DialogDescription>{t.bankModalDescription}</DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-gold/30 bg-gold/5 p-3 text-sm">
          <p className="text-neutral-600 dark:text-neutral-400">{t.manualPayToLabel}</p>
          {receivingAccount?.accountNumber ? (
            <div className="mt-1 grid gap-0.5">
              <span className="font-mono text-base font-bold text-gold">{receivingAccount.accountNumber}</span>
              <span className="text-xs text-neutral-600 dark:text-neutral-400">
                {receivingAccount.accountName} · {receivingAccount.bankName} · {receivingAccount.branch}
              </span>
            </div>
          ) : (
            <p className="mt-0.5 font-mono text-base font-bold text-gold">{settings ? "—" : "…"}</p>
          )}
          <p className="mt-1 text-xs text-neutral-500">{formatBDT(amount)}</p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex max-h-[55vh] flex-col gap-4 overflow-y-auto pr-1">
          <div>
            <label className="mb-1 block text-xs text-neutral-500 dark:text-neutral-400">{t.bankAccountNumberLabel}</label>
            <input className={inputClass} {...form.register("bankAccountNumber")} />
            {form.formState.errors.bankAccountNumber && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{form.formState.errors.bankAccountNumber.message}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-500 dark:text-neutral-400">{t.bankAccountNameLabel}</label>
            <input className={inputClass} {...form.register("bankAccountName")} />
            {form.formState.errors.bankAccountName && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{form.formState.errors.bankAccountName.message}</p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-neutral-500 dark:text-neutral-400">{t.bankNameLabel}</label>
              <input className={inputClass} {...form.register("bankName")} />
              {form.formState.errors.bankName && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{form.formState.errors.bankName.message}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500 dark:text-neutral-400">{t.bankBranchLabel}</label>
              <input className={inputClass} {...form.register("bankBranch")} />
              {form.formState.errors.bankBranch && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{form.formState.errors.bankBranch.message}</p>
              )}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-500 dark:text-neutral-400">{t.proofImageLabel}</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="block w-full text-xs text-neutral-600 file:mr-3 file:rounded-md file:border-0 file:bg-gold/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-gold hover:file:bg-gold/20 dark:text-neutral-400"
            />
            <p className="mt-1 text-[11px] text-neutral-500">{t.proofImageHint}</p>
            {proofError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{proofError}</p>}
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
