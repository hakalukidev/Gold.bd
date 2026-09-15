import { pool } from "./db";
import type { ChargeSettings } from "@/types";

interface ChargeSettingsRow {
  key: "platform_charge" | "vat";
  percent: string;
}

/** The platform charge % and VAT % admins set from /admin/rates — applied on
 * top of the base gram price (real BAJUS rate x weight premium) to arrive at
 * what a shopper pays. Both default to 0 (no-op) until an admin sets them. */
export async function getChargeSettings(): Promise<ChargeSettings> {
  const { rows } = await pool.query<ChargeSettingsRow>("SELECT key, percent FROM platform_charge_settings");
  const byKey = Object.fromEntries(rows.map((r) => [r.key, Number(r.percent)]));
  return {
    platformChargePercent: byKey.platform_charge ?? 0,
    vatPercent: byKey.vat ?? 0,
  };
}

export async function updateChargeSettings(settings: ChargeSettings): Promise<void> {
  await pool.query(
    `INSERT INTO platform_charge_settings (key, percent, updated_at) VALUES
       ('platform_charge', $1, now()),
       ('vat', $2, now())
     ON CONFLICT (key) DO UPDATE SET percent = EXCLUDED.percent, updated_at = EXCLUDED.updated_at`,
    [settings.platformChargePercent, settings.vatPercent]
  );
}
