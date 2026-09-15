import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-session";
import type { ApiResponse } from "@/types";

/** Guards a route handler that approves/declines a manual payment or edits
 * the receiving-account settings — real-money actions, so unlike the
 * pre-existing /api/admin/settings route these check the session cookie
 * themselves rather than relying only on the protected layout's UI gate. */
export async function requireAdmin(): Promise<NextResponse<ApiResponse<never>> | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE);
  if (!session) {
    const body: ApiResponse<never> = { success: false, error: "Not signed in" };
    return NextResponse.json(body, { status: 401 });
  }
  return null;
}

/** The signed-in admin's email (the cookie's value) — recorded as
 * `reviewed_by` on manual payment approvals/declines. Only call after
 * requireAdmin() has confirmed the cookie exists. */
export async function getAdminEmail(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_SESSION_COOKIE)?.value ?? "admin";
}
