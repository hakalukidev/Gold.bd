import { NextResponse } from "next/server";
import { siteSettingsSchema } from "@/lib/validations/settings";
import { updateSiteSettings } from "@/lib/mock-settings";
import type { ApiResponse, SiteSettings } from "@/types";

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = siteSettingsSchema.safeParse(json);
  if (!parsed.success) {
    const body: ApiResponse<never> = {
      success: false,
      error: "Invalid settings",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
    return NextResponse.json(body, { status: 400 });
  }

  const updated = updateSiteSettings(parsed.data);
  const body: ApiResponse<SiteSettings> = { success: true, data: updated };
  return NextResponse.json(body);
}
