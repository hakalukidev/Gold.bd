import { pool } from "@/lib/db";
import type { BankDetails, BkashNagadDetails, ManualPaymentMethod, PaymentMethodSettings } from "@/types";

interface SettingsRow {
  method: ManualPaymentMethod;
  details: Record<string, unknown>;
  updated_at: string;
}

export async function getAllPaymentMethodSettings(): Promise<PaymentMethodSettings> {
  const { rows } = await pool.query<SettingsRow>("SELECT method, details, updated_at FROM payment_method_settings");
  const byMethod = Object.fromEntries(rows.map((r) => [r.method, r.details]));
  return {
    bkash: (byMethod.bkash ?? {}) as Partial<BkashNagadDetails>,
    nagad: (byMethod.nagad ?? {}) as Partial<BkashNagadDetails>,
    bank: (byMethod.bank ?? {}) as Partial<BankDetails>,
  };
}

export async function upsertPaymentMethodSettings(method: ManualPaymentMethod, details: BkashNagadDetails | BankDetails): Promise<void> {
  await pool.query(
    `INSERT INTO payment_method_settings (method, details, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (method) DO UPDATE SET details = $2, updated_at = now()`,
    [method, details]
  );
}
