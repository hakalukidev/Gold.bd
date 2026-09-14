const HttpError = require("../../utils/http-error");
const withTransaction = require("../../db/with-transaction");
const walletRepo = require("../../repositories/wallet.repository");
const ledgerRepo = require("../../repositories/ledger.repository");
const userRepo = require("../../repositories/user.repository");
const collectRepo = require("../../repositories/collect-order.repository");

// Mirrors collect-panel.tsx's constants — never trust a client-sent fee, the
// same "never trust client for price" rule trade.service.js follows.
const FREE_ABOVE_G = 2;
const DELIVERY_FEE_BDT = 150;

// The UI only ever offers gold (see collect-panel.tsx — no metal picker), so
// this stays fixed rather than trusting a client-sent metal.
const METAL = "gold";

function toClientOrder(order) {
  if (!order) return null;
  return {
    id: order.id,
    weightGrams: order.weightGrams,
    metal: order.metal,
    form: order.form,
    method: order.method,
    deliveryFeeBDT: order.deliveryFeeBDT,
    status: order.status,
    createdAt: order.createdAt,
  };
}

/**
 * Debits `weightGrams` of gold from the wallet and files a delivery/pickup
 * request for it — the metal leaves the digital ledger the moment this is
 * requested (same as a gift), not only once an admin gets around to
 * approving it, so it can't be spent twice while a request is in flight.
 */
async function request(userId, { weightGrams, form, method, fullName, phone, district, postalCode, streetAddress }) {
  const deliveryFeeBDT = weightGrams >= FREE_ABOVE_G ? 0 : DELIVERY_FEE_BDT;
  const address = method === "home" ? { fullName, phone, district, postalCode, streetAddress } : null;

  return withTransaction(async (client) => {
    const wallet = await walletRepo.applyDelta(userId, { goldDelta: -weightGrams }, client);
    if (!wallet) throw new HttpError(400, "Insufficient gold balance");

    const entry = await ledgerRepo.insert(
      {
        userId,
        type: "COLLECT",
        metal: METAL,
        grams: weightGrams.toFixed(4),
        goldDelta: (-weightGrams).toFixed(4),
        silverDelta: "0.0000",
        cashBalanceAfter: wallet.cashBalanceBDT,
        goldBalanceAfter: wallet.goldBalanceGrams,
        silverBalanceAfter: wallet.silverBalanceGrams,
      },
      client
    );

    const order = await collectRepo.create(
      {
        userId,
        ledgerEntryId: entry.id,
        weightGrams,
        metal: METAL,
        form,
        method,
        deliveryFeeBDT,
        address,
      },
      client
    );
    return toClientOrder(order);
  });
}

async function adminList({ status, limit, offset }) {
  const orders = await collectRepo.listByStatus({
    status: status || "PENDING",
    limit: Math.min(Number(limit) || 20, 50),
    offset: Number(offset) || 0,
  });

  return Promise.all(
    orders.map(async (order) => {
      const requester = await userRepo.findById(order.userId);
      return {
        ...toClientOrder(order),
        address: order.address,
        requesterName: requester?.fullName ?? null,
        requesterPhone: requester?.phone ?? null,
      };
    })
  );
}

async function approve(id, adminUserId) {
  const order = await collectRepo.approve(id, adminUserId);
  if (!order) throw new HttpError(409, "This order was already approved");
  return toClientOrder(order);
}

module.exports = { request, adminList, approve };
