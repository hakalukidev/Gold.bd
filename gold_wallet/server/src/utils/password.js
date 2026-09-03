const bcrypt = require("bcryptjs");
const env = require("../config/env");

async function hashPassword(plain) {
  return bcrypt.hash(plain, env.BCRYPT_SALT_ROUNDS);
}

async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

module.exports = { hashPassword, verifyPassword };
