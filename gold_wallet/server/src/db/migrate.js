#!/usr/bin/env node
/**
 * Minimal migration runner: applies every .sql file in db/migrations, in
 * filename order, that isn't already recorded in schema_migrations. Each
 * migration runs inside its own transaction.
 */
const fs = require("node:fs");
const path = require("node:path");
const pool = require("./pool");
const logger = require("../utils/logger");

const MIGRATIONS_DIR = path.join(__dirname, "migrations");

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name        TEXT PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function run() {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    const { rows } = await client.query("SELECT name FROM schema_migrations");
    const applied = new Set(rows.map((r) => r.name));

    for (const file of files) {
      if (applied.has(file)) continue;

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
      logger.info(`Applying migration ${file}`);
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }
    logger.info("Migrations up to date");
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  logger.error({ err }, "Migration failed");
  process.exit(1);
});
