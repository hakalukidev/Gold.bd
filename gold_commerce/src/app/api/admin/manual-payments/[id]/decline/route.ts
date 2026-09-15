import { NextResponse } from "next/server";
import { requireAdmin, getAdminEmail } from "@/lib/require-admin";
import { declineManualPayment, HttpError } from "@/lib/payments/manual-payments-service";
import { declineManualPaymentSchema } from "@/lib/validations/payments";
import type { AdminManualPayment, ApiResponse } from "@/types";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const json = await request.json();
  const parsed = declineManualPaymentSchema.safeParse(json);
  if (!parsed.success) {
    const body: ApiResponse<never> = { success: false, error: "Enter a decline reason", fieldErrors: parsed.error.flatten().fieldErrors };
    return NextResponse.json(body, { status: 400 });
  }

  const { id } = await params;
  try {
    const data = await declineManualPayment(id, await getAdminEmail(), parsed.data.reason);
    const body: ApiResponse<AdminManualPayment> = { success: true, data };
    return NextResponse.json(body);
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    const body: ApiResponse<never> = { success: false, error: err instanceof Error ? err.message : "Could not decline this payment" };
    return NextResponse.json(body, { status });
  }
}
