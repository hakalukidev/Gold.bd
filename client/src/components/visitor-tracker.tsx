"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Fires one POST /api/visits per page load — mounted once in Providers so
 * it runs on every route. Skips /admin/* on purpose: staff loading their own
 * panel shouldn't inflate a "site visitors" count meant to describe real
 * public traffic. Fire-and-forget; a failed beacon shouldn't affect the page. */
export function VisitorTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname?.startsWith("/admin")) return;
    fetch("/api/visits", { method: "POST" }).catch(() => {});
  }, [pathname]);

  return null;
}
