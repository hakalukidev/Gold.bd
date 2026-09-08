"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldAlert, TriangleAlert } from "lucide-react";
import { useMe } from "@/hooks/use-auth";
import { useAdminSettings, useUpdateAdminSettings } from "@/hooks/use-admin-settings";
import { PageHeader } from "@/components/shared/page-header";
import { WalletBadge } from "@/components/shared/wallet-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/format";
import { ApiError } from "@/lib/api-client";
import { useTranslation } from "@/lib/i18n/use-translation";

/** Fee field is stored/sent as a 0-1 decimal but edited as a whole percent
 * (1.5, not 0.015) — friendlier for an admin typing a number. */
function RateField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (percent: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="relative w-40">
        <Input
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={value * 100}
          onChange={(e) => onChange(Number.isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber)}
          className="pr-8"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
          %
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function BdtField({ label, hint, value, onChange }: { label: string; hint: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="relative w-40">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
          ৳
        </span>
        <Input
          type="number"
          min="0"
          step="1"
          value={value}
          onChange={(e) => onChange(Number.isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber)}
          className="pl-7"
        />
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function FeeSettingsForm() {
  const { t } = useTranslation();
  const { data: settings, isLoading, isError } = useAdminSettings();
  const update = useUpdateAdminSettings();

  const [transactionChargeRate, setTransactionChargeRate] = useState(0);
  const [sellSpreadRate, setSellSpreadRate] = useState(0);
  const [govtGoldTaxPerBhoriBdt, setGovtGoldTaxPerBhoriBdt] = useState(0);

  // Sync from the fetched settings into editable local state — not a
  // controlled read, since the admin needs to be able to type over it.
  useEffect(() => {
    if (!settings) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing fetched data into editable form state, not a derived value
    setTransactionChargeRate(settings.transactionChargeRate);
    setSellSpreadRate(settings.sellSpreadRate);
    setGovtGoldTaxPerBhoriBdt(settings.govtGoldTaxPerBhoriBdt);
  }, [settings]);

  function handleSave() {
    update.mutate(
      { transactionChargeRate, sellSpreadRate, govtGoldTaxPerBhoriBdt },
      {
        onSuccess: () => toast.success(t("admin.saved")),
        onError: (error) => toast.error(error instanceof ApiError ? error.message : t("admin.saveFailed")),
      }
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="space-y-4">
          <Skeleton className="h-14 w-40" />
          <Skeleton className="h-14 w-40" />
          <Skeleton className="h-14 w-40" />
        </CardContent>
      </Card>
    );
  }

  // Never render editable fields (which would default to 0) without settings
  // actually having loaded — saving those zeros would clobber the real
  // values for every trade until someone noticed.
  if (isError || !settings) {
    return (
      <Card>
        <CardContent>
          <EmptyState icon={TriangleAlert} title={t("admin.form.loadErrorTitle")} description={t("admin.form.loadErrorDescription")} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-6">
        <p className="font-semibold">{t("admin.form.title")}</p>

        <div className="grid gap-5 sm:grid-cols-3">
          <RateField
            label={t("admin.form.transactionChargeRate")}
            hint={t("admin.form.transactionChargeHint")}
            value={transactionChargeRate}
            onChange={(percent) => setTransactionChargeRate(percent / 100)}
          />
          <RateField
            label={t("admin.form.sellSpreadRate")}
            hint={t("admin.form.sellSpreadHint")}
            value={sellSpreadRate}
            onChange={(percent) => setSellSpreadRate(percent / 100)}
          />
          <BdtField
            label={t("admin.form.govtGoldTaxPerBhoriBdt")}
            hint={t("admin.form.govtGoldTaxHint")}
            value={govtGoldTaxPerBhoriBdt}
            onChange={setGovtGoldTaxPerBhoriBdt}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-xs text-muted-foreground">
            {settings?.updatedAt ? t("admin.form.lastUpdated", { date: formatDateTime(settings.updatedAt) }) : t("admin.form.neverUpdated")}
          </p>
          <Button variant="gold-solid" onClick={handleSave} disabled={update.isPending}>
            {update.isPending ? t("admin.form.saving") : t("admin.form.save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  const { t } = useTranslation();
  const { data: user, isLoading } = useMe();

  return (
    <div className="space-y-6">
      <PageHeader title={t("admin.header.title")} description={t("admin.header.description")} action={<WalletBadge />} />

      {isLoading ? (
        <Card>
          <CardContent>
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      ) : user?.role === "ADMIN" ? (
        <FeeSettingsForm />
      ) : (
        <Card>
          <CardContent>
            <EmptyState icon={ShieldAlert} title={t("admin.notAuthorized.title")} description={t("admin.notAuthorized.description")} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
