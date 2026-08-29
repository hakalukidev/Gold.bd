import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { recordVisit } from "@/lib/mock-visitors";
import { VISITOR_COOKIE } from "@/lib/visitor-session";
import type { ApiResponse } from "@/types";

export async function POST() {
  const cookieStore = await cookies();
  let visitorId = cookieStore.get(VISITOR_COOKIE)?.value;
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    cookieStore.set(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 400, // ~400 days — the browser-enforced ceiling on cookie lifetime
    });
  }

  recordVisit(visitorId);

  const body: ApiResponse<null> = { success: true, data: null };
  return NextResponse.json(body);
}
