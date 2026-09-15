import { NextResponse } from "next/server";
import { aboutStatsSchema } from "@/lib/validations/stats";
import { updateAboutStats } from "@/lib/mock-stats";
import type { ApiResponse, AboutStats } from "@/types";

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = aboutStatsSchema.safeParse(json);
  if (!parsed.success) {
    const body: ApiResponse<never> = {
      success: false,
      error: "Invalid stats",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
    return NextResponse.json(body, { status: 400 });
  }

  const updated = updateAboutStats(parsed.data);
  const body: ApiResponse<AboutStats> = { success: true, data: updated };
  return NextResponse.json(body);
}
