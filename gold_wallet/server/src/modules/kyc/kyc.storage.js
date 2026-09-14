const path = require("node:path");
const fs = require("node:fs");

// Never served as static/public files — always read back through
// kyc.controller.js#getDocument, which checks the requester owns the profile
// (or is an admin) before streaming one. Created eagerly at require time so
// the disk destination exists before the first multer upload hits it.
const UPLOAD_DIR = path.join(__dirname, "../../../uploads/kyc");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

module.exports = { UPLOAD_DIR };
