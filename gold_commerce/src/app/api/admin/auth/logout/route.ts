import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-session";
import type { ApiResponse } from "@/types";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);

  const body: ApiResponse<null> = { success: true, data: null };
  return NextResponse.json(body);
}
