"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Gift, ShieldAlert, ShieldCheck, TriangleAlert } from "lucide-react";
import { useMe } from "@/hooks/use-auth";
import { useAdminSettings, useUpdateAdminSettings } from "@/hooks/use-admin-settings";
import { useKycQueue, useReviewKyc } from "@/hooks/use-kyc";
import { useGiftCoinQueue, useFulfillGiftCoin } from "@/hooks/use-gift-coin";
import { PageHeader } from "@/components/shared/page-header";
import { WalletBadge } from "@/components/shared/wallet-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SecureImage } from "@/components/shared/secure-image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/format";
import { ApiError } from "@/lib/api-client";
import { kycDocumentUrl } from "@/lib/kyc-api";
import { giftCoinPhotoUrl } from "@/lib/gift-coin-api";
import { useTranslation } from "@/lib/i18n/use-translation";

function maskPhone(phone: string) {
  return phone.length > 4 ? `${phone.slice(0, -4).replace(/./g, "•")}${phone.slice(-4)}` : phone;
}

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

/** Pending-submission queue: three document thumbnails (fetched through an
 * authenticated request, see SecureImage) plus approve/reject actions. A
 * rejection needs a reason (enforced server-side too, see kyc.validation.js)
 * so the applicant knows what to fix before resubmitting. */
function KycReviewQueue() {
  const { t } = useTranslation();
  const { data: queue, isLoading, isError } = useKycQueue("PENDING");
  const review = useReviewKyc();
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  function handleApprove(id: string) {
    review.mutate(
      { id, decision: "APPROVED" },
      {
        onSuccess: () => toast.success(t("admin.kyc.approved")),
        onError: (error) => toast.error(error instanceof ApiError ? error.message : t("admin.kyc.actionFailed")),
      }
    );
  }

  function handleReject() {
    if (!rejectTarget || !rejectReason.trim()) return;
    review.mutate(
      { id: rejectTarget, decision: "REJECTED", rejectReason: rejectReason.trim() },
      {
        onSuccess: () => {
          toast.success(t("admin.kyc.rejected"));
          setRejectTarget(null);
          setRejectReason("");
        },
        onError: (error) => toast.error(error instanceof ApiError ? error.message : t("admin.kyc.actionFailed")),
      }
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        <p className="font-semibold">{t("admin.kyc.title")}</p>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : isError ? (
          <EmptyState icon={TriangleAlert} title={t("admin.kyc.loadErrorTitle")} description={t("admin.kyc.loadErrorDescription")} />
        ) : !queue || queue.length === 0 ? (
          <EmptyState icon={ShieldCheck} title={t("admin.kyc.emptyTitle")} description={t("admin.kyc.emptyDescription")} />
        ) : (
          <div className="space-y-4">
            {queue.map((item) => (
              <div key={item.id} className="space-y-3 rounded-md border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{item.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.phone ? maskPhone(item.phone) : "—"} · {t("kyc.nidLabel", { number: item.nidNumber })}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">{formatDateTime(item.submittedAt)}</p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <SecureImage url={kycDocumentUrl(item.id, "nidFront")} alt={t("kyc.nidStep.front")} className="h-24 w-full rounded-md" />
                  <SecureImage url={kycDocumentUrl(item.id, "nidBack")} alt={t("kyc.nidStep.back")} className="h-24 w-full rounded-md" />
                  <SecureImage
                    url={kycDocumentUrl(item.id, "selfie")}
                    alt={t("kyc.selfieStep.uploadLabel")}
                    className="h-24 w-full rounded-md"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={review.isPending}
                    onClick={() => {
                      setRejectTarget(item.id);
                      setRejectReason("");
                    }}
                  >
                    {t("admin.kyc.reject")}
                  </Button>
                  <Button variant="gold-solid" size="sm" disabled={review.isPending} onClick={() => handleApprove(item.id)}>
                    {t("admin.kyc.approve")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={rejectTarget !== null} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("admin.kyc.rejectDialog.title")}</DialogTitle>
            <DialogDescription>{t("admin.kyc.rejectDialog.description")}</DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder={t("admin.kyc.rejectDialog.placeholder")}
            rows={3}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              {t("kyc.back")}
            </Button>
            <Button variant="destructive" disabled={!rejectReason.trim() || review.isPending} onClick={handleReject}>
              {review.isPending ? t("admin.kyc.rejecting") : t("admin.kyc.confirmReject")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/** Queue of "print my photo on the coin" gift add-ons — this app has no
 * minting/shipping automation, so an admin fulfills these by hand and marks
 * each one sent once the physical coin has actually gone out. */
function GiftCoinQueue() {
  const { t } = useTranslation();
  const { data: queue, isLoading, isError } = useGiftCoinQueue("PENDING");
  const fulfill = useFulfillGiftCoin();

  function handleFulfill(id: string) {
    fulfill.mutate(id, {
      onSuccess: () => toast.success(t("admin.giftCoins.fulfilled")),
      onError: (error) => toast.error(error instanceof ApiError ? error.message : t("admin.giftCoins.actionFailed")),
    });
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        <p className="font-semibold">{t("admin.giftCoins.title")}</p>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
          </div>
        ) : isError ? (
          <EmptyState icon={TriangleAlert} title={t("admin.giftCoins.loadErrorTitle")} description={t("admin.giftCoins.loadErrorDescription")} />
        ) : !queue || queue.length === 0 ? (
          <EmptyState icon={Gift} title={t("admin.giftCoins.emptyTitle")} description={t("admin.giftCoins.emptyDescription")} />
        ) : (
          <div className="space-y-3">
            {queue.map((order) => (
              <div key={order.id} className="flex flex-wrap items-center gap-4 rounded-md border p-3">
                <SecureImage url={giftCoinPhotoUrl(order.id)} alt={t("admin.giftCoins.photoAlt")} className="size-16 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {order.senderName} → {order.recipientName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {order.senderPhone ? maskPhone(order.senderPhone) : "—"} → {order.recipientPhone ? maskPhone(order.recipientPhone) : "—"}
                    {order.occasion ? ` · ${order.occasion}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(order.createdAt)}</p>
                </div>
                <Button variant="gold-solid" size="sm" disabled={fulfill.isPending} onClick={() => handleFulfill(order.id)}>
                  {t("admin.giftCoins.markSent")}
                </Button>
              </div>
            ))}
          </div>
        )}
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
        <>
          <FeeSettingsForm />
          <KycReviewQueue />
          <GiftCoinQueue />
        </>
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
