#!/usr/bin/env node
/**
 * One-off cutover script: encrypts every row that predates the encryption
 * columns added by migrations 0009-0012 (wallets, payments, otp_challenges,
 * users). Safe to re-run — it only touches rows whose *_enc column is still
 * NULL, so an interrupted run just picks up where it left off.
 *
 * Run this once after applying those migrations and before running the
 * corresponding 0013-0016 "drop plaintext columns" migrations. See
 * db/migrations/ for the column additions this backfills.
 */
const pool = require("../src/db/pool");
const logger = require("../src/utils/logger");
const { encryptField, computeChecksum, hmacBlindIndex } = require("../src/security/crypto");

async function backfillWallets() {
  const { rows } = await pool.query(
    `SELECT user_id, cash_balance_bdt, gold_balance_grams, silver_balance_grams
     FROM wallets WHERE cash_balance_enc IS NULL`
  );
  for (const row of rows) {
    const aad = `wallets:balances:${row.user_id}`;
    const cash = Number(row.cash_balance_bdt).toFixed(2);
    const gold = Number(row.gold_balance_grams).toFixed(4);
    const silver = Number(row.silver_balance_grams).toFixed(4);
    const cashEnc = encryptField(cash, aad);
    const goldEnc = encryptField(gold, aad);
    const silverEnc = encryptField(silver, aad);
    const checksum = computeChecksum([row.user_id, cash, gold, silver, "0"]);
    await pool.query(
      `UPDATE wallets SET cash_balance_enc=$2, gold_balance_enc=$3, silver_balance_enc=$4, key_version=$5, balance_checksum=$6, version=0
       WHERE user_id=$1`,
      [row.user_id, JSON.stringify(cashEnc), JSON.stringify(goldEnc), JSON.stringify(silverEnc), cashEnc.v, checksum]
    );
  }
  logger.info(`wallets: backfilled ${rows.length} row(s)`);
}

async function backfillPayments() {
  const { rows } = await pool.query(
    `SELECT id, tran_id, customer_name, customer_email, customer_phone, gateway_response
     FROM payments WHERE customer_enc IS NULL`
  );
  for (const row of rows) {
    const customerAad = `payments:customer:${row.tran_id}`;
    const customerEnc = encryptField({ name: row.customer_name, email: row.customer_email, phone: row.customer_phone }, customerAad);
    let gatewayResponseEnc = null;
    if (row.gateway_response) {
      gatewayResponseEnc = encryptField(row.gateway_response, `payments:gateway_response:${row.tran_id}`);
    }
    await pool.query(
      `UPDATE payments SET customer_enc=$2, gateway_response_enc=$3, key_version=$4 WHERE id=$1`,
      [row.id, JSON.stringify(customerEnc), gatewayResponseEnc ? JSON.stringify(gatewayResponseEnc) : null, customerEnc.v]
    );
  }
  logger.info(`payments: backfilled ${rows.length} row(s)`);
}

async function backfillOtpChallenges() {
  const { rows } = await pool.query(`SELECT id, phone, purpose, payload FROM otp_challenges WHERE payload IS NOT NULL AND payload_enc IS NULL`);
  for (const row of rows) {
    const aad = `otp_challenges:payload:${row.phone}:${row.purpose}`;
    const payloadEnc = encryptField(row.payload, aad);
    await pool.query(`UPDATE otp_challenges SET payload_enc=$2, key_version=$3 WHERE id=$1`, [row.id, JSON.stringify(payloadEnc), payloadEnc.v]);
  }
  logger.info(`otp_challenges: backfilled ${rows.length} row(s)`);
}

async function backfillUsers() {
  const { rows } = await pool.query(`SELECT id, phone, email FROM users WHERE phone_enc IS NULL`);
  for (const row of rows) {
    const aad = `users:contact:${row.id}`;
    const phoneEnc = encryptField(row.phone, aad);
    const emailEnc = row.email ? encryptField(row.email, aad) : null;
    await pool.query(
      `UPDATE users SET phone_enc=$2, phone_hmac=$3, email_enc=$4, email_hmac=$5, key_version=$6 WHERE id=$1`,
      [row.id, JSON.stringify(phoneEnc), hmacBlindIndex(row.phone), emailEnc ? JSON.stringify(emailEnc) : null, row.email ? hmacBlindIndex(row.email) : null, phoneEnc.v]
    );
  }
  logger.info(`users: backfilled ${rows.length} row(s)`);
}

async function run() {
  await backfillWallets();
  await backfillPayments();
  await backfillOtpChallenges();
  await backfillUsers();
  await pool.end();
  logger.info("Backfill complete");
}

run().catch((err) => {
  logger.error({ err }, "Backfill failed");
  process.exit(1);
});
