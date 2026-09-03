require("dotenv").config();
const { z } = require("zod");

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4000),

    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    DATABASE_SSL: z
      .string()
      .default("false")
      .transform((v) => v === "true"),

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
    ACCESS_TOKEN_TTL: z.string().default("15m"),
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
  })
  .refine((v) => v.JWT_ACCESS_SECRET !== v.JWT_REFRESH_SECRET, {
    message: "JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different",
    path: ["JWT_REFRESH_SECRET"],
  })
  .refine((v) => v.NODE_ENV !== "production" || v.BULKSMSBD_API_KEY, {
    message: "BULKSMSBD_API_KEY is required in production",
    path: ["BULKSMSBD_API_KEY"],
  })
  .refine((v) => v.NODE_ENV !== "production" || v.BULKSMSBD_SENDER_ID, {
    message: "BULKSMSBD_SENDER_ID is required in production",
    path: ["BULKSMSBD_SENDER_ID"],
  });

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

module.exports = parsed.data;
