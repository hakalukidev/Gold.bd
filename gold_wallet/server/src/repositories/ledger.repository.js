const crypto = require("node:crypto");
const pool = require("../db/pool");
const logger = require("../utils/logger");
const { encryptField, decryptJSON, chainHash } = require("../security/crypto");

const AMOUNT_KEYS = [
  "grams",
  "pricePerGramBDT",
  "feeBDT",
  "taxBDT",
  "cashDelta",
  "goldDelta",
  "silverDelta",
  "cashBalanceAfter",
  "goldBalanceAfter",
  "silverBalanceAfter",
];

function amountsAad(id) {
  return `ledger_entries:amounts:${id}`;
}

/** Fields the hash chain covers — the actual ciphertext envelope
 * (amountsEnc), not the plaintext amounts, so the chain is tamper-evident
 * without also being a hash oracle over (often low-entropy) money amounts. */
function hashInput({ id, userId, type, metal, status, amountsEnc }) {
  return { id, userId, type, metal: metal || null, status, amountsEnc };
}

function toSummary(row) {
  const amounts = decryptJSON(row.amounts_enc, amountsAad(row.id)) || {};
  return {
    id: row.id,
    type: row.type,
    metal: row.metal,
    status: row.status,
    goldGrams: row.metal === "gold" ? amounts.grams ?? null : null,
    silverGrams: row.metal === "silver" ? amounts.grams ?? null : null,
    pricePerGramBDT: amounts.pricePerGramBDT ?? null,
    feeBDT: amounts.feeBDT ?? "0.00",
    taxBDT: amounts.taxBDT ?? "0.00",
    totalAmountBDT: Math.abs(Number(amounts.cashDelta ?? 0)).toFixed(2),
    paymentTranId: row.payment_tran_id,
    createdAt: row.created_at.toISOString(),
  };
}

async function getLastHash(userId, db) {
  const { rows } = await db.query(
    `SELECT row_hash FROM ledger_entries WHERE user_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1`,
    [userId]
  );
  return rows[0]?.row_hash || null;
}

/**
 * Appends one immutable ledger row. Must run inside the same transaction
 * (and, for a balance-mutating entry, the same `client` already holding the
 * wallet's row lock via wallet.repository.js#applyDelta) as whatever else
 * this entry documents — a ledger row must never exist without the balance
 * change it describes, or vice versa.
 */
async function insert(entry, client) {
  const id = crypto.randomUUID();
  const status = entry.status || "COMPLETED";
  const metal = entry.metal || null;

  const amounts = {};
  for (const key of AMOUNT_KEYS) {
    if (entry[key] !== undefined) amounts[key] = entry[key];
  }
  const amountsEnc = encryptField(amounts, amountsAad(id));

  const prevHash = await getLastHash(entry.userId, client);
  const rowHash = chainHash(prevHash, hashInput({ id, userId: entry.userId, type: entry.type, metal, status, amountsEnc }));

  const { rows } = await client.query(
    `INSERT INTO ledger_entries
       (id, user_id, type, metal, status, amounts_enc, key_version, payment_tran_id, idempotency_key, prev_hash, row_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      id,
      entry.userId,
      entry.type,
      metal,
      status,
      JSON.stringify(amountsEnc),
      amountsEnc.v,
      entry.paymentTranId || null,
      entry.idempotencyKey || null,
      prevHash,
      rowHash,
    ]
  );
  return toSummary(rows[0]);
}

async function findByIdempotencyKey(userId, idempotencyKey, db = pool) {
  if (!idempotencyKey) return null;
  const { rows } = await db.query(`SELECT * FROM ledger_entries WHERE user_id = $1 AND idempotency_key = $2`, [
    userId,
    idempotencyKey,
  ]);
  return rows[0] ? toSummary(rows[0]) : null;
}

/** Paginated, filterable history for GET /api/transactions. */
async function listByUser(userId, { type, metal, from, to, page = 1, limit = 50 } = {}, db = pool) {
  const conditions = ["user_id = $1"];
  const params = [userId];

  if (type) {
    params.push(type);
    conditions.push(`type = $${params.length}`);
  }
  if (metal) {
    params.push(metal);
    conditions.push(`metal = $${params.length}`);
  }
  if (from) {
    params.push(from);
    conditions.push(`created_at >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    conditions.push(`created_at <= $${params.length}`);
  }
  const where = conditions.join(" AND ");

  const { rows: countRows } = await db.query(`SELECT count(*)::int AS count FROM ledger_entries WHERE ${where}`, params);
  const total = countRows[0].count;

  const safePage = Math.max(1, page);
  const safeLimit = Math.min(Math.max(1, limit), 100);
  const offset = (safePage - 1) * safeLimit;

  const listParams = [...params, safeLimit, offset];
  const { rows } = await db.query(
    `SELECT * FROM ledger_entries WHERE ${where} ORDER BY created_at DESC LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
    listParams
  );

  return { items: rows.map(toSummary), total, page: safePage, limit: safeLimit };
}

/**
 * Walks a user's chain in insertion order, recomputing each row's hash from
 * its stored fields and checking it both matches the stored row_hash and
 * correctly links to the previous row. Used by the reconciliation job — a
 * break means a historical row was altered or deleted (or inserted/removed)
 * outside the app's own insert-only path.
 */
async function verifyChain(userId, db = pool) {
  const { rows } = await db.query(
    `SELECT id, type, metal, status, amounts_enc, prev_hash, row_hash
     FROM ledger_entries WHERE user_id = $1 ORDER BY created_at ASC, id ASC`,
    [userId]
  );

  let expectedPrevHash = null;
  for (const row of rows) {
    if (row.prev_hash !== expectedPrevHash) {
      logger.error({ userId, ledgerEntryId: row.id }, "Ledger chain break: prev_hash does not match the prior row");
      return { ok: false, brokenAt: row.id };
    }
    const recomputed = chainHash(row.prev_hash, hashInput({ id: row.id, userId, type: row.type, metal: row.metal, status: row.status, amountsEnc: row.amounts_enc }));
    if (recomputed !== row.row_hash) {
      logger.error({ userId, ledgerEntryId: row.id }, "Ledger chain break: row_hash does not match its own contents");
      return { ok: false, brokenAt: row.id };
    }
    expectedPrevHash = row.row_hash;
  }
  return { ok: true, brokenAt: null };
}

/** Sums every user's raw deltas straight from the ledger — the value
 * `wallets` should equal if nothing has drifted. Used only by the
 * reconciliation job; decrypts every row so it's not meant for a hot path. */
async function sumDeltas(userId, db = pool) {
  const { rows } = await db.query(`SELECT amounts_enc, id FROM ledger_entries WHERE user_id = $1`, [userId]);
  let cash = 0;
  let gold = 0;
  let silver = 0;
  for (const row of rows) {
    const amounts = decryptJSON(row.amounts_enc, amountsAad(row.id)) || {};
    cash += Number(amounts.cashDelta || 0);
    gold += Number(amounts.goldDelta || 0);
    silver += Number(amounts.silverDelta || 0);
  }
  return { cashBalanceBDT: cash.toFixed(2), goldBalanceGrams: gold.toFixed(4), silverBalanceGrams: silver.toFixed(4) };
}

module.exports = { insert, findByIdempotencyKey, listByUser, verifyChain, sumDeltas };
