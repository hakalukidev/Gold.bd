const { z } = require("zod");
const { bdPhone } = require("../auth/auth.validation");

const METALS = ["gold", "silver"];
// Same generous per-metal ceilings as trade.validation.js — a backstop
// against a malformed request, not the real limit (the sender's own balance).
const MAX_GRAMS = { gold: 1000, silver: 50000 };

const sendGiftSchema = z
  .object({
    recipientPhone: bdPhone,
    metal: z.enum(METALS),
    grams: z.coerce.number().positive("Weight must be greater than zero"),
    message: z.string().trim().max(300).optional(),
  })
  .refine((v) => v.grams <= (MAX_GRAMS[v.metal] || 1000), {
    message: "Weight is too large",
    path: ["grams"],
  });

module.exports = { sendGiftSchema, METALS, MAX_GRAMS };
