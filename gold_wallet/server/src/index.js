const env = require("./config/env");
const app = require("./app");
const pool = require("./db/pool");
const logger = require("./utils/logger");

const server = app.listen(env.PORT, () => {
  logger.info(`wallet_server listening on port ${env.PORT} (${env.NODE_ENV})`);
});

async function shutdown(signal) {
  logger.info(`${signal} received, shutting down`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
  // Force-exit if connections don't drain in time.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (err) => {
  logger.error({ err }, "Unhandled promise rejection");
});
