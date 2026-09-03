const { z } = require("zod");

// BD mobile numbers: 01XXXXXXXXX (11 digits), optionally with a +88/88 prefix.
// Mirrors gold_wallet/src/lib/validations/auth.ts so client and server agree on shape.
const PHONE_REGEX = /^(?:\+?88)?01[3-9]\d{8}$/;

const bdPhone = z
  .string()
  .trim()
  .regex(PHONE_REGEX, "Enter a valid Bangladeshi mobile number")
  .transform(normalizePhone);

/** Collapses +8801..., 8801... and 01... down to the same 11-digit key so one person can't register twice under different prefixes. */
function normalizePhone(raw) {
  const digits = raw.replace(/\D/g, "");
  return digits.slice(-11);
}

// Mirrors gold_wallet/src/lib/validations/auth.ts so client and server agree on strength.
const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters")
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/\d/, "Password must include a number")
  .regex(/[^A-Za-z0-9]/, "Password must include a special character");

const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Name is too short").max(100),
  phone: bdPhone,
  email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .max(255)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v.toLowerCase() : undefined)),
  password,
});

const loginSchema = z.object({
  phone: bdPhone,
  password: z.string().min(1, "Password is required"),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

const otpCode = z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code");

const verifyRegisterSchema = z.object({
  phone: bdPhone,
  code: otpCode,
});

const verifyLoginSchema = z.object({
  phone: bdPhone,
  code: otpCode,
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshSchema,
  verifyRegisterSchema,
  verifyLoginSchema,
  normalizePhone,
};
