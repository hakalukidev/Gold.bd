import { NextResponse } from "next/server";
import { getStatus, HttpError } from "@/lib/payments/sslcommerz-service";
import type { ApiResponse, PaymentStatusResponse } from "@/types";

/** Lets checkout/[status]/page.tsx confirm what actually happened to a
 * transaction from this app's own sslcommerz_payments table, instead of
 * trusting the query string SSLCommerz's redirect landed the shopper on. */
export async function GET(_request: Request, { params }: { params: Promise<{ tranId: string }> }) {
  const { tranId } = await params;
  try {
    const data = await getStatus(tranId);
    const body: ApiResponse<PaymentStatusResponse> = { success: true, data };
    return NextResponse.json(body);
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    const message = err instanceof Error ? err.message : "Could not look up this transaction";
    const body: ApiResponse<never> = { success: false, error: message };
    return NextResponse.json(body, { status });
  }
}
