const crypto = require("node:crypto");
const pool = require("../db/pool");
const { encryptField, decryptJSON } = require("../security/crypto");

// (phone, purpose) is the row's own unique key and is stable for the life of
// a challenge, so it doubles as a solid AAD binding for the encrypted payload.
function payloadAad(phone, purpose) {
  return `otp_challenges:payload:${phone}:${purpose}`;
}

function toChallenge(row) {
  if (!row) return null;
  return { ...row, payload: decryptJSON(row.payload_enc, payloadAad(row.phone, row.purpose)) };
}

async function findActive(phone, purpose) {
  const { rows } = await pool.query("SELECT * FROM otp_challenges WHERE phone = $1 AND purpose = $2", [
    phone,
    purpose,
  ]);
  return toChallenge(rows[0]) || null;
}

/** Replaces any prior challenge for this (phone, purpose) — only one can be outstanding at a time. */
async function upsert({ phone, purpose, codeHash, expiresAt, payload, userId }) {
  const id = crypto.randomUUID();
  const payloadEnc = payload ? encryptField(payload, payloadAad(phone, purpose)) : null;
  await pool.query(
    `INSERT INTO otp_challenges (id, phone, purpose, code_hash, payload_enc, key_version, user_id, attempts, expires_at, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, now())
     ON CONFLICT (phone, purpose) DO UPDATE SET
       id = EXCLUDED.id,
       code_hash = EXCLUDED.code_hash,
       payload_enc = EXCLUDED.payload_enc,
       key_version = EXCLUDED.key_version,
       user_id = EXCLUDED.user_id,
       attempts = 0,
       expires_at = EXCLUDED.expires_at,
       created_at = now()`,
    [id, phone, purpose, codeHash, payloadEnc ? JSON.stringify(payloadEnc) : null, payloadEnc ? payloadEnc.v : null, userId || null, expiresAt]
  );
}

async function incrementAttempts(id) {
  await pool.query("UPDATE otp_challenges SET attempts = attempts + 1 WHERE id = $1", [id]);
}

async function remove(id) {
  await pool.query("DELETE FROM otp_challenges WHERE id = $1", [id]);
}

module.exports = { findActive, upsert, incrementAttempts, remove };
