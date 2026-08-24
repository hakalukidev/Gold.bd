"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gem } from "lucide-react";
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
import { DASHBOARD_ACCOUNT_LINKS, DASHBOARD_MAIN_LINKS } from "./dashboard-nav";

type NavLink = (typeof DASHBOARD_MAIN_LINKS)[number];

function NavMenu({ links, pathname }: { links: NavLink[]; pathname: string }) {
  return (
    <SidebarMenu className="gap-1">
      {links.map((link) => {
        const active = pathname === link.href;
        const Icon = link.icon;
        return (
          <SidebarMenuItem key={link.href}>
            {/* `tooltip` only shows while the sidebar is collapsed to icons. */}
            <SidebarMenuButton
              isActive={active}
              tooltip={link.label}
              className={cn(
                "h-10 gap-3 rounded-md px-2.5 font-semibold text-sidebar-foreground/75 [&_svg]:size-[18px]",
                "hover:bg-sidebar-accent hover:text-sidebar-foreground",
                "data-active:bg-gold/10 data-active:font-semibold data-active:text-gold"
              )}
              render={<Link href={link.href} aria-current={active ? "page" : undefined} />}
            >
              <Icon strokeWidth={1.75} />
              <span>{link.label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

/** Dashboard shell sidebar — shadcn `Sidebar` (collapses to an icon rail on
 * desktop, slides in as a sheet below the `md` breakpoint via SidebarProvider).
 * It shares the page background (see the --sidebar tokens in globals.css) and is
 * set off from the content only by its right border. Link set comes from
 * dashboard-nav.tsx. */
export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip="Gold BD" render={<Link href="/" />}>
              <span className="flex aspect-square size-8 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-gold">
                <Gem className="size-4" />
              </span>
              <span className="grid flex-1 text-left leading-tight">
                <span className="truncate text-base font-semibold">Gold BD</span>
                <span className="truncate text-xs text-sidebar-foreground/60">Digital gold</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="gap-2 px-1 py-2">
        <SidebarGroup>
          <SidebarGroupLabel className="mb-1 px-2.5 text-[11px] font-semibold tracking-[0.12em] text-sidebar-foreground/50 uppercase">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <NavMenu links={DASHBOARD_MAIN_LINKS} pathname={pathname} />
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="mb-1 px-2.5 text-[11px] font-semibold tracking-[0.12em] text-sidebar-foreground/50 uppercase">
            Account
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <NavMenu links={DASHBOARD_ACCOUNT_LINKS} pathname={pathname} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
