const asyncHandler = require("../../utils/async-handler");
const giftCoinService = require("./gift-coin.service");

const create = asyncHandler(async (req, res) => {
  const order = await giftCoinService.create(req.userId, req.body, req.file);
  res.status(201).json({ success: true, data: order });
});

const adminList = asyncHandler(async (req, res) => {
  const orders = await giftCoinService.adminList({ status: req.query.status, limit: req.query.limit, offset: req.query.offset });
  res.json({ success: true, data: orders });
});

const adminGetPhoto = asyncHandler(async (req, res) => {
  const { path: filePath, contentType } = await giftCoinService.resolvePhoto({
    id: req.params.id,
    requesterRole: req.userRole,
  });
  res.setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", "private, no-store");
  res.sendFile(filePath);
});

const adminFulfill = asyncHandler(async (req, res) => {
  const order = await giftCoinService.fulfill(req.params.id, req.userId);
  res.json({ success: true, data: order });
});

module.exports = { create, adminList, adminGetPhoto, adminFulfill };
