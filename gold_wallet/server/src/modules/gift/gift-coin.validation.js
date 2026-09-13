const { z } = require("zod");

const OCCASIONS = ["eid", "wedding", "birthday", "anniversary"];

const createGiftCoinOrderSchema = z.object({
  ledgerEntryId: z.string().uuid("Invalid gift reference"),
  occasion: z.enum(OCCASIONS).optional(),
});

module.exports = { createGiftCoinOrderSchema, OCCASIONS };
