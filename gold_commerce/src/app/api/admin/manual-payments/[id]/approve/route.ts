import { NextResponse } from "next/server";
import { requireAdmin, getAdminEmail } from "@/lib/require-admin";
import { approveManualPayment, HttpError } from "@/lib/payments/manual-payments-service";
import type { AdminManualPayment, ApiResponse } from "@/types";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  try {
    const data = await approveManualPayment(id, await getAdminEmail());
    const body: ApiResponse<AdminManualPayment> = { success: true, data };
    return NextResponse.json(body);
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    const body: ApiResponse<never> = { success: false, error: err instanceof Error ? err.message : "Could not approve this payment" };
    return NextResponse.json(body, { status });
  }
}
