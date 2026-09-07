const asyncHandler = require("../../utils/async-handler");
const ledgerRepo = require("../../repositories/ledger.repository");

const getTransactions = asyncHandler(async (req, res) => {
  const { type, metal, from, to, page, limit } = req.query;
  const result = await ledgerRepo.listByUser(req.userId, {
    type: typeof type === "string" ? type : undefined,
    metal: typeof metal === "string" ? metal : undefined,
    from: typeof from === "string" ? from : undefined,
    to: typeof to === "string" ? to : undefined,
    page: Number(page) || 1,
    limit: Number(limit) || 50,
  });
  res.json({
    success: true,
    data: result.items,
    meta: { total: result.total, page: result.page, limit: result.limit },
  });
});

module.exports = { getTransactions };
