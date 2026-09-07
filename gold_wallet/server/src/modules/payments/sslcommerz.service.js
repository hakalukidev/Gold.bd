const env = require("../../config/env");
const logger = require("../../utils/logger");

/**
 * Thin wrapper around SSLCommerz's REST API — sandbox by default
 * (SSLCOMMERZ_API_URL / SSLCOMMERZ_VALIDATION_URL), live only once
 * SSLCOMMERZ_IS_LIVE is flipped and the URLs are pointed at
 * securepay.sslcommerz.com. Nothing here talks to Postgres; payment.service.js
 * owns persistence, this module only owns the gateway's own HTTP contract.
 */

/** POSTs the session-init request SSLCommerz's `/gwprocess/v4/api.php`
 * expects and returns the hosted checkout URL to redirect the browser to. */
async function initiateSession({ tranId, amountBDT, currency, customer, productName, successUrl, failUrl, cancelUrl, ipnUrl }) {
  const body = new URLSearchParams({
    store_id: env.SSLCOMMERZ_STORE_ID,
    store_passwd: env.SSLCOMMERZ_STORE_PASSWORD,
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
    cus_email: customer.email,
    cus_add1: customer.address || "N/A",
    cus_city: "Dhaka",
    cus_country: "Bangladesh",
    cus_phone: customer.phone,
  });

  const res = await fetch(env.SSLCOMMERZ_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) throw new Error(`SSLCommerz init responded with HTTP ${res.status}`);
  const data = await res.json();

  if (data.status !== "SUCCESS" || !data.GatewayPageURL) {
    logger.error({ tranId, response: data }, "SSLCommerz session init failed");
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
async function validateTransaction(valId) {
  const url = new URL(env.SSLCOMMERZ_VALIDATION_URL);
  url.searchParams.set("val_id", valId);
  url.searchParams.set("store_id", env.SSLCOMMERZ_STORE_ID);
  url.searchParams.set("store_passwd", env.SSLCOMMERZ_STORE_PASSWORD);
  url.searchParams.set("v", "1");
  url.searchParams.set("format", "json");

  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`SSLCommerz validation responded with HTTP ${res.status}`);
  return res.json();
}

/** SSLCommerz reports a genuinely completed payment as either of these. */
const VALID_STATUSES = new Set(["VALID", "VALIDATED"]);

module.exports = { initiateSession, validateTransaction, VALID_STATUSES };
