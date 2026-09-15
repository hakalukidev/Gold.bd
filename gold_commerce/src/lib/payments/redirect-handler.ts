import { NextResponse } from "next/server";
import { confirmTransaction, markTerminal, toRedirectUrl } from "./sslcommerz-service";

/** success/fail/cancel are the browser's own full-page POST back from
 * SSLCommerz's hosted page — never trusted on their own (sslcommerz-service.ts
 * re-validates a VALID outcome against the gateway), just the trigger to
 * (re)confirm and then bounce the shopper back to /checkout/{success,fail,cancel}.
 * Ported from gold_wallet/server's payment.controller.js#makeRedirectHandler. */
export function makeRedirectHandler(outcome: "VALID" | "FAILED" | "CANCELLED") {
  return async function handler(request: Request): Promise<Response> {
    const contentType = request.headers.get("content-type") ?? "";
    const params = contentType.includes("form") ? await request.formData() : new URL(request.url).searchParams;
    const tranId = (params.get("tran_id") as string | null) ?? new URL(request.url).searchParams.get("tran_id");
    if (!tranId) return new NextResponse("Missing tran_id", { status: 400 });

    let payment;
    try {
      if (outcome === "VALID") {
        const valId = params.get("val_id") as string | null;
        payment = valId
          ? await confirmTransaction(tranId, valId)
          : await markTerminal(tranId, "FAILED", Object.fromEntries(params.entries?.() ?? []));
      } else {
        payment = await markTerminal(tranId, outcome, Object.fromEntries(params.entries?.() ?? []));
      }
    } catch (err) {
      console.error("Failed to resolve SSLCommerz redirect", { err, tranId });
      return new NextResponse("Unknown transaction", { status: 404 });
    }

    return NextResponse.redirect(toRedirectUrl(payment), 303);
  };
}

/** SSLCommerz posts here server-to-server once a transaction settles — the
 * one call in this flow that doesn't depend on the browser completing. */
export async function handleIpn(request: Request): Promise<Response> {
  const contentType = request.headers.get("content-type") ?? "";
  const params = contentType.includes("form") ? await request.formData() : new URL(request.url).searchParams;
  const tranId = params.get("tran_id") as string | null;
  const valId = params.get("val_id") as string | null;
  const status = params.get("status") as string | null;
  if (!tranId) return NextResponse.json({ success: false, error: "Missing tran_id" }, { status: 400 });

  if (status === "VALID" && valId) {
    await confirmTransaction(tranId, valId);
  } else {
    await markTerminal(tranId, "FAILED", Object.fromEntries(params.entries?.() ?? []));
  }
  return NextResponse.json({ success: true });
}
