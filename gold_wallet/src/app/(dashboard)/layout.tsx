import { DashboardSidebar } from "@/components/shared/dashboard-sidebar";
import { DashboardTopbar } from "@/components/shared/dashboard-topbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset className="min-w-0">
        <DashboardTopbar />
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 lg:px-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
