"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { DASHBOARD_NAV_LINKS } from "./dashboard-nav";

/** Vertical nav for the desktop dashboard sidebar — same link set as
 * DashboardNav's mobile header, just laid out as a stacked menu with a
 * left-rail active indicator instead of pills (mirrors admin-sidebar-nav.tsx).
 * Text-only (no icons) to match the reference design's sidebar — the mobile
 * header keeps icons since it needs the compactness. */
export function DashboardSidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {DASHBOARD_NAV_LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-lg border-l-2 px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-sidebar-primary bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                : "border-transparent text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
