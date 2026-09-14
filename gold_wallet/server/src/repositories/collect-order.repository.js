const crypto = require("node:crypto");
const pool = require("../db/pool");
const { encryptField, decryptJSON } = require("../security/crypto");

// Bound to the order's own id, generated before the INSERT below — this row
// is never updated in place (unlike users.phone_enc), so there's no need to
// anchor it to something longer-lived.
function addressAad(id) {
  return `collect_orders:address:${id}`;
}

function toSummary(row) {
  if (!row) return null;
  const address = row.address_enc ? decryptJSON(row.address_enc, addressAad(row.id)) : null;
  return {
    id: row.id,
    userId: row.user_id,
    ledgerEntryId: row.ledger_entry_id,
    weightGrams: row.weight_grams,
    metal: row.metal,
    form: row.form,
    method: row.method,
    deliveryFeeBDT: row.delivery_fee_bdt,
    address: address
      ? {
          fullName: address.fullName,
          phone: address.phone,
          district: address.district,
          postalCode: address.postalCode,
          streetAddress: address.streetAddress,
        }
      : null,
    status: row.status,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
  };
}

// Must run with the same transaction `client` as the ledger_entries insert
// it references — that row isn't visible to any other connection (this
// FK's target) until the transaction commits.
async function create({ userId, ledgerEntryId, weightGrams, metal, form, method, deliveryFeeBDT, address }, client) {
  if (!client) throw new Error("create must run inside withTransaction, with a transaction client");
  const id = crypto.randomUUID();
  const addressEnc = address ? encryptField(address, addressAad(id)) : null;

  const { rows } = await client.query(
    `INSERT INTO collect_orders
       (id, user_id, ledger_entry_id, weight_grams, metal, form, method, delivery_fee_bdt, address_enc, key_version)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      id,
      userId,
      ledgerEntryId,
      weightGrams,
      metal,
      form,
      method,
      deliveryFeeBDT,
      addressEnc ? JSON.stringify(addressEnc) : null,
      addressEnc ? addressEnc.v : null,
    ]
  );
  return toSummary(rows[0]);
}

async function findById(id) {
  const { rows } = await pool.query("SELECT * FROM collect_orders WHERE id = $1", [id]);
  return toSummary(rows[0]);
}

async function listByStatus({ status, limit, offset }) {
  const { rows } = await pool.query(
    `SELECT * FROM collect_orders WHERE status = $1 ORDER BY created_at ASC LIMIT $2 OFFSET $3`,
    [status, limit, offset]
  );
  return rows.map(toSummary);
}

async function approve(id, adminUserId) {
  const { rows } = await pool.query(
    `UPDATE collect_orders
     SET status = 'APPROVED', approved_by = $2, approved_at = now()
     WHERE id = $1 AND status = 'PENDING'
     RETURNING *`,
    [id, adminUserId]
  );
  return toSummary(rows[0]);
}

module.exports = { create, findById, listByStatus, approve };
