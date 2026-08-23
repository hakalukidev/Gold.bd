import Link from "next/link";
import { Gem } from "lucide-react";
import { DashboardNav } from "@/components/shared/dashboard-nav";
import { DashboardSidebarNav } from "@/components/shared/dashboard-sidebar-nav";
import { UserMenu } from "@/components/shared/user-menu";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const brandMark = (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="flex size-8 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-gold">
        <Gem className="size-4" />
      </span>
      <span className="text-base font-semibold">Gold BD</span>
    </Link>
  );

  return (
    <div className="flex min-h-screen bg-muted/20">
      {/* ---------- Desktop sidebar ---------- */}
      <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-sidebar-border bg-sidebar p-6 text-sidebar-foreground lg:flex">
        <div>
          {brandMark}
          <div className="mt-6">
            <DashboardSidebarNav />
          </div>
        </div>
        <div className="border-t border-sidebar-border pt-4">
          <UserMenu />
        </div>
      </aside>

      {/* ---------- Right pane: mobile header (below lg) + page content ---------- */}
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur-sm lg:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="flex flex-wrap items-center gap-6">
              {brandMark}
              <DashboardNav />
            </div>
            <UserMenu />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
