const asyncHandler = require("../../utils/async-handler");
const HttpError = require("../../utils/http-error");
const logger = require("../../utils/logger");
const paymentService = require("./payment.service");

/** deposit is the only purpose that credits a wallet, so it's the only one
 * that requires a signed-in caller — a commerce order stays guest checkout. */
const initPayment = asyncHandler(async (req, res) => {
  const { source, purpose, amount, currency, customer, returnBaseUrl, metadata } = req.body;

  if (purpose === "deposit" && !req.userId) {
    throw new HttpError(401, "Sign in to add money to your wallet");
  }

  const { tranId, gatewayUrl } = await paymentService.initPayment({
    sourceApp: source,
    purpose,
    userId: purpose === "deposit" ? req.userId : null,
    amountBDT: amount,
    currency,
    customer,
    returnBaseUrl,
    metadata,
  });

  res.status(200).json({ success: true, data: { tranId, gatewayUrl } });
});

const getStatus = asyncHandler(async (req, res) => {
  const payment = await paymentService.getStatus(req.params.tranId);
  res.json({
    success: true,
    data: {
      tranId: payment.tranId,
      purpose: payment.purpose,
      status: payment.status,
      amountBDT: payment.amountBDT,
      currency: payment.currency,
      metadata: payment.metadata,
    },
  });
});

/** SSLCommerz posts here server-to-server once a transaction settles — the
 * one call in this flow we don't depend on the browser completing. */
const handleIpn = asyncHandler(async (req, res) => {
  const { tran_id: tranId, val_id: valId, status } = req.body;
  if (!tranId) return res.status(400).json({ success: false, error: "Missing tran_id" });

  if (status === "VALID" && valId) {
    await paymentService.confirmTransaction(tranId, valId);
  } else {
    await paymentService.markTerminal(tranId, "FAILED", req.body);
  }
  res.status(200).json({ success: true });
});

/** success/fail/cancel are the browser's own full-page POST back from
 * SSLCommerz's hosted page — never trusted on their own (see
 * payment.service.js), just the trigger to (re)validate and then bounce the
 * shopper back to whichever frontend started the session. */
function makeRedirectHandler(outcome) {
  return asyncHandler(async (req, res) => {
    const tranId = req.body.tran_id || req.query.tran_id;
    if (!tranId) return res.status(400).send("Missing tran_id");

    let payment;
    try {
      if (outcome === "VALID") {
        const valId = req.body.val_id || req.query.val_id;
        payment = valId
          ? await paymentService.confirmTransaction(tranId, valId)
          : await paymentService.markTerminal(tranId, "FAILED", req.body);
      } else {
        payment = await paymentService.markTerminal(tranId, outcome, req.body);
      }
    } catch (err) {
      logger.error({ err, tranId }, "Failed to resolve SSLCommerz redirect");
      return res.status(404).send("Unknown transaction");
    }

    const STATUS_SEGMENT = { VALID: "success", FAILED: "fail", CANCELLED: "cancel" };
    const url = new URL(payment.returnBaseUrl);
    url.pathname = `${url.pathname.replace(/\/+$/, "")}/${STATUS_SEGMENT[payment.status] || "fail"}`;
    url.searchParams.set("tran_id", payment.tranId);
    res.redirect(303, url.toString());
  });
}

module.exports = {
  initPayment,
  getStatus,
  handleIpn,
  handleSuccess: makeRedirectHandler("VALID"),
  handleFail: makeRedirectHandler("FAILED"),
  handleCancel: makeRedirectHandler("CANCELLED"),
};
