"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Gem, ChevronDown, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setMobileMenuOpen, toggleMobileMenu, setLocale, type Locale } from "@/store/slices/ui-slice";
import { useT } from "@/lib/i18n/use-t";
import { cn } from "@/lib/utils";
import { WALLET_SIGN_IN_URL } from "@/lib/site-links";
import { CartButton } from "./cart-button";

type NavLink = { href: string; label: string };
type NavGroup = { label: string; matchPrefix: string; items: NavLink[] };

function LanguageToggle({ className }: { className?: string }) {
  const locale = useAppSelector((state) => state.ui.locale);
  const dispatch = useAppDispatch();

  const options: { id: Locale; label: string }[] = [
    { id: "bn", label: "বাং" },
    { id: "en", label: "EN" },
  ];

  return (
    <div className={cn("flex items-center gap-0.5 rounded-full border border-white/15 bg-white/5 p-0.5", className)}>
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => dispatch(setLocale(opt.id))}
          aria-pressed={locale === opt.id}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-bold transition-colors",
            locale === opt.id ? "bg-gold text-ink" : "text-neutral-400 hover:text-white"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function LandingHeader() {
  const mobileMenuOpen = useAppSelector((state) => state.ui.mobileMenuOpen);
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const t = useT();
  const [openMobileGroup, setOpenMobileGroup] = useState<string | null>(null);

  const navLinks: NavLink[] = [
    { href: "/", label: t.nav.home },
    { href: "/products/gold", label: t.nav.buyGold },
    { href: "/#rate-history", label: t.nav.prices },
  ];

  const navGroups: NavGroup[] = [
    {
      label: t.nav.support,
      matchPrefix: "/buying-guide",
      items: [
        { href: "/buying-guide", label: t.nav.buyingGuide },
        { href: "/#contact", label: t.nav.contactUs },
        { href: "/#faq", label: t.nav.faq },
      ],
    },
    {
      label: t.nav.calculator,
      matchPrefix: "/calculator",
      items: [
        { href: "/calculator#gold", label: t.calculatorPage.gold.title },
        { href: "/calculator#silver", label: t.calculatorPage.silver.title },
        { href: "/calculator#making-charge", label: t.calculatorPage.makingCharge.title },
        { href: "/calculator#bhori-gram", label: t.calculatorPage.bhoriGram.title },
        { href: "/calculator#zakat", label: t.calculatorPage.zakat.title },
      ],
    },
    {
      label: t.nav.about,
      matchPrefix: "__none__",
      items: [
        { href: "/#about", label: t.nav.aboutUs },
        { href: "/#why", label: t.nav.whyUs },
        { href: "/#how-it-works", label: t.nav.howItWorks },
      ],
    },
  ];

  const isActive = (href: string) => href === "/" && pathname === "/";
  const isGroupActive = (group: NavGroup) => group.matchPrefix !== "__none__" && pathname.startsWith(group.matchPrefix);
  const closeMobileMenu = () => {
    dispatch(setMobileMenuOpen(false));
    setOpenMobileGroup(null);
  };

  return (
    <div className="w-full">
      <header className="w-full border-b border-[rgba(212,166,42,0.15)] bg-[rgba(3,3,3,0.75)] backdrop-blur-[20px]">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-gold">
              <Gem className="size-4.5" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-lg font-bold tracking-tight text-white">
                GOLD<span className="text-gold">.BD</span>
              </span>
              <span className="mt-1 text-[10px] font-medium tracking-wide text-muted-white uppercase">
                {t.nav.tagline}
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-6 lg:flex">
            {navLinks.map(({ href, label }) => {
              const active = isActive(href);
              return (
                <Link
                  key={label}
                  href={href}
                  className={cn(
                    "group relative py-1.5 text-sm font-bold text-neutral-200 transition-colors duration-300 hover:text-gold",
                    active && "text-gold"
                  )}
                >
                  {label}
                  <span
                    className={cn(
                      "absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-gold transition-transform duration-300",
                      active ? "scale-x-100" : "group-hover:scale-x-100"
                    )}
                  />
                </Link>
              );
            })}

            {navGroups.map((group) => {
              const active = isGroupActive(group);
              return (
                <DropdownMenu key={group.label}>
                  <DropdownMenuTrigger
                    openOnHover
                    className={cn(
                      "flex items-center gap-1 py-1.5 text-sm font-bold text-neutral-200 outline-none transition-colors duration-300 hover:text-gold data-popup-open:text-gold",
                      active && "text-gold"
                    )}
                  >
                    {group.label}
                    <ChevronDown className="size-3.5 transition-transform duration-200 data-popup-open:rotate-180" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="min-w-48 border border-white/10 bg-ink-light p-1.5"
                  >
                    {group.items.map((item) => (
                      <DropdownMenuItem
                        key={item.href}
                        className="rounded-md px-2 py-1.5 text-sm font-semibold text-neutral-200 focus:text-gold"
                        render={<Link href={item.href}>{item.label}</Link>}
                      />
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            })}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <CartButton />
            <LanguageToggle />
            <Button
              variant="gold-outline"
              size="default"
              nativeButton={false}
              className="h-10 gap-2 px-4 text-xs font-bold tracking-[0.08em]"
              render={
                <a href={WALLET_SIGN_IN_URL}>
                  <Wallet className="size-4" />
                  {t.nav.goldWallet}
                </a>
              }
            />
            <Button
              variant="gold-solid"
              size="default"
              nativeButton={false}
              className="h-10 px-5 text-xs font-bold tracking-[0.08em] shadow-[0_0_18px_rgba(212,166,42,0.25)]"
              render={<Link href="/products/gold">{t.rateHistory.buyGold}</Link>}
            />
          </div>

          <div className="flex items-center gap-1 lg:hidden">
            <CartButton />
            <LanguageToggle />
            <button
              type="button"
              aria-label={mobileMenuOpen ? t.nav.closeMenu : t.nav.openMenu}
              onClick={() => dispatch(toggleMobileMenu())}
              className="rounded-full p-2 text-white hover:bg-white/10"
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="w-full border-b border-[rgba(212,166,42,0.15)] bg-[rgba(3,3,3,0.97)] p-4 shadow-2xl backdrop-blur-[20px] lg:hidden">
          <nav className="flex flex-col gap-1">
            {navLinks.map(({ href, label }) => {
              const active = isActive(href);
              return (
                <Link
                  key={label}
                  href={href}
                  onClick={closeMobileMenu}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-bold transition-colors",
                    active ? "text-gold" : "text-neutral-200 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {label}
                </Link>
              );
            })}

            {navGroups.map((group) => {
              const expanded = openMobileGroup === group.label;
              const active = isGroupActive(group);
              return (
                <div key={group.label}>
                  <button
                    type="button"
                    onClick={() => setOpenMobileGroup(expanded ? null : group.label)}
                    aria-expanded={expanded}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-bold transition-colors",
                      active ? "text-gold" : "text-neutral-200 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    {group.label}
                    <ChevronDown className={cn("size-4 transition-transform duration-200", expanded && "rotate-180")} />
                  </button>
                  {expanded && (
                    <div className="ml-3 flex flex-col gap-0.5 border-l border-white/10 pl-3">
                      {group.items.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={closeMobileMenu}
                          className="rounded-md px-3 py-2 text-sm font-semibold text-neutral-300 hover:bg-white/10 hover:text-white"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
          <div className="mt-3 flex flex-col gap-3 border-t border-white/10 pt-3">
            <Button
              variant="gold-outline"
              size="lg"
              nativeButton={false}
              className="w-full gap-2"
              render={
                <a href={WALLET_SIGN_IN_URL} onClick={closeMobileMenu}>
                  <Wallet className="size-4" />
                  {t.nav.goldWallet}
                </a>
              }
            />
            <Button
              variant="gold"
              size="lg"
              nativeButton={false}
              className="w-full shadow-none"
              style={{ boxShadow: "none" }}
              render={
                <Link href="/products/gold" onClick={closeMobileMenu}>
                  {t.rateHistory.buyGold}
                </Link>
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
