const path = require("node:path");
const HttpError = require("../../utils/http-error");
const ledgerRepo = require("../../repositories/ledger.repository");
const userRepo = require("../../repositories/user.repository");
const giftCoinRepo = require("../../repositories/gift-coin-order.repository");
const { UPLOAD_DIR } = require("./gift-coin.storage");

function toClientOrder(order) {
  if (!order) return null;
  return {
    id: order.id,
    occasion: order.occasion,
    status: order.status,
    createdAt: order.createdAt,
    fulfilledAt: order.fulfilledAt,
  };
}

/** Attaches a "print this photo on the coin" fulfillment request to a gift
 * the caller just sent — the gift itself (GIFT_SENT ledger row) must already
 * exist and belong to them, so this can't be used to queue a print job for
 * someone else's transfer. */
async function create(userId, { ledgerEntryId, occasion }, photoFile) {
  if (!photoFile) {
    throw new HttpError(400, "A coin photo (JPEG, PNG or WEBP, up to 5MB) is required");
  }

  const entry = await ledgerRepo.findById(ledgerEntryId);
  if (!entry || entry.userId !== userId || entry.type !== "GIFT_SENT") {
    throw new HttpError(404, "Unknown gift");
  }

  const recipient = await userRepo.findByPhone(entry.counterpartyPhone);
  if (!recipient) {
    throw new HttpError(404, "Recipient account no longer exists");
  }

  const order = await giftCoinRepo.create({
    ledgerEntryId,
    senderId: userId,
    recipientId: recipient.id,
    photoPath: photoFile.filename,
    occasion,
  });
  return toClientOrder(order);
}

async function adminList({ status, limit, offset }) {
  const orders = await giftCoinRepo.listByStatus({
    status: status || "PENDING",
    limit: Math.min(Number(limit) || 20, 50),
    offset: Number(offset) || 0,
  });

  return Promise.all(
    orders.map(async (order) => {
      const [sender, recipient] = await Promise.all([
        userRepo.findById(order.senderId),
        userRepo.findById(order.recipientId),
      ]);
      return {
        ...toClientOrder(order),
        senderName: sender?.fullName ?? null,
        senderPhone: sender?.phone ?? null,
        recipientName: recipient?.fullName ?? null,
        recipientPhone: recipient?.phone ?? null,
      };
    })
  );
}

async function resolvePhoto({ id, requesterRole }) {
  if (requesterRole !== "ADMIN") throw new HttpError(403, "Not allowed");

  const order = await giftCoinRepo.findById(id);
  if (!order) throw new HttpError(404, "Not found");

  const ext = path.extname(order.photoPath).toLowerCase();
  const contentType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
  return { path: path.join(UPLOAD_DIR, order.photoPath), contentType };
}

async function fulfill(id, adminUserId) {
  const order = await giftCoinRepo.markFulfilled(id, adminUserId);
  if (!order) throw new HttpError(409, "This order was already fulfilled");
  return toClientOrder(order);
}

module.exports = { create, adminList, resolvePhoto, fulfill };
