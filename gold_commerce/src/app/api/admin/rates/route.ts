import { NextResponse } from "next/server";
import { setMetalRateSchema } from "@/lib/validations/rates";
import { upsertRate, getManualHistory } from "@/lib/metal-rate-repository";
import { GRAMS_PER_BHORI } from "@/lib/bajus-scraper";
import type { AdminRateEntry, ApiResponse } from "@/types";

/** GET /api/admin/rates — every rate an admin has manually set (both
 * metals), newest first, for the "Rate history" table. */
export async function GET() {
  const body: ApiResponse<AdminRateEntry[]> = { success: true, data: await getManualHistory() };
  return NextResponse.json(body);
}

/** POST /api/admin/rates — manually set one (metal, karat)'s rate. Stamped
 * with source "manual" and effectiveAt = now, so it outranks today's bajus
 * sync (see metal-rate-repository.ts's upsertRate) and is what the
 * storefront shows until bajus.org's next daily reading. */
export async function POST(request: Request) {
  const json = await request.json();
  const parsed = setMetalRateSchema.safeParse(json);
  if (!parsed.success) {
    const body: ApiResponse<never> = {
      success: false,
      error: "Invalid rate",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
    return NextResponse.json(body, { status: 400 });
  }

  const { metal, karat, pricePerGramBDT } = parsed.data;
  const now = new Date();
  await upsertRate(
    metal,
    {
      karat,
      pricePerGramBDT: pricePerGramBDT.toFixed(4),
      pricePerBhoriBDT: (pricePerGramBDT * GRAMS_PER_BHORI).toFixed(2),
      effectiveAt: now,
      reportedAt: now,
    },
    "manual"
  );

  const body: ApiResponse<{ ok: true }> = { success: true, data: { ok: true } };
  return NextResponse.json(body);
}
