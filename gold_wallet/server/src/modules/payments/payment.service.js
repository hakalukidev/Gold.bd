const env = require("../../config/env");
const HttpError = require("../../utils/http-error");
const logger = require("../../utils/logger");
const paymentRepo = require("../../repositories/payment.repository");
const walletRepo = require("../../repositories/wallet.repository");
const withTransaction = require("../../db/with-transaction");
const sslcommerz = require("./sslcommerz.service");

const PRODUCT_NAME = { order: "Gold.bd order", deposit: "Gold.bd Wallet top-up" };

/** Rejects a returnBaseUrl outside the allow-listed frontend origins — this
 * URL drives where we 302 the browser back to once SSLCommerz resolves, so
 * an unchecked one would be an open redirect. */
function assertAllowedReturnUrl(returnBaseUrl) {
  let parsed;
  try {
    parsed = new URL(returnBaseUrl);
  } catch {
    throw new HttpError(400, "Invalid returnBaseUrl");
  }
  if (!env.CORS_ORIGINS.includes(parsed.origin)) {
    throw new HttpError(400, "returnBaseUrl is not an allowed origin");
  }
  return returnBaseUrl.replace(/\/+$/, "");
}

function callbackUrl(path) {
  return `${env.APP_BASE_URL.replace(/\/+$/, "")}${path}`;
}

async function initPayment({ sourceApp, purpose, userId, amountBDT, currency, customer, returnBaseUrl, metadata }) {
  const cleanReturnBaseUrl = assertAllowedReturnUrl(returnBaseUrl);

  const payment = await paymentRepo.create({
    sourceApp,
    purpose,
    userId,
    amountBDT,
    currency,
    customer,
    returnBaseUrl: cleanReturnBaseUrl,
    metadata,
  });

  try {
    const { gatewayUrl } = await sslcommerz.initiateSession({
      tranId: payment.tranId,
      amountBDT,
      currency,
      customer,
      productName: PRODUCT_NAME[purpose],
      successUrl: callbackUrl("/api/payments/success"),
      failUrl: callbackUrl("/api/payments/fail"),
      cancelUrl: callbackUrl("/api/payments/cancel"),
      ipnUrl: callbackUrl("/api/payments/ipn"),
    });
    return { tranId: payment.tranId, gatewayUrl };
  } catch (err) {
    logger.error({ err, tranId: payment.tranId }, "Failed to start SSLCommerz session");
    await paymentRepo.updateStatus(payment.tranId, { status: "FAILED", gatewayResponse: { error: String(err.message || err) } });
    throw new HttpError(502, "Payment gateway is unavailable, please try again");
  }
}

/**
 * Re-validates a transaction against SSLCommerz's own validator (never the
 * unauthenticated callback/IPN body alone) and, only if the tran_id, currency
 * and amount all match what we charged, marks the payment VALID. Idempotent:
 * a payment already out of PENDING is returned as-is.
 */
async function confirmTransaction(tranId, valId) {
  const payment = await paymentRepo.findByTranId(tranId);
  if (!payment) throw new HttpError(404, "Unknown transaction");
  if (payment.status !== "PENDING") return payment;

  const result = await sslcommerz.validateTransaction(valId);
  // A val_id only proves *some* transaction settled — without also pinning it
  // to this tran_id, a val_id from any other (even a legitimately paid,
  // unrelated) transaction of the same amount/currency could be replayed
  // here to confirm a payment nobody actually paid for. Store scoping is
  // already handled one layer down: validateTransaction() authenticates the
  // validator call itself with our store_id/store_passwd, so SSLCommerz only
  // ever returns a val_id that belongs to this store. There is no store_id
  // field in the validator's response to double-check against here — it
  // simply isn't part of that API's payload (confirmed against real sandbox
  // responses), so checking for one here always evaluated to false and
  // marked every genuinely paid transaction FAILED.
  const tranIdMatches = result.tran_id === tranId;
  const amountMatches = Math.abs(Number(result.amount) - Number(payment.amountBDT)) < 0.01;
  const currencyMatches = result.currency === payment.currency;

  if (sslcommerz.VALID_STATUSES.has(result.status) && tranIdMatches && amountMatches && currencyMatches) {
    // One transaction: a deposit's credit must land together with the status
    // flip that earns it, never one without the other.
    const updated = await withTransaction(async (client) => {
      const settled = await paymentRepo.updateStatus(
        tranId,
        { status: "VALID", valId, cardType: result.card_type, bankTranId: result.bank_tran_id, gatewayResponse: result },
        client
      );
      // null means another concurrent call (e.g. the IPN racing the browser's
      // own success redirect) already moved this row out of PENDING first —
      // that caller is the one crediting the wallet, so skip it here.
      if (settled && settled.purpose === "deposit" && settled.userId) {
        await walletRepo.creditCash(settled.userId, settled.amountBDT, client);
      }
      return settled;
    });
    return updated || paymentRepo.findByTranId(tranId);
  }

  logger.warn({ tranId, result }, "SSLCommerz validation did not confirm this transaction");
  const updated = await paymentRepo.updateStatus(tranId, { status: "FAILED", gatewayResponse: result });
  return updated || paymentRepo.findByTranId(tranId);
}

/** fail/cancel callbacks carry no val_id to validate — nothing to confirm
 * with the gateway, so these just record the terminal state SSLCommerz told
 * us about (still guarded against overwriting an already-VALID row). */
async function markTerminal(tranId, status, gatewayResponse) {
  const payment = await paymentRepo.findByTranId(tranId);
  if (!payment) throw new HttpError(404, "Unknown transaction");
  if (payment.status !== "PENDING") return payment;
  const updated = await paymentRepo.updateStatus(tranId, { status, gatewayResponse });
  return updated || paymentRepo.findByTranId(tranId);
}

async function getStatus(tranId) {
  const payment = await paymentRepo.findByTranId(tranId);
  if (!payment) throw new HttpError(404, "Unknown transaction");
  return payment;
}

module.exports = { initPayment, confirmTransaction, markTerminal, getStatus };
