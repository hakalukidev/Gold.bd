import { NextResponse } from "next/server";
import { getLatestRate } from "@/lib/mock-rates";
import type { ApiResponse, MetalRateSummary } from "@/types";

export async function GET() {
  const body: ApiResponse<MetalRateSummary> = { success: true, data: getLatestRate("silver") };
  return NextResponse.json(body);
}
