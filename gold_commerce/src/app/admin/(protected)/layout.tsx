import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Gem } from "lucide-react";
import { AdminNav } from "@/components/shared/admin-nav";
import { AdminSidebarNav } from "@/components/shared/admin-sidebar-nav";
import { AdminLogoutButton } from "@/components/shared/admin-logout-button";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Gates every /admin/* page except /admin/login (which lives outside this
  // route group, so it never hits this check) — see /api/admin/auth/login
  // for where the cookie gets set. The cookie's value is the signed-in
  // admin's email, shown in the sidebar footer below.
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE);
  if (!session) redirect("/admin/login");

  const brandMark = (
    <Link href="/admin/users" className="flex items-center gap-2.5">
      <span className="flex size-8 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-gold">
        <Gem className="size-4" />
      </span>
      <span className="text-base font-semibold">Gold BD Admin</span>
    </Link>
  );

  return (
    <div className="flex min-h-screen bg-muted/20">
      {/* ---------- Desktop sidebar ---------- */}
      <aside className="hidden w-72 shrink-0 flex-col justify-between border-r border-sidebar-border bg-sidebar p-6 text-sidebar-foreground lg:flex">
        <div>
          {brandMark}

          <span className="mt-6 inline-flex items-center rounded-full border border-sidebar-border px-2.5 py-1 text-[10px] font-semibold tracking-wide text-sidebar-foreground/70 uppercase">
            Admin panel
          </span>
          <p className="mt-3 text-sm text-sidebar-foreground/60">Manage rates, users, transactions, and site settings.</p>

          <div className="mt-6">
            <AdminSidebarNav />
          </div>
        </div>

        <div className="border-t border-sidebar-border pt-4">
          <p className="truncate text-xs text-sidebar-foreground/60">Signed in as {session.value}</p>
          <AdminLogoutButton variant="ghost" className="mt-2 w-full justify-start px-2" />
        </div>
      </aside>

      {/* ---------- Right pane: mobile header (below lg) + page content ---------- */}
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur-sm lg:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="flex flex-wrap items-center gap-6">
              {brandMark}
              <AdminNav />
            </div>
            <AdminLogoutButton />
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
