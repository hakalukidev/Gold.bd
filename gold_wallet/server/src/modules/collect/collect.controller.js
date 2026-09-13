const asyncHandler = require("../../utils/async-handler");
const collectService = require("./collect.service");

const request = asyncHandler(async (req, res) => {
  const order = await collectService.request(req.userId, req.body);
  res.status(201).json({ success: true, data: order });
});

const adminList = asyncHandler(async (req, res) => {
  const orders = await collectService.adminList({ status: req.query.status, limit: req.query.limit, offset: req.query.offset });
  res.json({ success: true, data: orders });
});

const adminApprove = asyncHandler(async (req, res) => {
  const order = await collectService.approve(req.params.id, req.userId);
  res.json({ success: true, data: order });
});

module.exports = { request, adminList, adminApprove };
