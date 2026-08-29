"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, PanelBottom, Settings, ShieldCheck, Users } from "lucide-react";
import { cn } from "@/lib/utils";

// Shared with admin-sidebar-nav.tsx so the two nav variants (compact mobile
// header vs. desktop sidebar) can't drift apart.
export const ADMIN_NAV_LINKS = [
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/rates", label: "Rates", icon: ShieldCheck },
  { href: "/admin/transactions", label: "Transactions", icon: History },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  // Its own nav item rather than folded into Settings — the "Follow us"
  // social links it controls are a distinct, footer-only concern.
  { href: "/admin/footer", label: "Footer", icon: PanelBottom },
];

/** Compact horizontal nav — used in the mobile header below `lg`, where the
 * full sidebar (admin-sidebar-nav.tsx) is hidden. */
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1">
      {ADMIN_NAV_LINKS.map((link) => {
        const active = pathname === link.href;
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="size-3.5" strokeWidth={2} />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
