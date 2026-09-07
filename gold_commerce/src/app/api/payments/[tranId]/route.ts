import { proxyPayment } from "@/lib/wallet-payments-api";

/** Lets the checkout success/fail/cancel pages confirm what actually happened
 * to a transaction from wallet_server's payments table, instead of trusting
 * the query string SSLCommerz's redirect landed the shopper on. */
export async function GET(_request: Request, { params }: { params: Promise<{ tranId: string }> }) {
  const { tranId } = await params;
  return proxyPayment(`/api/payments/${encodeURIComponent(tranId)}`);
}
