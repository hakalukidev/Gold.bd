require("dotenv").config();
const { z } = require("zod");

/** A key must be exactly `bytes` bytes of hex — used for every symmetric key
 * below so a misconfigured (too short/non-hex) secret fails fast at boot
 * instead of at the first encrypt/decrypt call. Generate one with:
 * node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" */
const hexKey = (bytes, label) =>
  z
    .string()
    .regex(new RegExp(`^[0-9a-fA-F]{${bytes * 2}}$`), `${label} must be a ${bytes * 2}-character hex string (${bytes} bytes)`);

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4000),

    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    // Runtime app role's connection string. Falls back to DATABASE_URL in dev
    // so a fresh checkout needs no extra setup; production should point this
    // at a least-privilege role (see db/roles/grant-app-role.sql) separate
    // from the migration role DATABASE_URL/migrate.js uses.
    MIGRATE_DATABASE_URL: z.string().optional(),
    DATABASE_SSL: z
      .string()
      .default("false")
      .transform((v) => v === "true"),

    // Application-level field encryption (src/security/crypto.js) for
    // sensitive columns (wallet balances, payment/OTP PII, user contact
    // info). CURRENT_KEY_VERSION picks which key new encrypt calls use;
    // older ENCRYPTION_KEY_Vn slots stay configured so already-encrypted data
    // keeps decrypting after a rotation — retire one only once nothing on
    // disk still references it.
    CURRENT_KEY_VERSION: z.coerce.number().int().positive().default(1),
    ENCRYPTION_KEY_V1: hexKey(32, "ENCRYPTION_KEY_V1"),
    ENCRYPTION_KEY_V2: hexKey(32, "ENCRYPTION_KEY_V2").optional(),
    ENCRYPTION_KEY_V3: hexKey(32, "ENCRYPTION_KEY_V3").optional(),
    // Separate from the encryption keys on purpose: rotating one never
    // invalidates the other. Signs the wallet balance tamper-evidence
    // checksum (wallet.repository.js) and the ledger hash chain
    // (ledger.repository.js).
    INTEGRITY_KEY: hexKey(32, "INTEGRITY_KEY"),
    // Deterministic HMAC "blind index" key for encrypted-but-searchable
    // columns (users.phone/email) — see security/crypto.js#hmacBlindIndex.
    HMAC_BLIND_INDEX_KEY: hexKey(32, "HMAC_BLIND_INDEX_KEY"),

    CORS_ORIGINS: z
      .string()
      .default("")
      .transform((v) =>
        v
          .split(",")
          .map((o) => o.trim())
          .filter(Boolean)
      ),

    JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
    JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
    ACCESS_TOKEN_TTL: z.string().default("30m"),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),

    BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

    LOGIN_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
    LOGIN_LOCKOUT_MINUTES: z.coerce.number().int().positive().default(15),

    // BulkSMSBD (http://bulksmsbd.net/api/smsapi) sends registration/login OTPs.
    // Left blank outside production: sendSms() logs the code instead of calling
    // the real gateway, so local dev never needs live SMS credentials.
    BULKSMSBD_API_KEY: z.string().default(""),
    BULKSMSBD_SENDER_ID: z.string().default(""),
    BULKSMSBD_API_URL: z.string().url().default("http://bulksmsbd.net/api/smsapi"),
    BULKSMSBD_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),

    OTP_TTL_MINUTES: z.coerce.number().int().positive().default(5),
    OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
    OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().positive().default(60),

    // BAJUS (Bangladesh Jewellers Association) gold/silver rate feed. Polled by
    // src/jobs/rate-sync.job.js on a timer and stored in the metal_rates table;
    // src/modules/rates serves it back out at /api/gold and /api/silver.
    BAJUS_API_URL: z
      .string()
      .url()
      .default("https://bajusrate.com/wp-content/bajus/index.php?gold=data"),
    RATE_SYNC_INTERVAL_MINUTES: z.coerce.number().int().positive().default(30),
    // Local phone number (no "88" prefix) texted whenever a sync detects a
    // price change. Optional — leave blank to only log rate changes.
    ADMIN_ALERT_PHONE: z.string().default(""),

    // Live USD/EUR/GBP/SAR → BDT quotes for the wallet's "value in other
    // currencies" card (see src/jobs/fx-sync.job.js). open.er-api.com is a
    // free, no-API-key-required feed (ECB/IMF-sourced, refreshed roughly
    // daily) — plenty fresh for an indicative FX display; swap the URL for a
    // paid provider if a tighter update cadence is ever needed.
    FX_API_URL: z.string().url().default("https://open.er-api.com/v6/latest/USD"),
    FX_SYNC_INTERVAL_MINUTES: z.coerce.number().int().positive().default(60),

    // SSLCommerz payment gateway (src/modules/payments) — the single
    // integration both gold_commerce (checkout) and gold_wallet/client
    // (wallet top-up) go through. Sandbox credentials from
    // https://developer.sslcommerz.com/; defaults below point at their
    // sandbox host so local dev needs no live merchant account.
    SSLCOMMERZ_STORE_ID: z.string().default(""),
    SSLCOMMERZ_STORE_PASSWORD: z.string().default(""),
    SSLCOMMERZ_IS_LIVE: z
      .string()
      .default("false")
      .transform((v) => v === "true"),
    SSLCOMMERZ_API_URL: z.string().url().default("https://sandbox.sslcommerz.com/gwprocess/v4/api.php"),
    SSLCOMMERZ_VALIDATION_URL: z
      .string()
      .url()
      .default("https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php"),
    // This server's own publicly-reachable origin — used to build the
    // success/fail/cancel/ipn callback URLs SSLCommerz redirects/posts back
    // to. Must be reachable from the internet in production (tunnel it in
    // local dev if you need to test a real SSLCommerz round-trip end to end).
    APP_BASE_URL: z.string().url().default("http://localhost:4000"),
  })
  .refine((v) => v.JWT_ACCESS_SECRET !== v.JWT_REFRESH_SECRET, {
    message: "JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different",
    path: ["JWT_REFRESH_SECRET"],
  })
  .refine((v) => v.CURRENT_KEY_VERSION === 1 || v[`ENCRYPTION_KEY_V${v.CURRENT_KEY_VERSION}`], {
    message: "CURRENT_KEY_VERSION points at an ENCRYPTION_KEY_Vn that isn't set",
    path: ["CURRENT_KEY_VERSION"],
  })
  .refine((v) => v.NODE_ENV !== "production" || v.BULKSMSBD_API_KEY, {
    message: "BULKSMSBD_API_KEY is required in production",
    path: ["BULKSMSBD_API_KEY"],
  })
  .refine((v) => v.NODE_ENV !== "production" || v.BULKSMSBD_SENDER_ID, {
    message: "BULKSMSBD_SENDER_ID is required in production",
    path: ["BULKSMSBD_SENDER_ID"],
  })
  .refine((v) => v.NODE_ENV !== "production" || v.SSLCOMMERZ_STORE_ID, {
    message: "SSLCOMMERZ_STORE_ID is required in production",
    path: ["SSLCOMMERZ_STORE_ID"],
  })
  .refine((v) => v.NODE_ENV !== "production" || v.SSLCOMMERZ_STORE_PASSWORD, {
    message: "SSLCOMMERZ_STORE_PASSWORD is required in production",
    path: ["SSLCOMMERZ_STORE_PASSWORD"],
  });

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

const data = parsed.data;

// Every ENCRYPTION_KEY_Vn present becomes a decrypt-capable key; encrypt
// calls always use CURRENT_KEY_VERSION. Keyed by number so
// security/crypto.js can look one up as `ENCRYPTION_KEYS[envelope.v]`.
const ENCRYPTION_KEYS = {};
for (const [name, value] of Object.entries(data)) {
  const match = name.match(/^ENCRYPTION_KEY_V(\d+)$/);
  if (match && value) ENCRYPTION_KEYS[Number(match[1])] = Buffer.from(value, "hex");
}

module.exports = { ...data, ENCRYPTION_KEYS };
