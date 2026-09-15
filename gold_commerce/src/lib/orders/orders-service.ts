import { pool } from "@/lib/db";
import type { AdminOrder, OrderItem, OrderMethod, OrderStatus } from "@/types";

interface ManualPaymentOrderRow {
  id: string;
  order_id: string;
  method: OrderMethod;
  status: OrderStatus;
  amount_bdt: string;
  currency: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface SslcommerzOrderRow {
  tran_id: string;
  order_id: string;
  status: OrderStatus;
  amount_bdt: string;
  currency: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

function readItems(metadata: Record<string, unknown> | null): OrderItem[] {
  const raw = metadata?.items;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      id: String(item.id ?? ""),
      name: String(item.name ?? ""),
      quantity: Number(item.quantity ?? 0),
      unitPriceBDT: Number(item.unitPriceBDT ?? 0),
    }));
}

function readString(metadata: Record<string, unknown> | null, key: string): string | null {
  const value = metadata?.[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function fromManualPayment(row: ManualPaymentOrderRow): AdminOrder {
  return {
    id: row.id,
    orderId: row.order_id,
    source: "manual",
    method: row.method,
    status: row.status,
    amountBDT: row.amount_bdt,
    currency: row.currency,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    deliveryMethod: readString(row.metadata, "deliveryMethod"),
    address: readString(row.metadata, "address"),
    division: readString(row.metadata, "division"),
    district: readString(row.metadata, "district"),
    note: readString(row.metadata, "note"),
    items: readItems(row.metadata),
    createdAt: row.created_at,
  };
}

function fromSslcommerzPayment(row: SslcommerzOrderRow): AdminOrder {
  return {
    id: row.tran_id,
    orderId: row.order_id,
    source: "sslcommerz",
    method: "sslcommerz",
    status: row.status,
    amountBDT: row.amount_bdt,
    currency: row.currency,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    deliveryMethod: readString(row.metadata, "deliveryMethod"),
    address: row.customer_address ?? readString(row.metadata, "address"),
    division: readString(row.metadata, "division"),
    district: readString(row.metadata, "district"),
    note: readString(row.metadata, "note"),
    items: readItems(row.metadata),
    createdAt: row.created_at,
  };
}

/** Every gold_commerce checkout is a guest "order" — there's no separate
 * orders table, just manual_payments (bKash/Nagad/bank) and
 * sslcommerz_payments (gateway), both keyed by the same client-generated
 * orderId. This merges both into one list, newest first. */
export async function listOrders(): Promise<AdminOrder[]> {
  const [manual, sslcommerz] = await Promise.all([
    pool.query<ManualPaymentOrderRow>(
      "SELECT id, order_id, method, status, amount_bdt, currency, customer_name, customer_email, customer_phone, metadata, created_at FROM manual_payments"
    ),
    pool.query<SslcommerzOrderRow>(
      "SELECT tran_id, order_id, status, amount_bdt, currency, customer_name, customer_email, customer_phone, customer_address, metadata, created_at FROM sslcommerz_payments"
    ),
  ]);

  const orders = [...manual.rows.map(fromManualPayment), ...sslcommerz.rows.map(fromSslcommerzPayment)];
  orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return orders;
}
