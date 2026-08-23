import { NextResponse } from "next/server";
import { getVisitorStats, type VisitorStats } from "@/lib/mock-visitors";
import type { ApiResponse } from "@/types";

export async function GET() {
  const body: ApiResponse<VisitorStats> = { success: true, data: getVisitorStats() };
  return NextResponse.json(body);
}
