/**
 * Periodic integrity backstop for the wallet/ledger split: `wallets` is the
 * fast-path balance every read hits, `ledger_entries` is the append-only
 * history it's supposed to always agree with. This job is what actually
 * checks that agreement — wallet.repository.js's checksum only catches a
 * single row being altered outside the app, not the two tables silently
 * drifting apart (e.g. a bug that updates one without the other).
 *
 * For every user with wallet activity: sums their ledger deltas from
 * scratch, compares that to the current `wallets` balance, and walks their
 * hash chain (ledger.repository.js#verifyChain). Any mismatch or broken
 * chain is logged at `error` level and, if ADMIN_ALERT_PHONE is set, texted
 * to an admin the same way rate-sync.job.js already does for a BAJUS price
 * change — this is deliberately not wired into any request path; it's meant
 * to run on a schedule (see start() below) or on demand.
 */
const pool = require("../db/pool");
const logger = require("../utils/logger");
const env = require("../config/env");
const walletRepo = require("../repositories/wallet.repository");
const ledgerRepo = require("../repositories/ledger.repository");
const { sendSms } = require("../utils/sms");

const RECONCILE_INTERVAL_MINUTES = 60;

async function usersWithLedgerActivity() {
  const { rows } = await pool.query("SELECT DISTINCT user_id FROM ledger_entries");
  return rows.map((r) => r.user_id);
}

const EPSILON = 0.01; // a cent/hundredth-of-a-gram of float noise is not drift

async function reconcileUser(userId) {
  const issues = [];

  const [walletBalance, ledgerSum, chain] = await Promise.all([
    walletRepo.findByUserId(userId).catch((err) => {
      issues.push(`wallet checksum failed: ${err.message}`);
      return null;
    }),
    ledgerRepo.sumDeltas(userId),
    ledgerRepo.verifyChain(userId),
  ]);

  if (!chain.ok) issues.push(`ledger hash chain broken at entry ${chain.brokenAt}`);

  if (walletBalance) {
    if (Math.abs(Number(walletBalance.cashBalanceBDT) - Number(ledgerSum.cashBalanceBDT)) > EPSILON) {
      issues.push(`cash drift: wallet=${walletBalance.cashBalanceBDT} ledger=${ledgerSum.cashBalanceBDT}`);
    }
    if (Math.abs(Number(walletBalance.goldBalanceGrams) - Number(ledgerSum.goldBalanceGrams)) > EPSILON) {
      issues.push(`gold drift: wallet=${walletBalance.goldBalanceGrams} ledger=${ledgerSum.goldBalanceGrams}`);
    }
    if (Math.abs(Number(walletBalance.silverBalanceGrams) - Number(ledgerSum.silverBalanceGrams)) > EPSILON) {
      issues.push(`silver drift: wallet=${walletBalance.silverBalanceGrams} ledger=${ledgerSum.silverBalanceGrams}`);
    }
  }

  return issues;
}

async function runReconciliation() {
  const userIds = await usersWithLedgerActivity();
  const problems = [];

  for (const userId of userIds) {
    const issues = await reconcileUser(userId);
    if (issues.length > 0) {
      logger.error({ userId, issues }, "Ledger reconciliation found a discrepancy");
      problems.push({ userId, issues });
    }
  }

  if (problems.length > 0 && env.ADMIN_ALERT_PHONE) {
    await sendSms(
      env.ADMIN_ALERT_PHONE,
      `Gold BD: ledger reconciliation found ${problems.length} account(s) with a balance/chain discrepancy. Check server logs.`
    ).catch((err) => logger.error({ err }, "Failed to send reconciliation alert SMS"));
  }

  logger.info({ checked: userIds.length, problems: problems.length }, "Ledger reconciliation complete");
  return problems;
}

let timer = null;

/** Runs an initial sweep immediately (catches anything that drifted before
 * this restart), then every RECONCILE_INTERVAL_MINUTES — same start-up
 * pattern as rate-sync.job.js. A failed run is logged and never crashes the
 * process; the next tick just tries again. */
function start() {
  if (timer) return;
  runReconciliation().catch((err) => logger.error({ err }, "Initial ledger reconciliation failed"));
  timer = setInterval(() => {
    runReconciliation().catch((err) => logger.error({ err }, "Ledger reconciliation run failed"));
  }, RECONCILE_INTERVAL_MINUTES * 60 * 1000);
  timer.unref();
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { start, stop, runReconciliation, reconcileUser };
