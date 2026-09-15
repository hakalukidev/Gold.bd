import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowUpRight, Gem, ShieldCheck } from "lucide-react";
import { AdminNav } from "@/components/shared/admin-nav";
import { AdminSidebarNav } from "@/components/shared/admin-sidebar-nav";
import { AdminLogoutButton } from "@/components/shared/admin-logout-button";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-session";
import "./admin.css";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE);
  if (!session) redirect("/admin/login");

  const brandMark = (
    <Link href="/admin/users" className="flex items-center gap-3">
      <span className="flex size-10 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold"><Gem className="size-5" /></span>
      <span><span className="block text-lg font-bold tracking-tight">GOLD<span className="text-gold">.BD</span></span><span className="text-[10px] font-medium tracking-[0.2em] uppercase opacity-60">Administration</span></span>
    </Link>
  );

  return (
    <div className="admin-shell flex min-h-screen">
      <aside className="admin-sidebar sticky top-0 hidden h-screen w-64 shrink-0 flex-col justify-between overflow-y-auto p-5 lg:flex">
        <div>
          <div className="px-2 py-3">{brandMark}</div>
          <p className="mb-4 mt-10 px-3 text-[10px] font-semibold tracking-[0.18em] text-white/40 uppercase">Workspace</p>
          <AdminSidebarNav />
        </div>
        <div className="mt-10 border-t border-white/10 pt-5">
          <div className="mb-4 flex items-center gap-3 px-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-gold"><ShieldCheck className="size-4" /></span>
            <div className="min-w-0"><p className="text-sm font-semibold">Administrator</p><p className="mt-1 truncate text-xs text-white/50" title={session.value}>{session.value}</p></div>
          </div>
          <AdminLogoutButton variant="ghost" className="w-full justify-start text-white/60 hover:bg-white/10 hover:text-white" />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="admin-topbar border-b">
          <div className="flex h-20 items-center justify-between gap-4 px-5 lg:px-10">
            <div className="lg:hidden">{brandMark}</div>
            <div className="hidden items-center gap-3 text-sm lg:flex"><span className="text-muted-foreground">Workspace</span><span className="text-muted-foreground/40">/</span><span className="font-semibold">Admin panel</span></div>
            <Link href="/" className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors hover:bg-muted">View website<ArrowUpRight className="size-3.5" /></Link>
          </div>
          <div className="border-t px-4 py-3 lg:hidden"><AdminNav /><div className="mt-3"><AdminLogoutButton /></div></div>
        </header>
        <main className="admin-content mx-auto w-full max-w-[1440px] flex-1 px-4 py-7 sm:px-6 lg:px-10 lg:py-10">{children}</main>
        <footer className="flex flex-wrap justify-between gap-2 px-6 py-5 text-[11px] text-muted-foreground lg:px-10"><span>Gold BD Administration</span><span>Commerce management workspace</span></footer>
      </div>
    </div>
  );
}
