const crypto = require("node:crypto");
const pool = require("../db/pool");

const PUBLIC_COLUMNS = `id, full_name AS "fullName", phone, email, role, kyc_status AS "kycStatus", created_at AS "createdAt"`;

function toPublicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    fullName: row.fullName,
    phone: row.phone,
    email: row.email,
    role: row.role,
    kycStatus: row.kycStatus,
    createdAt: row.createdAt,
  };
}

async function findByPhone(phone) {
  const { rows } = await pool.query("SELECT * FROM users WHERE phone = $1", [phone]);
  return rows[0] || null;
}

async function findByEmail(email) {
  const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await pool.query(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`, [id]);
  return toPublicUser(rows[0]);
}

async function create({ fullName, phone, email, passwordHash }) {
  const id = crypto.randomUUID();
  const { rows } = await pool.query(
    `INSERT INTO users (id, full_name, phone, email, password_hash)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${PUBLIC_COLUMNS}`,
    [id, fullName, phone, email || null, passwordHash]
  );
  return toPublicUser(rows[0]);
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
