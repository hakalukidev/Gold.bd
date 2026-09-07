const crypto = require("node:crypto");
const env = require("../config/env");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

/**
 * Application-level field encryption (AES-256-GCM) — the same "handle
 * secrets in JS, never in SQL" convention this codebase already uses for
 * password hashing and refresh-token/OTP hashing (see utils/password.js,
 * utils/tokens.js), extended to confidentiality instead of one-way hashing.
 *
 * Every encrypted value is stored as a small envelope object
 * `{ v, iv, ct, tag }` (key version, IV, ciphertext, auth tag — all
 * base64), so a column can hold it directly as JSONB. AAD binds each
 * ciphertext to the row/column it came from (see `fieldAad` below) so a
 * ciphertext copied into a different row/column fails to decrypt instead of
 * silently decrypting as something else.
 */

function keyForVersion(version) {
  const key = env.ENCRYPTION_KEYS[version];
  if (!key) throw new Error(`No encryption key configured for version ${version}`);
  return key;
}

/** Binds a ciphertext to exactly the row/column it belongs to. */
function fieldAad(table, column, rowId) {
  return `${table}:${column}:${rowId}`;
}

function encryptField(value, aad) {
  if (value === null || value === undefined) return null;
  const version = env.CURRENT_KEY_VERSION;
  const key = keyForVersion(version);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  if (aad) cipher.setAAD(Buffer.from(aad, "utf8"));

  const plaintext = Buffer.from(typeof value === "string" ? value : JSON.stringify(value), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return { v: version, iv: iv.toString("base64"), ct: ciphertext.toString("base64"), tag: tag.toString("base64") };
}

/** Returns the decrypted plaintext string, or null for a null/absent envelope. */
function decryptField(envelope, aad) {
  if (envelope === null || envelope === undefined) return null;
  const { v, iv, ct, tag } = typeof envelope === "string" ? JSON.parse(envelope) : envelope;
  const key = keyForVersion(v);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, "base64"));
  if (aad) decipher.setAAD(Buffer.from(aad, "utf8"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ct, "base64")), decipher.final()]);
  return plaintext.toString("utf8");
}

/** Same as decryptField, but JSON-parses the recovered plaintext (for values
 * that were objects when encrypted, e.g. a customer{name,email,phone} blob). */
function decryptJSON(envelope, aad) {
  const text = decryptField(envelope, aad);
  return text === null ? null : JSON.parse(text);
}

/**
 * Deterministic HMAC "blind index" for fields that need exact-match lookup
 * while their real value stays encrypted (e.g. users.phone/email) — the
 * unique constraint and WHERE clauses move to this column since Postgres
 * can't index or compare AES-GCM ciphertext (a fresh random IV means the
 * same plaintext never encrypts to the same bytes twice).
 */
function hmacBlindIndex(value) {
  return crypto.createHmac("sha256", env.HMAC_BLIND_INDEX_KEY).update(String(value)).digest("hex");
}

/**
 * Tamper-evidence checksum for a mutable row (e.g. a wallet's balance) —
 * deliberately keyed with a *separate* secret (INTEGRITY_KEY) from the
 * encryption keys, so rotating one never invalidates the other. Verified on
 * every read; a mismatch means the row changed outside the code path that
 * maintains this checksum (a direct SQL edit, a restored stale backup, etc).
 */
function computeChecksum(parts) {
  return crypto.createHmac("sha256", env.INTEGRITY_KEY).update(parts.join("|")).digest("hex");
}

function verifyChecksum(parts, checksum) {
  if (!checksum) return false;
  const expected = Buffer.from(computeChecksum(parts), "hex");
  let actual;
  try {
    actual = Buffer.from(checksum, "hex");
  } catch {
    return false;
  }
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function sha256Hex(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

/** JSON.stringify with object keys sorted, so hashing/comparing a value
 * doesn't depend on incidental key order — notably, Postgres's jsonb type
 * does not preserve the original key order of an inserted object, so a hash
 * chain over a jsonb column's contents (see ledger.repository.js) must
 * canonicalize before hashing or it would spuriously "break" on every read. */
function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

/** One link in an insert-only hash chain: binds this row to everything
 * before it, so altering or deleting a historical row breaks the chain from
 * that point forward (see ledger.repository.js's verifyChain). */
function chainHash(prevHash, fields) {
  return sha256Hex(`${prevHash || ""}|${stableStringify(fields)}`);
}

module.exports = {
  fieldAad,
  encryptField,
  decryptField,
  decryptJSON,
  hmacBlindIndex,
  computeChecksum,
  verifyChecksum,
  sha256Hex,
  stableStringify,
  chainHash,
};
