import { NextResponse } from "next/server";
import { getChargeSettings } from "@/lib/charge-settings-repository";
import type { ApiResponse, ChargeSettings } from "@/types";

/** GET /api/charges — public read of the platform charge % and VAT % so the
 * storefront can price products the same way the admin panel previews them. */
export async function GET() {
  const body: ApiResponse<ChargeSettings> = { success: true, data: await getChargeSettings() };
  return NextResponse.json(body);
}
