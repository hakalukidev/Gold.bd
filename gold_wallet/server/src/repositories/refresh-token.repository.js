const crypto = require("node:crypto");
const pool = require("../db/pool");

async function insert({ userId, tokenHash, expiresAt, userAgent, ipAddress }) {
  const id = crypto.randomUUID();
  await pool.query(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, user_agent, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, userId, tokenHash, expiresAt, userAgent || null, ipAddress || null]
  );
  return id;
}

async function findByHash(tokenHash) {
  const { rows } = await pool.query("SELECT * FROM refresh_tokens WHERE token_hash = $1", [tokenHash]);
  return rows[0] || null;
}

/** Marks a token used and links it to its replacement, so reuse of a rotated-out token is detectable. */
async function markRotated(tokenHash, replacedByTokenHash) {
  await pool.query(
    `UPDATE refresh_tokens SET revoked_at = now(), replaced_by_token_hash = $2 WHERE token_hash = $1`,
    [tokenHash, replacedByTokenHash]
  );
}

async function revoke(tokenHash) {
  await pool.query(
    `UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL`,
    [tokenHash]
  );
}

async function revokeAllForUser(userId) {
  await pool.query(
    `UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId]
  );
}

module.exports = { insert, findByHash, markRotated, revoke, revokeAllForUser };
