const pino = require("pino");
const env = require("../config/env");

const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  transport: env.NODE_ENV === "production" ? undefined : { target: "pino-pretty" },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.password",
      "*.token",
      "*.accessToken",
      "*.refreshToken",
    ],
    censor: "[redacted]",
  },
});

module.exports = logger;
