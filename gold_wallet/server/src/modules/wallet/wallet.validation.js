const { z } = require("zod");

const withdrawSchema = z.object({
  amountBDT: z.coerce.number().positive("Amount must be greater than zero").max(1_000_000),
});

module.exports = { withdrawSchema };
