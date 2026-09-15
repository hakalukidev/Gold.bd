import { NextResponse } from "next/server";
import { getAboutStats } from "@/lib/mock-stats";
import type { ApiResponse, AboutStats } from "@/types";

export async function GET() {
  const body: ApiResponse<AboutStats> = { success: true, data: getAboutStats() };
  return NextResponse.json(body);
}
