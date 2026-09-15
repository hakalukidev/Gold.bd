import { randomUUID } from "node:crypto";
import { pool } from "@/lib/db";
import * as sslcommerz from "./sslcommerz";
import type { PaymentInitResponse, PaymentStatus, PaymentStatusResponse } from "@/types";

/**
 * Owns persistence for this app's own SSLCommerz sessions (the
 * sslcommerz_payments table) — sslcommerz.ts only knows the gateway's HTTP
 * contract. Ported from gold_wallet/server's payment.service.js, trimmed to
 * this app's single use case (guest order checkout, no wallet crediting).
 */

interface Customer {
  name: string;
  email?: string;
  phone: string;
  address?: string;
}

interface InitPaymentParams {
  orderId: string;
  amountBDT: number;
  currency: string;
  customer: Customer;
  returnBaseUrl: string;
  metadata: Record<string, unknown>;
}

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export { HttpError };

/** Only this app's own origin is ever a legitimate redirect target — an
 * unchecked returnBaseUrl would be an open redirect. */
function assertAllowedReturnUrl(returnBaseUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(returnBaseUrl);
  } catch {
    throw new HttpError(400, "Invalid returnBaseUrl");
  }
  const allowedOrigin = new URL(process.env.APP_BASE_URL!).origin;
  if (parsed.origin !== allowedOrigin) {
    throw new HttpError(400, "returnBaseUrl is not an allowed origin");
  }
  return returnBaseUrl.replace(/\/+$/, "");
}

function callbackUrl(path: string): string {
  return `${process.env.APP_BASE_URL!.replace(/\/+$/, "")}${path}`;
}

interface PaymentRow {
  tran_id: string;
  order_id: string;
  amount_bdt: string;
  currency: string;
  status: PaymentStatus;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  return_base_url: string;
  metadata: Record<string, unknown>;
  val_id: string | null;
  card_type: string | null;
  bank_tran_id: string | null;
  gateway_response: unknown;
}

function toStatusResponse(row: PaymentRow): PaymentStatusResponse {
  return {
    tranId: row.tran_id,
    purpose: "order",
    status: row.status,
    amountBDT: row.amount_bdt,
    currency: row.currency,
    metadata: row.metadata,
  };
}

async function findByTranId(tranId: string): Promise<PaymentRow | null> {
  const { rows } = await pool.query<PaymentRow>("SELECT * FROM sslcommerz_payments WHERE tran_id = $1", [tranId]);
  return rows[0] ?? null;
}

export async function initPayment({ orderId, amountBDT, currency, customer, returnBaseUrl, metadata }: InitPaymentParams): Promise<PaymentInitResponse> {
  const cleanReturnBaseUrl = assertAllowedReturnUrl(returnBaseUrl);
  const tranId = `GC-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 8).toUpperCase()}`;

  await pool.query(
    `INSERT INTO sslcommerz_payments
      (tran_id, order_id, amount_bdt, currency, customer_name, customer_email, customer_phone, customer_address, return_base_url, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [tranId, orderId, amountBDT, currency, customer.name, customer.email ?? null, customer.phone, customer.address ?? null, cleanReturnBaseUrl, metadata]
  );

  try {
    const { gatewayUrl } = await sslcommerz.initiateSession({
      tranId,
      amountBDT,
      currency,
      customer,
      productName: "Gold BD order",
      successUrl: callbackUrl("/api/payments/success"),
      failUrl: callbackUrl("/api/payments/fail"),
      cancelUrl: callbackUrl("/api/payments/cancel"),
      ipnUrl: callbackUrl("/api/payments/ipn"),
    });
    return { tranId, gatewayUrl };
  } catch (err) {
    console.error("Failed to start SSLCommerz session", { tranId, err });
    await pool.query("UPDATE sslcommerz_payments SET status = 'FAILED', gateway_response = $2, updated_at = now() WHERE tran_id = $1", [
      tranId,
      JSON.stringify({ error: String(err instanceof Error ? err.message : err) }),
    ]);
    throw new HttpError(502, "Payment gateway is unavailable, please try again");
  }
}

/** Re-validates against SSLCommerz's own validator (never the unauthenticated
 * callback/IPN body alone) before marking a payment VALID. Idempotent: a
 * payment already out of PENDING is returned as-is. */
export async function confirmTransaction(tranId: string, valId: string): Promise<PaymentRow> {
  const payment = await findByTranId(tranId);
  if (!payment) throw new HttpError(404, "Unknown transaction");
  if (payment.status !== "PENDING") return payment;

  const result = await sslcommerz.validateTransaction(valId);
  const tranIdMatches = result.tran_id === tranId;
  const amountMatches = Math.abs(Number(result.amount) - Number(payment.amount_bdt)) < 0.01;
  const currencyMatches = result.currency === payment.currency;

  if (sslcommerz.VALID_STATUSES.has(result.status) && tranIdMatches && amountMatches && currencyMatches) {
    const { rows } = await pool.query<PaymentRow>(
      `UPDATE sslcommerz_payments SET status = 'VALID', val_id = $2, card_type = $3, bank_tran_id = $4, gateway_response = $5, updated_at = now()
       WHERE tran_id = $1 RETURNING *`,
      [tranId, valId, result.card_type ?? null, result.bank_tran_id ?? null, result]
    );
    return rows[0] ?? (await findByTranId(tranId))!;
  }

  console.warn("SSLCommerz validation did not confirm this transaction", { tranId, result });
  const { rows } = await pool.query<PaymentRow>(
    "UPDATE sslcommerz_payments SET status = 'FAILED', gateway_response = $2, updated_at = now() WHERE tran_id = $1 RETURNING *",
    [tranId, result]
  );
  return rows[0] ?? (await findByTranId(tranId))!;
}

/** fail/cancel callbacks carry no val_id to validate — just record the
 * terminal state SSLCommerz told us about (guarded against overwriting an
 * already-VALID row). */
export async function markTerminal(tranId: string, status: "FAILED" | "CANCELLED", gatewayResponse: unknown): Promise<PaymentRow> {
  const payment = await findByTranId(tranId);
  if (!payment) throw new HttpError(404, "Unknown transaction");
  if (payment.status !== "PENDING") return payment;
  const { rows } = await pool.query<PaymentRow>(
    "UPDATE sslcommerz_payments SET status = $2, gateway_response = $3, updated_at = now() WHERE tran_id = $1 RETURNING *",
    [tranId, status, gatewayResponse]
  );
  return rows[0] ?? (await findByTranId(tranId))!;
}

export async function getStatus(tranId: string): Promise<PaymentStatusResponse> {
  const payment = await findByTranId(tranId);
  if (!payment) throw new HttpError(404, "Unknown transaction");
  return toStatusResponse(payment);
}

export function toRedirectUrl(payment: PaymentRow): string {
  const STATUS_SEGMENT: Record<string, string> = { VALID: "success", FAILED: "fail", CANCELLED: "cancel" };
  const url = new URL(payment.return_base_url);
  url.pathname = `${url.pathname.replace(/\/+$/, "")}/${STATUS_SEGMENT[payment.status] || "fail"}`;
  url.searchParams.set("tran_id", payment.tran_id);
  return url.toString();
}
