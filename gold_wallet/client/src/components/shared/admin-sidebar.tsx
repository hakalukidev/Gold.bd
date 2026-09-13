"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/use-translation";
import { ADMIN_NAV_LINKS } from "@/lib/admin-nav";

/** Standalone admin panel's own sidebar — deliberately not the main app's
 * DashboardSidebar reused: this is its own self-contained section (own
 * SidebarProvider in admin/layout.tsx), same pattern as the main dashboard
 * shell but with admin's own link set. */
export function AdminSidebar() {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip={t("admin.panelName")} render={<Link href="/admin" />}>
              <span className="flex aspect-square size-8 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-gold">
                <ShieldCheck className="size-4" />
              </span>
              <span className="grid flex-1 text-left leading-tight">
                <span className="truncate text-base font-semibold">{t("common.brand")}</span>
                <span className="truncate text-xs text-sidebar-foreground/60">{t("admin.panelName")}</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="gap-2 px-1 py-2">
        <SidebarGroup>
          <SidebarGroupLabel className="mb-1 px-2.5 text-[11px] font-semibold tracking-[0.12em] text-sidebar-foreground/50 uppercase">
            {t("sidebar.menuGroup")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {ADMIN_NAV_LINKS.map((link) => {
                const active = pathname === link.href;
                const Icon = link.icon;
                const label = t(link.labelKey);
                return (
                  <SidebarMenuItem key={link.href}>
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={label}
                      className={cn(
                        "h-10 gap-3 rounded-md px-2.5 font-semibold text-sidebar-foreground/75 [&_svg]:size-[18px]",
                        "hover:bg-sidebar-accent hover:text-sidebar-foreground",
                        "data-active:bg-gold/10 data-active:font-semibold data-active:text-gold"
                      )}
                      render={<Link href={link.href} aria-current={active ? "page" : undefined} />}
                    >
                      <Icon strokeWidth={1.75} />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
