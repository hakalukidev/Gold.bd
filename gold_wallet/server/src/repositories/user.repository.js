const crypto = require("node:crypto");
const pool = require("../db/pool");
const { encryptField, decryptField, hmacBlindIndex } = require("../security/crypto");

// Bound to the user's own id (stable for the row's lifetime, generated
// before the INSERT below) rather than the phone/email itself, so rotating
// a user's phone/email doesn't require re-deriving the AAD for old rows.
function contactAad(userId) {
  return `users:contact:${userId}`;
}

/** Decrypts phone/email onto a raw `users` row, leaving every other column
 * (including the still-plaintext id/role/kyc_status/password_hash/etc.) as-is. */
function decryptContact(row) {
  if (!row) return row;
  const aad = contactAad(row.id);
  return {
    ...row,
    phone: decryptField(row.phone_enc, aad),
    email: row.email_enc ? decryptField(row.email_enc, aad) : null,
  };
}

function toPublicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    role: row.role,
    kycStatus: row.kyc_status,
    createdAt: row.created_at,
  };
}

/** phone/email are looked up by their deterministic HMAC, never by the
 * encrypted value itself (AES-GCM's random IV means the same plaintext never
 * produces the same ciphertext twice, so ciphertext can't be an equality key). */
async function findByPhone(phone) {
  const { rows } = await pool.query("SELECT * FROM users WHERE phone_hmac = $1", [hmacBlindIndex(phone)]);
  return decryptContact(rows[0]) || null;
}

async function findByEmail(email) {
  const { rows } = await pool.query("SELECT * FROM users WHERE email_hmac = $1", [hmacBlindIndex(email)]);
  return decryptContact(rows[0]) || null;
}

async function findById(id) {
  const { rows } = await pool.query(`SELECT * FROM users WHERE id = $1`, [id]);
  return toPublicUser(decryptContact(rows[0]));
}

async function create({ fullName, phone, email, passwordHash }) {
  const id = crypto.randomUUID();
  const aad = contactAad(id);
  const phoneEnc = encryptField(phone, aad);
  const emailEnc = email ? encryptField(email, aad) : null;

  const { rows } = await pool.query(
    `INSERT INTO users (id, full_name, phone_enc, phone_hmac, email_enc, email_hmac, key_version, password_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      id,
      fullName,
      JSON.stringify(phoneEnc),
      hmacBlindIndex(phone),
      emailEnc ? JSON.stringify(emailEnc) : null,
      email ? hmacBlindIndex(email) : null,
      phoneEnc.v,
      passwordHash,
    ]
  );
  return toPublicUser(decryptContact(rows[0]));
}

/** Atomically bump the failed-attempt counter and lock the account once it crosses the threshold. */
async function registerFailedLogin(userId, maxAttempts, lockoutMinutes) {
  await pool.query(
    `UPDATE users
     SET failed_login_attempts = failed_login_attempts + 1,
         locked_until = CASE
           WHEN failed_login_attempts + 1 >= $2 THEN now() + ($3 || ' minutes')::interval
           ELSE locked_until
         END,
         updated_at = now()
     WHERE id = $1`,
    [userId, maxAttempts, lockoutMinutes]
  );
}

async function resetFailedLogins(userId) {
  await pool.query(
    `UPDATE users SET failed_login_attempts = 0, locked_until = NULL, updated_at = now() WHERE id = $1`,
    [userId]
  );
}

module.exports = {
  toPublicUser,
  findByPhone,
  findByEmail,
  findById,
  create,
  registerFailedLogin,
  resetFailedLogins,
};
