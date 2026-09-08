const asyncHandler = require("../../utils/async-handler");
const HttpError = require("../../utils/http-error");
const { updateSettingsSchema } = require("./admin.validation");
const platformSettingsRepo = require("../../repositories/platform-settings.repository");

const getSettings = asyncHandler(async (req, res) => {
  const settings = await platformSettingsRepo.getFeeSettings();
  res.status(200).json({ success: true, data: settings });
});

const updateSettings = asyncHandler(async (req, res) => {
  const result = updateSettingsSchema.safeParse(req.body);
  if (!result.success) {
    throw new HttpError(400, "Invalid input", result.error.flatten().fieldErrors);
  }
  const settings = await platformSettingsRepo.updateFeeSettings(result.data, req.userId);
  res.status(200).json({ success: true, data: settings });
});

module.exports = { getSettings, updateSettings };
