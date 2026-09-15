import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { getChargeSettings, updateChargeSettings } from "@/lib/charge-settings-repository";
import { chargeSettingsSchema } from "@/lib/validations/charges";
import type { ApiResponse, ChargeSettings } from "@/types";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const body: ApiResponse<ChargeSettings> = { success: true, data: await getChargeSettings() };
  return NextResponse.json(body);
}

/** POST /api/admin/charges — sets the platform charge % and VAT % applied on
 * top of the base gram price everywhere a product price is computed. Takes
 * effect immediately across the site, same as a manual rate override. */
export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const json = await request.json();
  const parsed = chargeSettingsSchema.safeParse(json);
  if (!parsed.success) {
    const body: ApiResponse<never> = {
      success: false,
      error: "Invalid charge settings",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
    return NextResponse.json(body, { status: 400 });
  }

  await updateChargeSettings(parsed.data);
  const body: ApiResponse<ChargeSettings> = { success: true, data: parsed.data };
  return NextResponse.json(body);
}
