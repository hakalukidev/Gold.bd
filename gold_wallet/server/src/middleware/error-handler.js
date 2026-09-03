const HttpError = require("../utils/http-error");
const logger = require("../utils/logger");
const env = require("../config/env");

function notFoundHandler(req, res) {
  res.status(404).json({ success: false, error: "Not found" });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(err.fieldErrors ? { fieldErrors: err.fieldErrors } : {}),
    });
  }

  // Malformed JSON bodies land here as a SyntaxError from express.json().
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, error: "Malformed request body" });
  }

  logger.error({ err }, "Unhandled error");
  res.status(500).json({
    success: false,
    error: env.NODE_ENV === "production" ? "Internal server error" : err.message,
  });
}

module.exports = { notFoundHandler, errorHandler };
