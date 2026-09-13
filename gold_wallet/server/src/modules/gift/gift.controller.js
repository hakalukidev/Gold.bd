const asyncHandler = require("../../utils/async-handler");
const giftService = require("./gift.service");

const send = asyncHandler(async (req, res) => {
  const entry = await giftService.send(req.userId, req.body);
  res.status(200).json({ success: true, data: entry });
});

module.exports = { send };
