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
} from "lucide-react";

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
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/market", label: "Market", icon: CandlestickChart },
  { href: "/buy-gold", label: "Buy Gold", icon: ArrowUpRight },
  { href: "/sell-gold", label: "Sell Gold", icon: ArrowDownRight },
  { href: "/auto-save", label: "Auto-Save", icon: PiggyBank },
  { href: "/collect", label: "Collect", icon: PackageCheck },
  { href: "/gift-gold", label: "Gift Gold", icon: Gift },
  { href: "/transactions", label: "Transaction History", icon: History },
  { href: "/vault", label: "Vault", icon: Vault },
  { href: "/loan-against-gold", label: "Loan Against Gold", icon: HandCoins },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/kyc", label: "Verify Account", icon: IdCard },
];

/** Links that live under the sidebar's "Account" group instead of the main
 * menu. Filtering by href (rather than slicing the array) keeps the order above
 * as the only thing that has to be maintained. */
const ACCOUNT_HREFS = new Set(["/profile", "/kyc"]);

export const DASHBOARD_MAIN_LINKS = DASHBOARD_NAV_LINKS.filter((l) => !ACCOUNT_HREFS.has(l.href));
export const DASHBOARD_ACCOUNT_LINKS = DASHBOARD_NAV_LINKS.filter((l) => ACCOUNT_HREFS.has(l.href));
