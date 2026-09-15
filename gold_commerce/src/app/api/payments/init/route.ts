import { NextResponse } from "next/server";
import { initPaymentSchema } from "@/lib/validations/payments";
import { initPayment, HttpError } from "@/lib/payments/sslcommerz-service";
import type { ApiResponse, PaymentInitResponse } from "@/types";

/** Starts an SSLCommerz sandbox session for the "Other payment options" tile
 * — this app's own independent integration (src/lib/payments), no dependency
 * on gold_wallet's server. */
export async function POST(request: Request) {
  const json = await request.json();
  const parsed = initPaymentSchema.safeParse(json);
  if (!parsed.success) {
    const body: ApiResponse<never> = { success: false, error: "Invalid payment request", fieldErrors: parsed.error.flatten().fieldErrors };
    return NextResponse.json(body, { status: 400 });
  }

  try {
    const { orderId, amount, currency, customer, returnBaseUrl, metadata } = parsed.data;
    const result = await initPayment({ orderId, amountBDT: amount, currency, customer, returnBaseUrl, metadata });
    const body: ApiResponse<PaymentInitResponse> = { success: true, data: result };
    return NextResponse.json(body);
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 502;
    const message = err instanceof Error ? err.message : "Payment gateway is temporarily unavailable";
    const body: ApiResponse<never> = { success: false, error: message };
    return NextResponse.json(body, { status });
  }
}
