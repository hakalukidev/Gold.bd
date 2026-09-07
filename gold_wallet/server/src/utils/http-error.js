class HttpError extends Error {
  constructor(statusCode, message, fieldErrors) {
    super(message);
    this.statusCode = statusCode;
    this.fieldErrors = fieldErrors;
  }
}

module.exports = HttpError;
