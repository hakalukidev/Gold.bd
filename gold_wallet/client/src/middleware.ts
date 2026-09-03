import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

// Auth pages that stay reachable without a session — everything else under
// the matcher below requires one. There's no real backend issuing this
// cookie yet (see src/lib/session.ts); it's set client-side once the OTP step
// completes and cleared on logout, which is enough to keep a signed-out user
// out of /wallet and friends without a real account system behind it.
const PUBLIC_PATHS = ["/login", "/register", "/verify-otp"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const signedIn = request.cookies.has(SESSION_COOKIE);
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  if (!signedIn && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (signedIn && isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/wallet";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Everything except static assets/images and the favicon — including "/"
  // and API routes, neither of which exist to exclude here today.
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)"],
};
