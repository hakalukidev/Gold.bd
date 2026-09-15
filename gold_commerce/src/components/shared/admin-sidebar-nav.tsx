"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ADMIN_NAV_LINKS } from "./admin-nav";

/** Vertical nav for the desktop admin sidebar â€” same link set as AdminNav's
 * mobile header, just laid out as a stacked menu with a left-rail active
 * indicator instead of pills. */
export function AdminSidebarNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin navigation" className="flex flex-col gap-1.5">
      {ADMIN_NAV_LINKS.map((link) => {
        const active = pathname === link.href;
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-xl border px-3 py-3 text-sm font-medium transition-colors",
              active
                ? "border-gold/25 bg-gold/15 text-gold-light shadow-sm"
                : "border-transparent text-white/60 hover:bg-white/5 hover:text-white"
            )}
          >
            <Icon className="size-4 shrink-0" strokeWidth={1.75} />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
