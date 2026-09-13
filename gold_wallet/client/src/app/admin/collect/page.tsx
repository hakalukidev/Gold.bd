"use client";

import { toast } from "sonner";
import { Package, TriangleAlert } from "lucide-react";
import { useCollectQueue, useApproveCollect } from "@/hooks/use-collect";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/format";
import { ApiError } from "@/lib/api-client";
import { useTranslation } from "@/lib/i18n/use-translation";

function maskPhone(phone: string) {
  return phone.length > 4 ? `${phone.slice(0, -4).replace(/./g, "•")}${phone.slice(-4)}` : phone;
}

/** Queue of physical bar/coin delivery-or-pickup requests — the gold is
 * already debited from the requester's wallet at request time (see
 * collect.service.js), so this is purely "has an admin arranged the actual
 * shipment/pickup yet", not a balance check. */
export default function AdminCollectPage() {
  const { t } = useTranslation();
  const { data: queue, isLoading, isError } = useCollectQueue("PENDING");
  const approve = useApproveCollect();

  function handleApprove(id: string) {
    approve.mutate(id, {
      onSuccess: () => toast.success(t("admin.collect.approved")),
      onError: (error) => toast.error(error instanceof ApiError ? error.message : t("admin.collect.actionFailed")),
    });
  }

  return (
    <>
      <PageHeader title={t("admin.collect.title")} description={t("adminNav.collect")} />
      <Card>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
            </div>
          ) : isError ? (
            <EmptyState icon={TriangleAlert} title={t("admin.collect.loadErrorTitle")} description={t("admin.collect.loadErrorDescription")} />
          ) : !queue || queue.length === 0 ? (
            <EmptyState icon={Package} title={t("admin.collect.emptyTitle")} description={t("admin.collect.emptyDescription")} />
          ) : (
            <div className="space-y-3">
              {queue.map((order) => (
                <div key={order.id} className="flex flex-wrap items-start justify-between gap-4 rounded-md border p-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {order.requesterName} · {order.weightGrams}g{" "}
                      {order.form === "bar" ? t("collectPanel.formOptions.bar") : t("collectPanel.formOptions.coin")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.requesterPhone ? maskPhone(order.requesterPhone) : "—"} ·{" "}
                      {order.method === "home" ? t("collectPanel.homeDelivery") : t("collectPanel.pickupPoint")}
                    </p>
                    {order.address && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {order.address.fullName}, {order.address.phone} — {order.address.streetAddress}, {order.address.district}{" "}
                        {order.address.postalCode}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(order.createdAt)}</p>
                  </div>
                  <Button variant="gold-solid" size="sm" disabled={approve.isPending} onClick={() => handleApprove(order.id)}>
                    {t("admin.collect.approve")}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
