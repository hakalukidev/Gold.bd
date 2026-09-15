/**
 * Sends an SMS via BulkSMSBD (http://bulksmsbd.net/api/smsapi) — same account
 * as gold_wallet/server's own sms.js, ported here as an independent module so
 * this app never needs gold_wallet's server reachable at runtime. Outside
 * production this is a no-op that logs the message instead — local
 * development never needs live SMS credentials or spends real credits.
 */

/** BulkSMSBD expects the destination as 88 + the 11-digit local number, no "+". */
function toBulkSmsNumber(localPhone: string): string {
  return `88${localPhone.replace(/^\+?88/, "")}`;
}

export async function sendSms(localPhone: string, message: string): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    console.log("[dev] SMS not sent — logging instead", { phone: localPhone, message });
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.BULKSMSBD_TIMEOUT_MS ?? 8000));

  const params = new URLSearchParams({
    api_key: process.env.BULKSMSBD_API_KEY ?? "",
    type: "text",
    number: toBulkSmsNumber(localPhone),
    senderid: process.env.BULKSMSBD_SENDER_ID ?? "",
    message,
  });

  try {
    const response = await fetch(`${process.env.BULKSMSBD_API_URL}?${params.toString()}`, {
      method: "GET",
      signal: controller.signal,
    });

    const body = await response.text();
    if (!response.ok) {
      throw new Error(`BulkSMSBD responded with HTTP ${response.status}: ${body}`);
    }
    console.log("SMS sent via BulkSMSBD", { phone: localPhone, gatewayResponse: body });
  } catch (err) {
    console.error("Failed to send SMS via BulkSMSBD", { err, phone: localPhone });
  } finally {
    clearTimeout(timeout);
  }
}
