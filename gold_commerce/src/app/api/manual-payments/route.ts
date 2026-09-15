import { NextResponse } from "next/server";
import {
  manualPaymentCustomerSchema,
  bkashNagadPaymentSchema,
  bankTransferPaymentSchema,
} from "@/lib/validations/payments";
import { createManualPayment } from "@/lib/payments/manual-payments-service";
import { saveProofImage } from "@/lib/payments/proof-storage";
import type { ApiResponse, ManualPaymentInitResponse, ManualPaymentMethod } from "@/types";

const METHODS: ManualPaymentMethod[] = ["bkash", "nagad", "bank"];

function fail(error: string, status: number, fieldErrors?: Record<string, string[]>) {
  const body: ApiResponse<never> = { success: false, error, fieldErrors };
  return NextResponse.json(body, { status });
}

/** Public — a shopper submits their bKash/Nagad TrxID or bank transfer proof
 * here. Always multipart/form-data (even for bkash/nagad, which have no
 * file) so one route handles all three methods uniformly. Lands as a
 * PENDING row for an admin to approve/decline from /admin/payments. */
export async function POST(request: Request) {
  const formData = await request.formData();
  const method = formData.get("method");
  if (typeof method !== "string" || !METHODS.includes(method as ManualPaymentMethod)) {
    return fail("Invalid payment method", 400);
  }

  const customerParsed = manualPaymentCustomerSchema.safeParse({
    orderId: formData.get("orderId"),
    amount: formData.get("amount"),
    currency: formData.get("currency") ?? "BDT",
    name: formData.get("name"),
    email: formData.get("email") || undefined,
    phone: formData.get("phone"),
    metadata: formData.get("metadata") ?? undefined,
  });
  if (!customerParsed.success) {
    return fail("Invalid order details", 400, customerParsed.error.flatten().fieldErrors);
  }
  const customer = customerParsed.data;

  let metadata: Record<string, unknown> = {};
  if (customer.metadata) {
    try {
      metadata = JSON.parse(customer.metadata);
    } catch {
      return fail("Invalid metadata", 400);
    }
  }

  if (method === "bkash" || method === "nagad") {
    const parsed = bkashNagadPaymentSchema.safeParse({
      senderNumber: formData.get("senderNumber"),
      transactionId: formData.get("transactionId"),
    });
    if (!parsed.success) return fail("Invalid payment details", 400, parsed.error.flatten().fieldErrors);

    const result = await createManualPayment({
      orderId: customer.orderId,
      method,
      amountBDT: customer.amount,
      currency: customer.currency,
      customerName: customer.name,
      customerEmail: customer.email || undefined,
      customerPhone: customer.phone,
      senderNumber: parsed.data.senderNumber,
      transactionId: parsed.data.transactionId,
      metadata,
    });
    const body: ApiResponse<ManualPaymentInitResponse> = { success: true, data: result };
    return NextResponse.json(body);
  }

  // Bank transfer — proof image is required.
  const parsed = bankTransferPaymentSchema.safeParse({
    bankAccountNumber: formData.get("bankAccountNumber"),
    bankAccountName: formData.get("bankAccountName"),
    bankName: formData.get("bankName"),
    bankBranch: formData.get("bankBranch"),
  });
  if (!parsed.success) return fail("Invalid bank details", 400, parsed.error.flatten().fieldErrors);

  const proofFile = formData.get("proofImage");
  if (!(proofFile instanceof File) || proofFile.size === 0) {
    return fail("Upload a photo of your payment proof", 400, { proofImage: ["Upload a photo of your payment proof"] });
  }

  let proofImagePath: string;
  try {
    proofImagePath = await saveProofImage(proofFile);
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Could not save the proof image", 400);
  }

  const result = await createManualPayment({
    orderId: customer.orderId,
    method: "bank",
    amountBDT: customer.amount,
    currency: customer.currency,
    customerName: customer.name,
    customerEmail: customer.email || undefined,
    customerPhone: customer.phone,
    bankAccountNumber: parsed.data.bankAccountNumber,
    bankAccountName: parsed.data.bankAccountName,
    bankName: parsed.data.bankName,
    bankBranch: parsed.data.bankBranch,
    proofImagePath,
    metadata,
  });
  const body: ApiResponse<ManualPaymentInitResponse> = { success: true, data: result };
  return NextResponse.json(body);
}
