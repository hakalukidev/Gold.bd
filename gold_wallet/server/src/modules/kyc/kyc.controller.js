const asyncHandler = require("../../utils/async-handler");
const kycService = require("./kyc.service");

const getStatus = asyncHandler(async (req, res) => {
  const profile = await kycService.getStatus(req.userId);
  res.json({ success: true, data: profile });
});

const submit = asyncHandler(async (req, res) => {
  const profile = await kycService.submit(req.userId, req.body, req.files);
  res.status(201).json({ success: true, data: profile });
});

const getDocument = asyncHandler(async (req, res) => {
  const { path: filePath, contentType } = await kycService.resolveDocument({
    kycId: req.params.id,
    field: req.params.field,
    requesterId: req.userId,
    requesterRole: req.userRole,
  });
  res.setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", "private, no-store");
  res.sendFile(filePath);
});

const adminList = asyncHandler(async (req, res) => {
  const profiles = await kycService.adminList({
    status: req.query.status,
    limit: req.query.limit,
    offset: req.query.offset,
  });
  res.json({ success: true, data: profiles });
});

const adminReview = asyncHandler(async (req, res) => {
  const profile = await kycService.review({
    id: req.params.id,
    decision: req.body.decision,
    rejectReason: req.body.rejectReason,
    reviewedBy: req.userId,
  });
  res.json({ success: true, data: profile });
});

module.exports = { getStatus, submit, getDocument, adminList, adminReview };
