import { Pool } from "pg";

/**
 * Own Postgres instance — a separate `gold_commerce` database, independent of
 * gold_wallet's. Cached on globalThis so Next's dev-mode module reloads don't
 * spin up a fresh pool (and exhaust connections) on every edit.
 */
declare global {
  var _goldCommercePgPool: Pool | undefined;
}

export const pool =
  global._goldCommercePgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : false,
  });

if (process.env.NODE_ENV !== "production") global._goldCommercePgPool = pool;
