import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { listManualPayments } from "@/lib/payments/manual-payments-service";
import type { AdminManualPayment, ApiResponse } from "@/types";

export async function GET(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const status = new URL(request.url).searchParams.get("status") ?? undefined;
  const data = await listManualPayments(status);
  const body: ApiResponse<AdminManualPayment[]> = { success: true, data };
  return NextResponse.json(body);
}
