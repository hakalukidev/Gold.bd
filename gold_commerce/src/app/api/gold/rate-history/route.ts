import { NextResponse } from "next/server";
import { getRateHistory } from "@/lib/mock-rates";
import type { ApiResponse, MetalRateSummary } from "@/types";

export async function GET() {
  const body: ApiResponse<MetalRateSummary[]> = { success: true, data: getRateHistory("gold") };
  return NextResponse.json(body);
}
