"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IdCard, LogOut, User, Wallet } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMe, useLogout } from "@/hooks/use-auth";
import { clearSession } from "@/lib/session";
import { useTranslation } from "@/lib/i18n/use-translation";

function initial(name: string) {
  return (name.trim()[0] ?? "?").toUpperCase();
}

const MENU_LINKS = [
  { href: "/profile", labelKey: "nav.profile", icon: User },
  { href: "/wallet", labelKey: "nav.wallet", icon: Wallet },
  { href: "/kyc", labelKey: "nav.verifyAccount", icon: IdCard },
] as const;

/** Avatar + account dropdown in the dashboard top bar. Always mounted on
 * every dashboard page (via DashboardTopbar), so it also acts as this app's
 * auth guard: middleware only checks the long-lived `gb_session` cookie, not
 * whether a real access token/session still exists (see use-auth.ts), so a
 * stale cookie can otherwise leave a signed-out visitor sitting on a
 * dashboard page. Once the token check has run, no token (or a rejected one)
 * means "not really signed in" — clear the stale cookie and bounce to
 * /login instead of rendering anything. */
export function UserMenu() {
  const router = useRouter();
  const { data, isError, tokenChecked, hasToken } = useMe();
  const logout = useLogout();
  const { t } = useTranslation();

  useEffect(() => {
    if (tokenChecked && (!hasToken || isError)) {
      clearSession();
      router.replace("/login");
    }
  }, [tokenChecked, hasToken, isError, router]);

  async function handleLogout() {
    try {
      await logout.mutateAsync();
    } finally {
      clearSession();
      router.push("/login");
      router.refresh();
    }
  }

  if (!data) return null;
  const user = data;

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
        {/* Base UI's GroupLabel reads its id from a surrounding Group's context —
            rendering it outside one throws (MenuGroupContext is missing) and
            takes the whole menu down with it, including the "Log out" item. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="font-medium">{user.fullName}</span>
            <span className="text-xs font-normal text-muted-foreground">{user.phone}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {MENU_LINKS.map(({ href, labelKey, icon: Icon }) => (
          <DropdownMenuItem key={href} render={<Link href={href} />}>
            <Icon strokeWidth={1.75} />
            {t(labelKey)}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleLogout} disabled={logout.isPending}>
          <LogOut strokeWidth={1.75} />
          {logout.isPending ? t("userMenu.loggingOut") : t("userMenu.logOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
