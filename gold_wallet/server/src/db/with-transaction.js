const pool = require("./pool");

/**
 * Runs `fn` with a dedicated client inside BEGIN/COMMIT, rolling back on any
 * rejection. Use this whenever a write must not partially apply — e.g.
 * crediting a wallet only together with the payment that earns it settling
 * VALID (see payment.service.js), never one without the other.
 */
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = withTransaction;
