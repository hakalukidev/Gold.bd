import { BarChart3, Gift, IdCard, LayoutDashboard, Package, Settings, Users, type LucideIcon } from "lucide-react";

export interface AdminNavLinkEntry {
  href: string;
  labelKey: string;
  icon: LucideIcon;
}

/** Single source of truth for the admin sidebar (admin-sidebar.tsx) and the
 * top bar's current-section label (admin-topbar.tsx). Every entry here has a
 * real, working page behind it — no reference-design placeholders. */
export const ADMIN_NAV_LINKS: AdminNavLinkEntry[] = [
  { href: "/admin", labelKey: "adminNav.dashboard", icon: LayoutDashboard },
  { href: "/admin/users", labelKey: "adminNav.users", icon: Users },
  { href: "/admin/kyc", labelKey: "adminNav.kyc", icon: IdCard },
  { href: "/admin/gift-coins", labelKey: "adminNav.giftCoins", icon: Gift },
  { href: "/admin/collect", labelKey: "adminNav.collect", icon: Package },
  { href: "/admin/reports", labelKey: "adminNav.reports", icon: BarChart3 },
  { href: "/admin/settings", labelKey: "adminNav.settings", icon: Settings },
];
