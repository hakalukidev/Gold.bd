const crypto = require("node:crypto");
const path = require("node:path");
const fs = require("node:fs/promises");
const { Router } = require("express");
const multer = require("multer");
const controller = require("./kyc.controller");
const { submitKycSchema, reviewKycSchema } = require("./kyc.validation");
const { validateBody } = require("../../middleware/validate");
const { requireAuth } = require("../../middleware/auth");
const requireAdmin = require("../../middleware/require-admin");
const HttpError = require("../../utils/http-error");
const { UPLOAD_DIR } = require("./kyc.storage");

const ALLOWED_MIME_EXT = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${ALLOWED_MIME_EXT[file.mimetype] || ""}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 3 },
  // Silently drops a disallowed file (kyc.service.js then rejects the
  // submission for missing it with a clear message) rather than erroring out
  // of multer's own parsing, which would need MulterError-specific handling
  // to turn into this API's {success:false,error} envelope.
  fileFilter: (req, file, cb) => cb(null, Boolean(ALLOWED_MIME_EXT[file.mimetype])),
});

const documentFields = upload.fields([
  { name: "nidFront", maxCount: 1 },
  { name: "nidBack", maxCount: 1 },
  { name: "selfie", maxCount: 1 },
]);

// Wraps multer so a MulterError (oversized file, too many parts) becomes this
// API's standard error envelope instead of the raw 500 it would otherwise hit.
function handleUpload(req, res, next) {
  documentFields(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return next(new HttpError(400, err.code === "LIMIT_FILE_SIZE" ? "Each document must be 5MB or smaller" : "Invalid file upload"));
    }
    if (err) return next(err);
    next();
  });
}

// multer writes files to disk before req.body is validated, so a rejected
// body (bad NID format, missing name) would otherwise leak the 3 images it
// already saved — same {success:false,error} shape as the shared
// validateBody middleware, plus that cleanup.
function validateSubmitBody(req, res, next) {
  const result = submitKycSchema.safeParse(req.body);
  if (!result.success) {
    const files = ["nidFront", "nidBack", "selfie"].flatMap((field) => req.files?.[field] || []);
    Promise.all(files.map((f) => fs.unlink(path.join(UPLOAD_DIR, f.filename)).catch(() => {})));
    return res.status(400).json({ success: false, error: "Invalid input", fieldErrors: result.error.flatten().fieldErrors });
  }
  req.body = result.data;
  next();
}

const router = Router();

// Mounted at /api in app.js -> /api/kyc, /api/admin/kyc/*. Documents are
// never public: /api/kyc/documents/:id/:field always requires the caller to
// be the owning user or an admin (checked in kyc.service.js#resolveDocument).
router.get("/kyc", requireAuth, controller.getStatus);
router.post("/kyc", requireAuth, handleUpload, validateSubmitBody, controller.submit);
router.get("/kyc/documents/:id/:field", requireAuth, controller.getDocument);

router.get("/admin/kyc", requireAuth, requireAdmin, controller.adminList);
router.post("/admin/kyc/:id/review", requireAuth, requireAdmin, validateBody(reviewKycSchema), controller.adminReview);

module.exports = router;
