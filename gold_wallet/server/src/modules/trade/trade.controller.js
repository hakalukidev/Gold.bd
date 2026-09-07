const asyncHandler = require("../../utils/async-handler");
const HttpError = require("../../utils/http-error");
const { tradeSchema, METALS } = require("./trade.validation");
const tradeService = require("./trade.service");

function assertMetal(metal) {
  if (!METALS.includes(metal)) throw new HttpError(404, `Unknown metal "${metal}"`);
  return metal;
}

/** Schema depends on which metal's route this is (different weight ceilings),
 * so validation happens here rather than through the shared validateBody
 * middleware, which only takes a single static schema. */
function parseBody(metal, body) {
  const result = tradeSchema(metal).safeParse(body);
  if (!result.success) {
    throw new HttpError(400, "Invalid input", result.error.flatten().fieldErrors);
  }
  return result.data;
}

function idempotencyKeyFrom(req, parsed) {
  return req.get("Idempotency-Key") || parsed.idempotencyKey;
}

const buy = asyncHandler(async (req, res) => {
  const metal = assertMetal(req.params.metal);
  const parsed = parseBody(metal, req.body);
  const entry = await tradeService.buy(req.userId, metal, parsed.grams, idempotencyKeyFrom(req, parsed), parsed.karat);
  res.status(200).json({ success: true, data: entry });
});

const sell = asyncHandler(async (req, res) => {
  const metal = assertMetal(req.params.metal);
  const parsed = parseBody(metal, req.body);
  const entry = await tradeService.sell(req.userId, metal, parsed.grams, idempotencyKeyFrom(req, parsed), parsed.karat);
  res.status(200).json({ success: true, data: entry });
});

module.exports = { buy, sell };
