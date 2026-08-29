import { NextResponse } from "next/server";
import { getSiteSettings } from "@/lib/mock-settings";
import type { ApiResponse, SiteSettings } from "@/types";

export async function GET() {
  const body: ApiResponse<SiteSettings> = { success: true, data: getSiteSettings() };
  return NextResponse.json(body);
}
