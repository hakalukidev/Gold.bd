"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/use-translation";
import { useMe, useLogout } from "@/hooks/use-auth";
import { clearSession } from "@/lib/session";
import { ThemeToggle } from "./theme-toggle";
import { LanguageToggle } from "./language-toggle";
import { ADMIN_NAV_LINKS } from "@/lib/admin-nav";

export function AdminTopbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();
  const { data: user } = useMe();
  const logout = useLogout();
  const current = ADMIN_NAV_LINKS.find((link) => link.href === pathname);

  async function handleLogout() {
    try {
      await logout.mutateAsync();
    } finally {
      clearSession();
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur-sm">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-4" />
      <span className="text-sm font-medium text-muted-foreground">{current ? t(current.labelKey) : t("admin.panelName")}</span>
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <Link href="/wallet" className="hidden text-xs font-medium text-muted-foreground hover:text-foreground sm:inline">
          {t("admin.backToApp")}
        </Link>
        <ThemeToggle />
        <LanguageToggle />
        <span className="hidden text-sm font-medium sm:inline">{user?.fullName}</span>
        <Button variant="outline" size="icon" aria-label={t("userMenu.logOut")} onClick={handleLogout} disabled={logout.isPending}>
          <LogOut className="size-4" strokeWidth={1.75} />
        </Button>
      </div>
    </header>
  );
}
