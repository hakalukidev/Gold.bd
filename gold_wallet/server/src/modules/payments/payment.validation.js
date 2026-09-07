const { z } = require("zod");

const customerSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().min(6, "Enter a valid phone number").max(20),
  address: z.string().trim().max(200).optional(),
});

const initPaymentSchema = z.object({
  // Which frontend started this — gold_commerce checkout or gold_wallet's
  // wallet top-up — purely for bookkeeping (the payments row) and to pick
  // the right product name shown on SSLCommerz's hosted page.
  source: z.enum(["commerce", "wallet"]),
  purpose: z.enum(["order", "deposit"]),
  amount: z.coerce.number().positive("Amount must be greater than zero").max(10_000_000),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .default("BDT"),
  customer: customerSchema,
  // e.g. "https://shop.gold.bd/checkout" — validated against CORS_ORIGINS in
  // payment.service.js before it's used to build a redirect.
  returnBaseUrl: z.string().url(),
  // Opaque to this module — a cart snapshot for a commerce order, {} for a
  // wallet deposit. Echoed back by GET /api/payments/:tranId.
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

module.exports = { initPaymentSchema };
