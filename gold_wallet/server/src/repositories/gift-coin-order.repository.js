const crypto = require("node:crypto");
const pool = require("../db/pool");

function toSummary(row) {
  if (!row) return null;
  return {
    id: row.id,
    ledgerEntryId: row.ledger_entry_id,
    senderId: row.sender_id,
    recipientId: row.recipient_id,
    photoPath: row.photo_path,
    occasion: row.occasion,
    status: row.status,
    fulfilledBy: row.fulfilled_by,
    fulfilledAt: row.fulfilled_at,
    createdAt: row.created_at,
  };
}

async function create({ ledgerEntryId, senderId, recipientId, photoPath, occasion }) {
  const { rows } = await pool.query(
    `INSERT INTO gift_coin_orders (id, ledger_entry_id, sender_id, recipient_id, photo_path, occasion)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [crypto.randomUUID(), ledgerEntryId, senderId, recipientId, photoPath, occasion || null]
  );
  return toSummary(rows[0]);
}

async function findById(id) {
  const { rows } = await pool.query("SELECT * FROM gift_coin_orders WHERE id = $1", [id]);
  return toSummary(rows[0]);
}

async function listByStatus({ status, limit, offset }) {
  const { rows } = await pool.query(
    `SELECT * FROM gift_coin_orders WHERE status = $1 ORDER BY created_at ASC LIMIT $2 OFFSET $3`,
    [status, limit, offset]
  );
  return rows.map(toSummary);
}

async function markFulfilled(id, adminUserId) {
  const { rows } = await pool.query(
    `UPDATE gift_coin_orders
     SET status = 'FULFILLED', fulfilled_by = $2, fulfilled_at = now()
     WHERE id = $1 AND status = 'PENDING'
     RETURNING *`,
    [id, adminUserId]
  );
  return toSummary(rows[0]);
}

module.exports = { create, findById, listByStatus, markFulfilled };
