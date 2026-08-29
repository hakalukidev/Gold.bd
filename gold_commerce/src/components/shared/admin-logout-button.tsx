"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button, type buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";
import { useAdminLogout } from "@/hooks/use-admin-auth";
import { cn } from "@/lib/utils";

/** The protected admin layout reads the session cookie server-side, so
 * logging out just needs to clear it and hand back to /admin/login — no
 * `useMe()`-style user fetch to drive an avatar/menu like the regular
 * dashboard's UserMenu does. `variant`/`className` let callers restyle it
 * for the sidebar footer vs. a compact mobile header. */
export function AdminLogoutButton({
  variant = "outline",
  className,
}: {
  variant?: VariantProps<typeof buttonVariants>["variant"];
  className?: string;
}) {
  const router = useRouter();
  const logout = useAdminLogout();

  async function handleLogout() {
    await logout.mutateAsync();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <Button variant={variant} size="sm" className={cn(className)} onClick={handleLogout} disabled={logout.isPending}>
      <LogOut className="size-3.5" strokeWidth={1.75} />
      {logout.isPending ? "Logging out…" : "Log out"}
    </Button>
  );
}
