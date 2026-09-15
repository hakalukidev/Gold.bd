"use client";

import { useState } from "react";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Hash, Landmark, Loader2, MapPin, Phone, Save, User } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { IconInput } from "@/components/shared/icon-input";
import { PageHeader } from "@/components/shared/page-header";
import { cn } from "@/lib/utils";
import type { BankDetails, BkashNagadDetails, PaymentMethodSettings } from "@/types";

function StatusBadge({ configured }: { configured: boolean }) {
  return (
    <Badge variant={configured ? "default" : "outline"} className={cn("gap-1", !configured && "text-muted-foreground")}>
      {configured && <CheckCircle2 className="size-3" />}
      {configured ? "Active" : "Not set"}
    </Badge>
  );
}

function Field({
  label,
  icon,
  value,
  onChange,
}: {
  label: string;
  icon: React.ComponentProps<typeof IconInput>["icon"];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <IconInput icon={icon} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

// Mounted only once /api/admin/payment-methods has resolved (see the
// isLoading gate below), so the useState initializer below already captures
// the loaded value — no effect needed to sync it in after the fact.
function BkashNagadCard({
  method,
  label,
  logo,
  details,
}: {
  method: "bkash" | "nagad";
  label: string;
  logo: string;
  details: Partial<BkashNagadDetails>;
}) {
  const queryClient = useQueryClient();
  const [receiverNumber, setReceiverNumber] = useState(details.receiverNumber ?? "");

  const save = useMutation({
    mutationFn: () => api.post<PaymentMethodSettings>("/api/admin/payment-methods", { method, details: { receiverNumber } }),
    onSuccess: () => {
      toast.success(`${label} number saved`);
      queryClient.invalidateQueries({ queryKey: ["admin-payment-methods"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : `Could not save the ${label} number`),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
            <Image src={logo} alt={label} width={28} height={28} className="h-5 w-auto" />
          </span>
          <div>
            <CardTitle>{label}</CardTitle>
            <CardDescription>The number shown to shoppers to send payment to.</CardDescription>
          </div>
        </div>
        <CardAction>
          <StatusBadge configured={Boolean(details.receiverNumber?.trim())} />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Field label={`${label} receiving number`} icon={Phone} value={receiverNumber} onChange={setReceiverNumber} />
        <Button size="sm" className="w-fit gap-1.5" disabled={save.isPending || !receiverNumber.trim()} onClick={() => save.mutate()}>
          {save.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          Save
        </Button>
      </CardContent>
    </Card>
  );
}

function BankCard({ details }: { details: Partial<BankDetails> }) {
  const queryClient = useQueryClient();
  const toForm = (d: Partial<BankDetails>): BankDetails => ({
    bankName: d.bankName ?? "",
    accountName: d.accountName ?? "",
    accountNumber: d.accountNumber ?? "",
    branch: d.branch ?? "",
  });
  const [form, setForm] = useState<BankDetails>(toForm(details));

  const save = useMutation({
    mutationFn: () => api.post<PaymentMethodSettings>("/api/admin/payment-methods", { method: "bank", details: form }),
    onSuccess: () => {
      toast.success("Bank account details saved");
      queryClient.invalidateQueries({ queryKey: ["admin-payment-methods"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not save the bank details"),
  });

  const complete = form.bankName.trim() && form.accountName.trim() && form.accountNumber.trim() && form.branch.trim();
  const isConfigured = Boolean(details.bankName?.trim() && details.accountName?.trim() && details.accountNumber?.trim() && details.branch?.trim());

  return (
    <Card className="sm:col-span-2 lg:col-span-1">
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-gold/30 bg-gold/10 text-gold-accent">
            <Landmark className="size-4.5" strokeWidth={1.75} />
          </span>
          <div>
            <CardTitle>Bank transfer</CardTitle>
            <CardDescription>The receiving account shown to shoppers for bank transfers.</CardDescription>
          </div>
        </div>
        <CardAction>
          <StatusBadge configured={isConfigured} />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Bank name" icon={Landmark} value={form.bankName} onChange={(v) => setForm((f) => ({ ...f, bankName: v }))} />
          <Field label="Account holder's name" icon={User} value={form.accountName} onChange={(v) => setForm((f) => ({ ...f, accountName: v }))} />
          <Field label="Account number" icon={Hash} value={form.accountNumber} onChange={(v) => setForm((f) => ({ ...f, accountNumber: v }))} />
          <Field label="Branch" icon={MapPin} value={form.branch} onChange={(v) => setForm((f) => ({ ...f, branch: v }))} />
        </div>
        <Button size="sm" className="w-fit gap-1.5" disabled={save.isPending || !complete} onClick={() => save.mutate()}>
          {save.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          Save
        </Button>
      </CardContent>
    </Card>
  );
}

export default function AdminPaymentSettingsPage() {
  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin-payment-methods"],
    queryFn: () => api.get<PaymentMethodSettings>("/api/admin/payment-methods"),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Payment settings" description="Receiving accounts shown to shoppers in the checkout modals." />
      {isLoading || !settings ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="h-48 animate-pulse rounded-md bg-muted" />
          <div className="h-48 animate-pulse rounded-md bg-muted" />
          <div className="h-48 animate-pulse rounded-md bg-muted sm:col-span-2 lg:col-span-1" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <BkashNagadCard method="bkash" label="bKash" logo="/payment-logos/bkash.svg" details={settings.bkash} />
          <BkashNagadCard method="nagad" label="Nagad" logo="/payment-logos/nagad.svg" details={settings.nagad} />
          <BankCard details={settings.bank} />
        </div>
      )}
    </div>
  );
}
