import { NextResponse } from "next/server";
import { getAllPaymentMethodSettings } from "@/lib/payments/payment-method-settings-service";
import type { ApiResponse, PaymentMethodSettings } from "@/types";

/** Public — the checkout modals read these to show "send money to
 * 01XXXXXXXXX" / the receiving bank account, so no admin session required. */
export async function GET() {
  const data = await getAllPaymentMethodSettings();
  const body: ApiResponse<PaymentMethodSettings> = { success: true, data };
  return NextResponse.json(body);
}
