const crypto = require("node:crypto");
const pool = require("../db/pool");
const { encryptField, decryptJSON } = require("../security/crypto");

// Bound to tran_id (unique, and already known at insert time — unlike id it
// needs no extra lookup on the update path) rather than the primary key.
function customerAad(tranId) {
  return `payments:customer:${tranId}`;
}

function gatewayResponseAad(tranId) {
  return `payments:gateway_response:${tranId}`;
}

function toSummary(row) {
  if (!row) return null;
  const customer = decryptJSON(row.customer_enc, customerAad(row.tran_id)) || {};
  return {
    id: row.id,
    tranId: row.tran_id,
    sourceApp: row.source_app,
    purpose: row.purpose,
    userId: row.user_id,
    amountBDT: row.amount_bdt,
    currency: row.currency,
    status: row.status,
    customer: { name: customer.name ?? null, email: customer.email ?? null, phone: customer.phone ?? null },
    returnBaseUrl: row.return_base_url,
    metadata: row.metadata,
    valId: row.val_id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

async function create({ sourceApp, purpose, userId, amountBDT, currency, customer, returnBaseUrl, metadata }) {
  const id = crypto.randomUUID();
  // GB + base36 timestamp + a few random hex chars — short, unique, and
  // alnum-only, which is all SSLCommerz requires of tran_id.
  const tranId = `GB${Date.now().toString(36)}${crypto.randomBytes(3).toString("hex")}`.toUpperCase();

  const customerEnc = encryptField({ name: customer.name, email: customer.email, phone: customer.phone }, customerAad(tranId));

  const { rows } = await pool.query(
    `INSERT INTO payments
       (id, tran_id, source_app, purpose, user_id, amount_bdt, currency,
        customer_enc, key_version, return_base_url, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      id,
      tranId,
      sourceApp,
      purpose,
      userId || null,
      amountBDT,
      currency,
      JSON.stringify(customerEnc),
      customerEnc.v,
      returnBaseUrl,
      JSON.stringify(metadata || {}),
    ]
  );
  return toSummary(rows[0]);
}

async function findByTranId(tranId) {
  const { rows } = await pool.query("SELECT * FROM payments WHERE tran_id = $1", [tranId]);
  return toSummary(rows[0]);
}

/**
 * Moves a payment out of PENDING. Guarded so a late/replayed fail or cancel
 * callback can never downgrade a transaction the validator has already
 * confirmed VALID — the terminal states here are otherwise final.
 */
async function updateStatus(tranId, { status, valId, cardType, bankTranId, gatewayResponse }, db = pool) {
  const gatewayResponseEnc = gatewayResponse ? encryptField(gatewayResponse, gatewayResponseAad(tranId)) : null;

  const { rows } = await db.query(
    `UPDATE payments SET
       status = $2,
       val_id = COALESCE($3, val_id),
       card_type = COALESCE($4, card_type),
       bank_tran_id = COALESCE($5, bank_tran_id),
       gateway_response_enc = COALESCE($6, gateway_response_enc),
       key_version = COALESCE($7, key_version),
       updated_at = now()
     WHERE tran_id = $1 AND status = 'PENDING'
     RETURNING *`,
    [
      tranId,
      status,
      valId || null,
      cardType || null,
      bankTranId || null,
      gatewayResponseEnc ? JSON.stringify(gatewayResponseEnc) : null,
      gatewayResponseEnc ? gatewayResponseEnc.v : null,
    ]
  );
  return toSummary(rows[0]);
}

module.exports = { create, findByTranId, updateStatus };
