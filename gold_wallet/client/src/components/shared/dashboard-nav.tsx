import {
  ArrowDownRight,
  CandlestickChart,
  ArrowUpRight,
  Gift,
  HandCoins,
  History,
  IdCard,
  PackageCheck,
  PiggyBank,
  User,
  Vault,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/** Shape shared by every sidebar-style nav entry, including ones that live
 * outside DASHBOARD_NAV_LINKS below (e.g. dashboard-sidebar.tsx's
 * role-gated Admin link) — kept separate from the `as const` array's own
 * inferred literal-union type, which only fits its own fixed entries. */
export interface NavLinkEntry {
  href: string;
  labelKey: string;
  icon: LucideIcon;
}

// Single source of truth for the dashboard sidebar (dashboard-sidebar.tsx) and
// the top bar's current-page label (dashboard-topbar.tsx), so the two can't
// drift apart. Order/labels match the reference design's sidebar. Auto-Save,
// Collect, Gift Gold, Vault, and Loan Against Gold have no backend in this repo
// (see CLAUDE.md) — their pages are built with local/illustrative state instead
// of a fake API. "Transaction History" points at the existing transactions page
// (real data), and "Verify Account" at the existing KYC flow — renamed labels,
// same features — the wallet's money-in/money-out statement lives on that same
// page rather than a sidebar entry of its own. "Market" is the home screen: the
// live gold/silver graph plus the buy/sell desk (see market/page.tsx).
export const DASHBOARD_NAV_LINKS = [
  { href: "/wallet", labelKey: "nav.wallet", icon: Wallet },
  { href: "/market", labelKey: "nav.market", icon: CandlestickChart },
  { href: "/buy-gold", labelKey: "nav.buyGold", icon: ArrowUpRight },
  { href: "/sell-gold", labelKey: "nav.sellGold", icon: ArrowDownRight },
  { href: "/auto-save", labelKey: "nav.autoSave", icon: PiggyBank },
  { href: "/collect", labelKey: "nav.collect", icon: PackageCheck },
  { href: "/gift-gold", labelKey: "nav.giftGold", icon: Gift },
  { href: "/transactions", labelKey: "nav.transactionHistory", icon: History },
  { href: "/vault", labelKey: "nav.vault", icon: Vault },
  { href: "/loan-against-gold", labelKey: "nav.loanAgainstGold", icon: HandCoins },
  { href: "/profile", labelKey: "nav.profile", icon: User },
  { href: "/kyc", labelKey: "nav.verifyAccount", icon: IdCard },
] as const;

/** Links that live under the sidebar's "Account" group instead of the main
 * menu. Filtering by href (rather than slicing the array) keeps the order above
 * as the only thing that has to be maintained. */
const ACCOUNT_HREFS = new Set(["/profile", "/kyc"]);

export const DASHBOARD_MAIN_LINKS = DASHBOARD_NAV_LINKS.filter((l) => !ACCOUNT_HREFS.has(l.href));
export const DASHBOARD_ACCOUNT_LINKS = DASHBOARD_NAV_LINKS.filter((l) => ACCOUNT_HREFS.has(l.href));
