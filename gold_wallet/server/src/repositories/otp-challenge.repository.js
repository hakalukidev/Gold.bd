const crypto = require("node:crypto");
const pool = require("../db/pool");

async function findActive(phone, purpose) {
  const { rows } = await pool.query("SELECT * FROM otp_challenges WHERE phone = $1 AND purpose = $2", [
    phone,
    purpose,
  ]);
  return rows[0] || null;
}

/** Replaces any prior challenge for this (phone, purpose) — only one can be outstanding at a time. */
async function upsert({ phone, purpose, codeHash, expiresAt, payload, userId }) {
  const id = crypto.randomUUID();
  await pool.query(
    `INSERT INTO otp_challenges (id, phone, purpose, code_hash, payload, user_id, attempts, expires_at, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, 0, $7, now())
     ON CONFLICT (phone, purpose) DO UPDATE SET
       id = EXCLUDED.id,
       code_hash = EXCLUDED.code_hash,
       payload = EXCLUDED.payload,
       user_id = EXCLUDED.user_id,
       attempts = 0,
       expires_at = EXCLUDED.expires_at,
       created_at = now()`,
    [id, phone, purpose, codeHash, payload ? JSON.stringify(payload) : null, userId || null, expiresAt]
  );
}

async function incrementAttempts(id) {
  await pool.query("UPDATE otp_challenges SET attempts = attempts + 1 WHERE id = $1", [id]);
}

async function remove(id) {
  await pool.query("DELETE FROM otp_challenges WHERE id = $1", [id]);
}

module.exports = { findActive, upsert, incrementAttempts, remove };
