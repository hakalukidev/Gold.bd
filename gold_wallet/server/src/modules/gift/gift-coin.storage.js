const path = require("node:path");
const fs = require("node:fs");

// Never served as static/public files — always read back through
// gift-coin.controller.js#getPhoto, which is admin-only. Created eagerly at
// require time so the disk destination exists before the first multer
// upload hits it.
const UPLOAD_DIR = path.join(__dirname, "../../../uploads/gift-coins");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

module.exports = { UPLOAD_DIR };
