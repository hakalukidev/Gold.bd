/**
 * Thin wrapper around SSLCommerz's REST API — sandbox by default
 * (SSLCOMMERZ_API_URL / SSLCOMMERZ_VALIDATION_URL), live only once
 * SSLCOMMERZ_IS_LIVE is flipped and the URLs are pointed at
 * securepay.sslcommerz.com. Ported from gold_wallet/server's
 * src/modules/payments/sslcommerz.service.js — this app's own independent
 * copy, own credentials, no dependency on gold_wallet at runtime. Nothing
 * here talks to Postgres; sslcommerz-service.ts owns persistence.
 */

interface Customer {
  name: string;
  email?: string;
  address?: string;
  phone: string;
}

interface InitiateSessionParams {
  tranId: string;
  amountBDT: number;
  currency: string;
  customer: Customer;
  productName: string;
  successUrl: string;
  failUrl: string;
  cancelUrl: string;
  ipnUrl: string;
}

export async function initiateSession({
  tranId,
  amountBDT,
  currency,
  customer,
  productName,
  successUrl,
  failUrl,
  cancelUrl,
  ipnUrl,
}: InitiateSessionParams): Promise<{ gatewayUrl: string; sessionKey: string }> {
  const body = new URLSearchParams({
    store_id: process.env.SSLCOMMERZ_STORE_ID ?? "",
    store_passwd: process.env.SSLCOMMERZ_STORE_PASSWORD ?? "",
    total_amount: amountBDT.toFixed(2),
    currency,
    tran_id: tranId,
    success_url: successUrl,
    fail_url: failUrl,
    cancel_url: cancelUrl,
    ipn_url: ipnUrl,
    shipping_method: "NO",
    product_name: productName,
    product_category: "General",
    product_profile: "general",
    cus_name: customer.name,
    cus_email: customer.email || "no-reply@goldbd.com",
    cus_add1: customer.address || "N/A",
    cus_city: "Dhaka",
    cus_country: "Bangladesh",
    cus_phone: customer.phone,
  });

  const res = await fetch(process.env.SSLCOMMERZ_API_URL!, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) throw new Error(`SSLCommerz init responded with HTTP ${res.status}`);
  const data = await res.json();

  if (data.status !== "SUCCESS" || !data.GatewayPageURL) {
    console.error("SSLCommerz session init failed", { tranId, response: data });
    throw new Error(data.failedreason || "Could not start the payment session");
  }

  return { gatewayUrl: data.GatewayPageURL, sessionKey: data.sessionkey };
}

/**
 * Server-to-server confirmation of a transaction against SSLCommerz's
 * validator — never trust a val_id/amount/status that only arrived via the
 * browser (success callback) or an unauthenticated IPN post without this
 * check, since either can be replayed or forged.
 */
export async function validateTransaction(valId: string) {
  const url = new URL(process.env.SSLCOMMERZ_VALIDATION_URL!);
  url.searchParams.set("val_id", valId);
  url.searchParams.set("store_id", process.env.SSLCOMMERZ_STORE_ID ?? "");
  url.searchParams.set("store_passwd", process.env.SSLCOMMERZ_STORE_PASSWORD ?? "");
  url.searchParams.set("v", "1");
  url.searchParams.set("format", "json");

  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`SSLCommerz validation responded with HTTP ${res.status}`);
  return res.json();
}

/** SSLCommerz reports a genuinely completed payment as either of these. */
export const VALID_STATUSES = new Set(["VALID", "VALIDATED"]);
