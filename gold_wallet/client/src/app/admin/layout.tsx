"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { useMe } from "@/hooks/use-auth";
import { clearSession } from "@/lib/session";
import { AdminSidebar } from "@/components/shared/admin-sidebar";
import { AdminTopbar } from "@/components/shared/admin-topbar";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useTranslation } from "@/lib/i18n/use-translation";

/**
 * Standalone admin panel shell — deliberately outside the (dashboard) route
 * group's layout (own SidebarProvider, own top bar, no trace of the main
 * app's nav), so it reads as its own self-contained section rather than a
 * page bolted onto the wallet dashboard. Same auth-guard responsibility
 * DashboardTopbar's UserMenu carries for the rest of the app (redirect to
 * /login once there's definitely no real session) — this layout has to own
 * that itself since it no longer sits inside DashboardTopbar's tree. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { data: user, tokenChecked, hasToken, isError } = useMe();

  useEffect(() => {
    if (tokenChecked && (!hasToken || isError)) {
      clearSession();
      router.replace("/login");
    }
  }, [tokenChecked, hasToken, isError, router]);

  if (!tokenChecked || (hasToken && !user && !isError)) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <Skeleton className="h-24 w-64" />
      </div>
    );
  }

  if (!user) return null; // the redirect effect above is about to send this to /login

  if (user.role !== "ADMIN") {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <EmptyState icon={ShieldAlert} title={t("admin.notAuthorized.title")} description={t("admin.notAuthorized.description")} />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset className="min-w-0">
        <AdminTopbar />
        <div className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8 lg:px-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
