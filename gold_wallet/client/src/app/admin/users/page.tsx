"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useAdminUsers } from "@/hooks/use-admin-reports";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/format";
import { useTranslation } from "@/lib/i18n/use-translation";

const KYC_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  NOT_SUBMITTED: "outline",
  PENDING: "secondary",
  APPROVED: "default",
  REJECTED: "destructive",
};

export default function AdminUsersPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const { data: users, isLoading } = useAdminUsers(search || undefined);

  return (
    <>
      <PageHeader title={t("adminNav.users")} description={t("admin.users.description")} />
      <Card>
        <CardContent className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("admin.users.searchPlaceholder")} className="pl-8" />
          </div>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : !users || users.length === 0 ? (
            <EmptyState icon={Search} title={t("admin.users.emptyTitle")} description={t("admin.users.emptyDescription")} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground uppercase">
                    <th className="pb-2 pr-3 font-medium">{t("admin.users.columns.name")}</th>
                    <th className="pb-2 pr-3 font-medium">{t("admin.users.columns.phone")}</th>
                    <th className="pb-2 pr-3 font-medium">{t("admin.users.columns.role")}</th>
                    <th className="pb-2 pr-3 font-medium">{t("admin.users.columns.kyc")}</th>
                    <th className="pb-2 font-medium">{t("admin.users.columns.joined")}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b last:border-0">
                      <td className="py-2.5 pr-3">
                        <p className="font-medium">{u.fullName}</p>
                        {u.email && <p className="text-xs text-muted-foreground">{u.email}</p>}
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums">{u.phone}</td>
                      <td className="py-2.5 pr-3">
                        <Badge variant={u.role === "ADMIN" ? "default" : "outline"}>{u.role}</Badge>
                      </td>
                      <td className="py-2.5 pr-3">
                        <Badge variant={KYC_VARIANT[u.kycStatus] ?? "outline"}>{u.kycStatus}</Badge>
                      </td>
                      <td className="py-2.5 text-muted-foreground">{formatDateTime(u.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
