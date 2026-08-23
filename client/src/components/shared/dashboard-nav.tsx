"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowDownRight,
  ArrowUpRight,
  Gift,
  HandCoins,
  History,
  Home,
  IdCard,
  PackageCheck,
  PiggyBank,
  User,
  Vault,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Shared with dashboard-sidebar-nav.tsx so the two nav variants (compact
// mobile header vs. desktop sidebar) can't drift apart. Order/labels match
// the reference design's sidebar. Auto-Save, Collect, Gift Gold, Vault, and
// Loan Against Gold have no backend in this repo (see CLAUDE.md) — their
// pages are built with local/illustrative state instead of a fake API.
// "History" points at the existing transactions page (real data), and
// "Verify Account" at the existing KYC flow — renamed labels, same features.
export const DASHBOARD_NAV_LINKS = [
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/buy-gold", label: "Buy Gold", icon: ArrowUpRight },
  { href: "/sell-gold", label: "Sell Gold", icon: ArrowDownRight },
  { href: "/auto-save", label: "Auto-Save", icon: PiggyBank },
  { href: "/collect", label: "Collect", icon: PackageCheck },
  { href: "/gift-gold", label: "Gift Gold", icon: Gift },
  { href: "/transactions", label: "History", icon: History },
  { href: "/vault", label: "Vault", icon: Vault },
  { href: "/loan-against-gold", label: "Loan Against Gold", icon: HandCoins },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/kyc", label: "Verify Account", icon: IdCard },
];

/** Compact horizontal nav — used in the mobile header below `lg`, where the
 * full sidebar (dashboard-sidebar-nav.tsx) is hidden. */
export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1">
      {DASHBOARD_NAV_LINKS.map((link) => {
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
