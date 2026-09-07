const { z } = require("zod");

const METALS = ["gold", "silver"];

// Generous per-metal ceilings, mirroring the client's own weight caps
// (validations/gold.ts) — a backstop against a wildly malformed request, not
// the real limiting factor (that's the wallet's actual balance).
const MAX_GRAMS = { gold: 1000, silver: 50000 };

const tradeSchema = (metal) =>
  z.object({
    grams: z.coerce
      .number()
      .positive("Weight must be greater than zero")
      .max(MAX_GRAMS[metal] || 1000, "Weight is too large"),
    karat: z.union([z.literal(22), z.literal(21), z.literal(18)]).default(22),
    idempotencyKey: z.string().trim().min(1).max(100).optional(),
  });

module.exports = { tradeSchema, METALS, MAX_GRAMS };
