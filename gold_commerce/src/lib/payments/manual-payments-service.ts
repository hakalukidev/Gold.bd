import { randomUUID } from "node:crypto";
import { pool } from "@/lib/db";
import { sendSms } from "@/lib/sms";
import type { AdminManualPayment, ManualPaymentMethod, ManualPaymentStatus, ManualPaymentStatusResponse } from "@/types";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface ManualPaymentRow {
  id: string;
  order_id: string;
  method: ManualPaymentMethod;
  amount_bdt: string;
  currency: string;
  status: ManualPaymentStatus;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  sender_number: string | null;
  transaction_id: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  bank_name: string | null;
  bank_branch: string | null;
  proof_image_path: string | null;
  decline_reason: string | null;
  created_at: string;
}

interface CreateManualPaymentInput {
  orderId: string;
  method: ManualPaymentMethod;
  amountBDT: number;
  currency: string;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  senderNumber?: string;
  transactionId?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  bankName?: string;
  bankBranch?: string;
  proofImagePath?: string;
  metadata: Record<string, unknown>;
}

export async function createManualPayment(input: CreateManualPaymentInput): Promise<{ id: string; orderId: string }> {
  const id = randomUUID();
  await pool.query(
    `INSERT INTO manual_payments
      (id, order_id, method, amount_bdt, currency, customer_name, customer_email, customer_phone,
       sender_number, transaction_id, bank_account_number, bank_account_name, bank_name, bank_branch,
       proof_image_path, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
    [
      id,
      input.orderId,
      input.method,
      input.amountBDT,
      input.currency,
      input.customerName,
      input.customerEmail ?? null,
      input.customerPhone,
      input.senderNumber ?? null,
      input.transactionId ?? null,
      input.bankAccountNumber ?? null,
      input.bankAccountName ?? null,
      input.bankName ?? null,
      input.bankBranch ?? null,
      input.proofImagePath ?? null,
      input.metadata,
    ]
  );
  return { id, orderId: input.orderId };
}

async function findById(id: string): Promise<ManualPaymentRow | null> {
  const { rows } = await pool.query<ManualPaymentRow>("SELECT * FROM manual_payments WHERE id = $1", [id]);
  return rows[0] ?? null;
}

export async function getManualPaymentStatus(id: string): Promise<ManualPaymentStatusResponse> {
  const row = await findById(id);
  if (!row) throw new HttpError(404, "Unknown payment reference");
  return {
    id: row.id,
    orderId: row.order_id,
    method: row.method,
    status: row.status,
    amountBDT: row.amount_bdt,
    declineReason: row.decline_reason,
  };
}

export async function getProofImagePath(id: string): Promise<string | null> {
  const row = await findById(id);
  if (!row) throw new HttpError(404, "Unknown payment reference");
  return row.proof_image_path;
}

function toAdminSummary(row: ManualPaymentRow): AdminManualPayment {
  return {
    id: row.id,
    orderId: row.order_id,
    method: row.method,
    status: row.status,
    amountBDT: row.amount_bdt,
    currency: row.currency,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    senderNumber: row.sender_number,
    transactionId: row.transaction_id,
    bankAccountNumber: row.bank_account_number,
    bankAccountName: row.bank_account_name,
    bankName: row.bank_name,
    bankBranch: row.bank_branch,
    hasProofImage: Boolean(row.proof_image_path),
    declineReason: row.decline_reason,
    createdAt: row.created_at,
  };
}

export async function listManualPayments(status?: string): Promise<AdminManualPayment[]> {
  const { rows } = status
    ? await pool.query<ManualPaymentRow>("SELECT * FROM manual_payments WHERE status = $1 ORDER BY created_at DESC", [status])
    : await pool.query<ManualPaymentRow>("SELECT * FROM manual_payments ORDER BY created_at DESC");
  return rows.map(toAdminSummary);
}

async function updateStatus(id: string, status: "APPROVED" | "DECLINED", reviewedBy: string, declineReason?: string): Promise<ManualPaymentRow> {
  const row = await findById(id);
  if (!row) throw new HttpError(404, "Unknown payment reference");
  if (row.status !== "PENDING") throw new HttpError(409, "This payment has already been reviewed");

  const { rows } = await pool.query<ManualPaymentRow>(
    `UPDATE manual_payments SET status = $2, reviewed_by = $3, reviewed_at = now(), decline_reason = $4 WHERE id = $1 RETURNING *`,
    [id, status, reviewedBy, declineReason ?? null]
  );
  return rows[0];
}

export async function approveManualPayment(id: string, reviewedBy: string): Promise<AdminManualPayment> {
  const row = await updateStatus(id, "APPROVED", reviewedBy);
  await sendSms(row.customer_phone, `Gold BD: Your payment for order ${row.order_id} has been confirmed. Thank you for shopping with us!`);
  return toAdminSummary(row);
}

export async function declineManualPayment(id: string, reviewedBy: string, reason: string): Promise<AdminManualPayment> {
  const row = await updateStatus(id, "DECLINED", reviewedBy, reason);
  await sendSms(row.customer_phone, `Gold BD: We could not verify your payment for order ${row.order_id}. Reason: ${reason}. Please contact support.`);
  return toAdminSummary(row);
}
