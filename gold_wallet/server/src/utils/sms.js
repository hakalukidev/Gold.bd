const env = require("../config/env");
const logger = require("./logger");
const HttpError = require("./http-error");

/** BulkSMSBD expects the destination as 88 + the 11-digit local number, no "+". */
function toBulkSmsNumber(localPhone) {
  return `88${localPhone}`;
}

/** BulkSMSBD's only success code; everything else is a rejection. */
const BULKSMSBD_ACCEPTED = 202;

/**
 * BulkSMSBD answers HTTP 200 even when it refuses to send — the real verdict
 * is the `response_code` in the body, e.g.
 *   {"response_code":1032,...,"error_message":"Your ip ... not Whitelisted..."}
 * so a rejection (unwhitelisted IP, wrong sender ID, no balance) would
 * otherwise be logged as a successful send while no SMS ever arrives.
 * An unrecognised body shape is left alone rather than assumed broken.
 */
function assertAccepted(body) {
  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    logger.warn({ gatewayResponse: body }, "Unrecognised BulkSMSBD response — treating as sent");
    return;
  }

  const code = Number(payload?.response_code);
  if (!Number.isFinite(code) || code === BULKSMSBD_ACCEPTED) return;
  throw new Error(`BulkSMSBD rejected the message (code ${code}): ${payload.error_message || body}`);
}

/**
 * Sends an SMS via BulkSMSBD (http://bulksmsbd.net/api/smsapi). Outside
 * production this is a no-op that logs the message instead — local
 * development and tests never need live SMS credentials or spend real
 * credits, but the same code path runs for real once NODE_ENV=production.
 * Note: flipping to NODE_ENV=production also flips the refresh-token cookie
 * to secure-only (see auth.controller.js), which needs HTTPS to work.
 */
async function sendSms(localPhone, message) {
  if (env.NODE_ENV !== "production") {
    logger.info({ phone: localPhone, message }, "[dev] SMS not sent — logging instead");
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.BULKSMSBD_TIMEOUT_MS);

  // BulkSMSBD takes its parameters on the query string (GET or POST alike),
  // not a JSON body — see http://bulksmsbd.net/api/smsapi?api_key=...&type=text&number=...&senderid=...&message=...
  const params = new URLSearchParams({
    api_key: env.BULKSMSBD_API_KEY,
    type: "text",
    number: toBulkSmsNumber(localPhone),
    senderid: env.BULKSMSBD_SENDER_ID,
    message,
  });

  try {
    const response = await fetch(`${env.BULKSMSBD_API_URL}?${params.toString()}`, {
      method: "GET",
      signal: controller.signal,
    });

    const body = await response.text();
    if (!response.ok) {
      throw new Error(`BulkSMSBD responded with HTTP ${response.status}: ${body}`);
    }
    assertAccepted(body);
    logger.info({ phone: localPhone, gatewayResponse: body }, "SMS sent via BulkSMSBD");
  } catch (err) {
    logger.error({ err, phone: localPhone }, "Failed to send SMS via BulkSMSBD");
    throw new HttpError(502, "Failed to send verification code. Please try again shortly.");
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { sendSms };
