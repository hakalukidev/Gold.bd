import { proxyPayment } from "@/lib/wallet-payments-api";

/** Starts an SSLCommerz session for a checkout order — forwards straight to
 * wallet_server's payments module, which owns the gateway credentials and the
 * payments table. `source: "commerce"` is stamped on server-side in
 * checkout/page.tsx, not trusted from anywhere else. */
export async function POST(request: Request) {
  const body = await request.text();
  return proxyPayment("/api/payments/init", { method: "POST", body });
}
