import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { getAllPaymentMethodSettings, upsertPaymentMethodSettings } from "@/lib/payments/payment-method-settings-service";
import { paymentMethodDetailsSchema } from "@/lib/validations/payments";
import type { ApiResponse, PaymentMethodSettings } from "@/types";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const data = await getAllPaymentMethodSettings();
  const body: ApiResponse<PaymentMethodSettings> = { success: true, data };
  return NextResponse.json(body);
}

/** Admin sets/updates the bKash/Nagad/bank receiving-account details shown
 * to shoppers in the checkout modals. One method per request. */
export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const json = await request.json();
  const parsed = paymentMethodDetailsSchema.safeParse(json);
  if (!parsed.success) {
    const body: ApiResponse<never> = { success: false, error: "Invalid payment method details", fieldErrors: parsed.error.flatten().fieldErrors };
    return NextResponse.json(body, { status: 400 });
  }

  await upsertPaymentMethodSettings(parsed.data.method, parsed.data.details);
  const data = await getAllPaymentMethodSettings();
  const body: ApiResponse<PaymentMethodSettings> = { success: true, data };
  return NextResponse.json(body);
}
