const pool = require("../db/pool");
const logger = require("../utils/logger");
const { encryptField, decryptField, computeChecksum, verifyChecksum } = require("../security/crypto");

const ZERO_BALANCE = { cashBalanceBDT: "0.00", goldBalanceGrams: "0.0000", silverBalanceGrams: "0.0000" };
const DECIMALS = { cash: 2, gold: 4, silver: 4 };

class WalletIntegrityError extends Error {
  constructor(userId) {
    super("Wallet balance failed its tamper-evidence check");
    this.name = "WalletIntegrityError";
    this.userId = userId;
  }
}

/** Every balance ciphertext is bound to the specific wallet row it lives in,
 * so a balance blob copied onto another user's row (or into another column)
 * fails to decrypt instead of silently being trusted. */
function aad(userId) {
  return `wallets:balances:${userId}`;
}

function checksumParts(userId, cash, gold, silver, version) {
  return [userId, cash, gold, silver, String(version)];
}

/** Decrypts a wallet row's three balance columns and verifies the checksum
 * computed over them + its version counter. A mismatch means the row was
 * changed outside this repository (a direct SQL edit, a restored stale
 * backup, ...) — fail closed rather than trust a possibly-tampered balance. */
function decryptRow(row) {
  const rowAad = aad(row.user_id);
  const cash = decryptField(row.cash_balance_enc, rowAad);
  const gold = decryptField(row.gold_balance_enc, rowAad);
  const silver = decryptField(row.silver_balance_enc, rowAad);

  const ok = verifyChecksum(checksumParts(row.user_id, cash, gold, silver, row.version), row.balance_checksum);
  if (!ok) {
    logger.error({ userId: row.user_id }, "Wallet balance checksum mismatch — possible tampering");
    throw new WalletIntegrityError(row.user_id);
  }

  return { cashBalanceBDT: cash, goldBalanceGrams: gold, silverBalanceGrams: silver, version: row.version };
}

function toSummary(decrypted) {
  if (!decrypted) return ZERO_BALANCE;
  const { cashBalanceBDT, goldBalanceGrams, silverBalanceGrams } = decrypted;
  return { cashBalanceBDT, goldBalanceGrams, silverBalanceGrams };
}

function fixed(n, key) {
  return Number(n).toFixed(DECIMALS[key]);
}

function encryptBalances(userId, cash, gold, silver) {
  const rowAad = aad(userId);
  const cashEnc = encryptField(cash, rowAad);
  const goldEnc = encryptField(gold, rowAad);
  const silverEnc = encryptField(silver, rowAad);
  return { cashEnc, goldEnc, silverEnc };
}

/** No row yet just means the user has never had money move through their
 * wallet — that's a real zero balance, not a state worth provisioning a row
 * for up front. Plain read, no row lock: fine for GET /api/wallet, which
 * doesn't need to block concurrent trades. */
async function findByUserId(userId, db = pool) {
  const { rows } = await db.query("SELECT * FROM wallets WHERE user_id = $1", [userId]);
  if (!rows[0]) return ZERO_BALANCE;
  return toSummary(decryptRow(rows[0]));
}

/**
 * Locks the wallet row for the rest of the caller's transaction, creating it
 * at zero first if this is the user's first-ever balance movement. Using
 * `INSERT ... ON CONFLICT DO UPDATE` (rather than a separate SELECT/INSERT)
 * makes "ensure the row exists" and "lock it" a single atomic statement, so
 * two concurrent first-deposits can't race each other into inserting twice.
 */
async function lockOrCreate(userId, client) {
  const version = 0;
  const zero = encryptBalances(userId, "0.00", "0.0000", "0.0000");
  const checksum = computeChecksum(checksumParts(userId, "0.00", "0.0000", "0.0000", version));

  const { rows } = await client.query(
    `INSERT INTO wallets (user_id, cash_balance_enc, gold_balance_enc, silver_balance_enc, key_version, balance_checksum, version)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id) DO UPDATE SET user_id = wallets.user_id
     RETURNING *`,
    [userId, JSON.stringify(zero.cashEnc), JSON.stringify(zero.goldEnc), JSON.stringify(zero.silverEnc), zero.cashEnc.v, checksum, version]
  );
  return rows[0];
}

/**
 * Applies signed deltas to a user's cash/gold/silver balances — the single
 * path every balance-mutating flow (deposit, withdraw, buy, sell) goes
 * through, so there's exactly one place that can move money. Must run
 * inside withTransaction: it locks the row, decrypts + integrity-checks the
 * current balance, computes the new one in JS (Postgres can't do arithmetic
 * on ciphertext), rejects anything that would go negative, then re-encrypts
 * and writes the result with a bumped version + fresh checksum.
 *
 * Returns the new balance summary, or null if any leg of the delta would
 * take a balance below zero (the caller maps that to an "insufficient
 * balance" error).
 */
async function applyDelta(userId, { cashDelta = 0, goldDelta = 0, silverDelta = 0 }, client) {
  if (!client) throw new Error("applyDelta must run inside withTransaction, with a transaction client");

  const row = await lockOrCreate(userId, client);
  const current = decryptRow(row);

  const nextCash = Number(current.cashBalanceBDT) + Number(cashDelta);
  const nextGold = Number(current.goldBalanceGrams) + Number(goldDelta);
  const nextSilver = Number(current.silverBalanceGrams) + Number(silverDelta);

  // Small epsilon guards against float noise from repeated toFixed/Number
  // round-trips landing a hair below zero on an exact-zero-out.
  const EPSILON = 1e-9;
  if (nextCash < -EPSILON || nextGold < -EPSILON || nextSilver < -EPSILON) return null;

  const cashStr = fixed(Math.max(nextCash, 0), "cash");
  const goldStr = fixed(Math.max(nextGold, 0), "gold");
  const silverStr = fixed(Math.max(nextSilver, 0), "silver");
  const nextVersion = current.version + 1;

  const enc = encryptBalances(userId, cashStr, goldStr, silverStr);
  const checksum = computeChecksum(checksumParts(userId, cashStr, goldStr, silverStr, nextVersion));

  const { rows } = await client.query(
    `UPDATE wallets SET
       cash_balance_enc = $2, gold_balance_enc = $3, silver_balance_enc = $4,
       key_version = $5, balance_checksum = $6, version = $7, updated_at = now()
     WHERE user_id = $1 AND version = $8
     RETURNING *`,
    [userId, JSON.stringify(enc.cashEnc), JSON.stringify(enc.goldEnc), JSON.stringify(enc.silverEnc), enc.cashEnc.v, checksum, nextVersion, current.version]
  );

  // The `version = current.version` guard above is an optimistic-concurrency
  // backstop — belt-and-braces alongside the row lock lockOrCreate already
  // holds, which is what actually prevents a concurrent writer from getting
  // here in between. A missing row at this point means that invariant broke.
  if (!rows[0]) throw new Error("Wallet version conflict — this should be unreachable under a held row lock");

  return toSummary(decryptRow(rows[0]));
}

async function creditCash(userId, amountBDT, client) {
  return applyDelta(userId, { cashDelta: Number(amountBDT) }, client);
}

async function debitCash(userId, amountBDT, client) {
  return applyDelta(userId, { cashDelta: -Number(amountBDT) }, client);
}

async function creditMetal(userId, metal, grams, client) {
  return applyDelta(userId, { [`${metal}Delta`]: Number(grams) }, client);
}

async function debitMetal(userId, metal, grams, client) {
  return applyDelta(userId, { [`${metal}Delta`]: -Number(grams) }, client);
}

module.exports = {
  WalletIntegrityError,
  findByUserId,
  applyDelta,
  creditCash,
  debitCash,
  creditMetal,
  debitMetal,
};
