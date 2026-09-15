import { NextResponse } from "next/server";
import { getManualPaymentStatus, HttpError } from "@/lib/payments/manual-payments-service";
import type { ApiResponse, ManualPaymentStatusResponse } from "@/types";

/** Public — the pending page polls this by the unguessable id it got back
 * from POST /api/manual-payments, same trust model as an SSLCommerz tranId. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const data = await getManualPaymentStatus(id);
    const body: ApiResponse<ManualPaymentStatusResponse> = { success: true, data };
    return NextResponse.json(body);
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    const message = err instanceof Error ? err.message : "Could not look up this payment";
    const body: ApiResponse<never> = { success: false, error: message };
    return NextResponse.json(body, { status });
  }
}
