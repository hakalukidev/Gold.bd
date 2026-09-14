const crypto = require("node:crypto");
const pool = require("../db/pool");
const { encryptField, decryptField, hmacBlindIndex } = require("../security/crypto");

// Bound to the user's id, not the kyc_profiles row's own id — the row gets
// updated in place on resubmission (see upsert below) while the user id
// never changes, so this stays stable across a whole verify/reject/resubmit
// cycle without needing to look up the existing row's id first.
function kycAad(userId) {
  return `kyc_profiles:nid_number:${userId}`;
}

function toProfile(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    fullName: row.full_name,
    dob: row.dob,
    nidNumber: decryptField(row.nid_number_enc, kycAad(row.user_id)),
    nidFrontPath: row.nid_front_path,
    nidBackPath: row.nid_back_path,
    selfiePath: row.selfie_path,
    status: row.status,
    rejectReason: row.reject_reason,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
  };
}

async function findByUserId(userId) {
  const { rows } = await pool.query("SELECT * FROM kyc_profiles WHERE user_id = $1", [userId]);
  return toProfile(rows[0]);
}

async function findById(id) {
  const { rows } = await pool.query("SELECT * FROM kyc_profiles WHERE id = $1", [id]);
  return toProfile(rows[0]);
}

async function findByNidNumber(nidNumber) {
  const { rows } = await pool.query("SELECT * FROM kyc_profiles WHERE nid_number_hmac = $1", [hmacBlindIndex(nidNumber)]);
  return toProfile(rows[0]);
}

/** Insert-or-overwrite keyed on user_id — a fresh submission always resets
 * status back to PENDING and clears any previous review, whether this is a
 * brand-new row or a resubmission after a REJECTED one. */
async function upsert({ userId, fullName, dob, nidNumber, nidFrontPath, nidBackPath, selfiePath }) {
  const aad = kycAad(userId);
  const nidEnc = encryptField(nidNumber, aad);

  const { rows } = await pool.query(
    `INSERT INTO kyc_profiles
       (id, user_id, full_name, dob, nid_number_enc, nid_number_hmac, key_version,
        nid_front_path, nid_back_path, selfie_path, status, reject_reason, reviewed_by, reviewed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PENDING', NULL, NULL, NULL)
     ON CONFLICT (user_id) DO UPDATE SET
       full_name = EXCLUDED.full_name,
       dob = EXCLUDED.dob,
       nid_number_enc = EXCLUDED.nid_number_enc,
       nid_number_hmac = EXCLUDED.nid_number_hmac,
       key_version = EXCLUDED.key_version,
       nid_front_path = EXCLUDED.nid_front_path,
       nid_back_path = EXCLUDED.nid_back_path,
       selfie_path = EXCLUDED.selfie_path,
       status = 'PENDING',
       reject_reason = NULL,
       reviewed_by = NULL,
       reviewed_at = NULL,
       updated_at = now()
     RETURNING *`,
    [crypto.randomUUID(), userId, fullName, dob, JSON.stringify(nidEnc), hmacBlindIndex(nidNumber), nidEnc.v, nidFrontPath, nidBackPath, selfiePath]
  );
  return toProfile(rows[0]);
}

async function listByStatus({ status, limit, offset }) {
  const { rows } = await pool.query(
    `SELECT * FROM kyc_profiles WHERE status = $1 ORDER BY created_at ASC LIMIT $2 OFFSET $3`,
    [status, limit, offset]
  );
  return rows.map(toProfile);
}

async function setDecision({ id, status, rejectReason, reviewedBy }) {
  const { rows } = await pool.query(
    `UPDATE kyc_profiles
     SET status = $2, reject_reason = $3, reviewed_by = $4, reviewed_at = now(), updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [id, status, rejectReason, reviewedBy]
  );
  return toProfile(rows[0]);
}

module.exports = { findByUserId, findById, findByNidNumber, upsert, listByStatus, setDecision };
