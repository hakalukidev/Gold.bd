const crypto = require("node:crypto");
const path = require("node:path");
const fs = require("node:fs/promises");
const { Router } = require("express");
const multer = require("multer");
const controller = require("./gift-coin.controller");
const { createGiftCoinOrderSchema } = require("./gift-coin.validation");
const { requireAuth } = require("../../middleware/auth");
const requireAdmin = require("../../middleware/require-admin");
const { tradeLimiter } = require("../../middleware/rate-limit");
const HttpError = require("../../utils/http-error");
const { UPLOAD_DIR } = require("./gift-coin.storage");

const ALLOWED_MIME_EXT = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${ALLOWED_MIME_EXT[file.mimetype] || ""}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, Boolean(ALLOWED_MIME_EXT[file.mimetype])),
});

const photoField = upload.single("photo");

function handleUpload(req, res, next) {
  photoField(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return next(new HttpError(400, err.code === "LIMIT_FILE_SIZE" ? "The coin photo must be 5MB or smaller" : "Invalid file upload"));
    }
    if (err) return next(err);
    next();
  });
}

// multer writes the file to disk before req.body is validated — same
// leaked-file risk kyc.routes.js guards against, same fix.
function validateBody(req, res, next) {
  const result = createGiftCoinOrderSchema.safeParse(req.body);
  if (!result.success) {
    if (req.file) fs.unlink(path.join(UPLOAD_DIR, req.file.filename)).catch(() => {});
    return res.status(400).json({ success: false, error: "Invalid input", fieldErrors: result.error.flatten().fieldErrors });
  }
  req.body = result.data;
  next();
}

const router = Router();

// Mounted at /api in app.js -> /api/gift-coins, /api/admin/gift-coins/*.
router.post("/gift-coins", requireAuth, tradeLimiter, handleUpload, validateBody, controller.create);

router.get("/admin/gift-coins", requireAuth, requireAdmin, controller.adminList);
router.get("/admin/gift-coins/:id/photo", requireAuth, requireAdmin, controller.adminGetPhoto);
router.post("/admin/gift-coins/:id/fulfill", requireAuth, requireAdmin, controller.adminFulfill);

module.exports = router;
