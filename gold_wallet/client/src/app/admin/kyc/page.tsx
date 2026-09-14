"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, TriangleAlert } from "lucide-react";
import { useKycQueue, useReviewKyc } from "@/hooks/use-kyc";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { SecureImage } from "@/components/shared/secure-image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/format";
import { ApiError } from "@/lib/api-client";
import { kycDocumentUrl } from "@/lib/kyc-api";
import { useTranslation } from "@/lib/i18n/use-translation";

function maskPhone(phone: string) {
  return phone.length > 4 ? `${phone.slice(0, -4).replace(/./g, "•")}${phone.slice(-4)}` : phone;
}

/** Pending-submission queue: three document thumbnails (fetched through an
 * authenticated request, see SecureImage) plus approve/reject actions. A
 * rejection needs a reason (enforced server-side too, see kyc.validation.js)
 * so the applicant knows what to fix before resubmitting. */
export default function AdminKycPage() {
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
    <>
      <PageHeader title={t("admin.kyc.title")} description={t("adminNav.kyc")} />
      <Card>
        <CardContent className="space-y-4">
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
    </>
  );
}
