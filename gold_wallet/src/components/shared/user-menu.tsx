"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { IdCard, LogOut, User, Wallet } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMe, useLogout } from "@/hooks/use-auth";
import { MOCK_USER } from "@/lib/mock-user";

/** First letter of the name — "Robiul Islam Robin" → "R". */
function initial(name: string) {
  return (name.trim()[0] ?? "?").toUpperCase();
}

const MENU_LINKS = [
  { href: "/profile", label: "Profile", icon: User },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/kyc", label: "Verify Account", icon: IdCard },
];

/** Avatar + account dropdown in the dashboard top bar. `useMe()` has no
 * backend behind this app, so it falls back to MOCK_USER rather than rendering
 * an empty shell. */
export function UserMenu() {
  const router = useRouter();
  const { data } = useMe();
  const logout = useLogout();
  const user = data ?? MOCK_USER;

  async function handleLogout() {
    await logout.mutateAsync();
    router.push("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <span className="hidden text-sm font-medium sm:inline">{user.fullName}</span>
        <Avatar>
          <AvatarFallback className="bg-gold/10 font-semibold text-gold">
            {initial(user.fullName)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="font-medium">{user.fullName}</span>
          <span className="text-xs font-normal text-muted-foreground">{user.phone}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {MENU_LINKS.map(({ href, label, icon: Icon }) => (
          <DropdownMenuItem key={href} render={<Link href={href} />}>
            <Icon strokeWidth={1.75} />
            {label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleLogout} disabled={logout.isPending}>
          <LogOut strokeWidth={1.75} />
          {logout.isPending ? "Logging out…" : "Log out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
