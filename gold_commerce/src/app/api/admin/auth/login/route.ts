import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminLoginSchema } from "@/lib/validations/admin-auth";
import { verifyAdminCredentials } from "@/lib/mock-admin-auth";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-session";
import type { ApiResponse } from "@/types";

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = adminLoginSchema.safeParse(json);
  if (!parsed.success) {
    const body: ApiResponse<never> = {
      success: false,
      error: "Invalid email or password",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
    return NextResponse.json(body, { status: 400 });
  }

  const { email, password } = parsed.data;
  if (!verifyAdminCredentials(email, password)) {
    const body: ApiResponse<never> = { success: false, error: "Incorrect email or password" };
    return NextResponse.json(body, { status: 401 });
  }

  // The cookie value is the admin's email, not just a "1" flag — the sidebar
  // reads it server-side to show "Signed in as …" without a separate /me call.
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, email, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });

  const body: ApiResponse<{ email: string }> = { success: true, data: { email } };
  return NextResponse.json(body);
}
