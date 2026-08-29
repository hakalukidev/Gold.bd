"use client";

import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { DASHBOARD_NAV_LINKS } from "./dashboard-nav";
import { GoldRatePill } from "./gold-rate-pill";
import { LanguageToggle } from "./language-toggle";
import { UserMenu } from "./user-menu";
import { WalletPill } from "./wallet-pill";

/** Sticky top bar of the dashboard shell: sidebar toggle, current-section
 * label and the live gold rate on the left; wallet balance, language switch
 * and the user avatar menu on the right. */
export function DashboardTopbar() {
  const pathname = usePathname();
  const current = DASHBOARD_NAV_LINKS.find((link) => link.href === pathname);

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur-sm">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-4" />
      <span className="text-sm font-medium text-muted-foreground">{current?.label ?? "Gold BD"}</span>
      <GoldRatePill className="ml-2 hidden lg:flex" />
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <WalletPill className="hidden sm:flex" />
        <LanguageToggle />
        <UserMenu />
      </div>
    </header>
  );
}
