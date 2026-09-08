const { z } = require("zod");

// Same three keys platform-settings.repository.js knows about. All optional
// so a save can touch just one field, but at least one must be present
// (checked in the repository, since zod has no built-in "at least one of").
const updateSettingsSchema = z.object({
  transactionChargeRate: z.coerce.number().min(0).max(1).optional(),
  sellSpreadRate: z.coerce.number().min(0).max(1).optional(),
  govtGoldTaxPerBhoriBdt: z.coerce.number().min(0).optional(),
});

module.exports = { updateSettingsSchema };
