const path = require("node:path");
const fs = require("node:fs/promises");
const HttpError = require("../../utils/http-error");
const kycRepo = require("../../repositories/kyc.repository");
const userRepo = require("../../repositories/user.repository");
const { UPLOAD_DIR } = require("./kyc.storage");

const DOCUMENT_FIELD_COLUMN = {
  nidFront: "nidFrontPath",
  nidBack: "nidBackPath",
  selfie: "selfiePath",
};

function maskNid(nidNumber) {
  return nidNumber.length > 4 ? `${"•".repeat(nidNumber.length - 4)}${nidNumber.slice(-4)}` : nidNumber;
}

function toClientProfile(profile) {
  if (!profile) return null;
  return {
    id: profile.id,
    nidNumber: maskNid(profile.nidNumber),
    status: profile.status,
    rejectReason: profile.rejectReason,
  };
}

async function deleteFileQuiet(filename) {
  if (!filename) return;
  try {
    await fs.unlink(path.join(UPLOAD_DIR, filename));
  } catch {
    // Best-effort cleanup — a file that's already gone (or never existed) isn't fatal.
  }
}

async function submit(userId, { fullName, dob, nidNumber }, files) {
  const nidFront = files?.nidFront?.[0];
  const nidBack = files?.nidBack?.[0];
  const selfie = files?.selfie?.[0];
  if (!nidFront || !nidBack || !selfie) {
    throw new HttpError(400, "nidFront, nidBack and selfie must each be a JPEG, PNG or WEBP image up to 5MB");
  }

  const existing = await kycRepo.findByUserId(userId);
  if (existing && existing.status !== "REJECTED") {
    await Promise.all([nidFront, nidBack, selfie].map((f) => deleteFileQuiet(f.filename)));
    throw new HttpError(
      409,
      existing.status === "APPROVED" ? "Your account is already verified" : "Your verification is already under review"
    );
  }

  const duplicate = await kycRepo.findByNidNumber(nidNumber);
  if (duplicate && duplicate.userId !== userId) {
    await Promise.all([nidFront, nidBack, selfie].map((f) => deleteFileQuiet(f.filename)));
    throw new HttpError(409, "This NID number is already registered to another account");
  }

  const profile = await kycRepo.upsert({
    userId,
    fullName,
    dob: dob || null,
    nidNumber,
    nidFrontPath: nidFront.filename,
    nidBackPath: nidBack.filename,
    selfiePath: selfie.filename,
  });

  // Resubmission after a rejection: the row above now points at the fresh
  // set of files, so the previous (rejected) images can be dropped from disk.
  if (existing) {
    await Promise.all([existing.nidFrontPath, existing.nidBackPath, existing.selfiePath].map(deleteFileQuiet));
  }

  await userRepo.updateKycStatus(userId, "PENDING");
  return toClientProfile(profile);
}

async function getStatus(userId) {
  return toClientProfile(await kycRepo.findByUserId(userId));
}

async function resolveDocument({ kycId, field, requesterId, requesterRole }) {
  const column = DOCUMENT_FIELD_COLUMN[field];
  if (!column) throw new HttpError(404, "Not found");

  const profile = await kycRepo.findById(kycId);
  if (!profile) throw new HttpError(404, "Not found");
  if (profile.userId !== requesterId && requesterRole !== "ADMIN") {
    throw new HttpError(403, "Not allowed");
  }

  const filename = profile[column];
  const ext = path.extname(filename).toLowerCase();
  const contentType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
  return { path: path.join(UPLOAD_DIR, filename), contentType };
}

async function adminList({ status, limit, offset }) {
  const rows = await kycRepo.listByStatus({
    status: status || "PENDING",
    limit: Math.min(Number(limit) || 20, 50),
    offset: Number(offset) || 0,
  });

  return Promise.all(
    rows.map(async (row) => {
      const applicant = await userRepo.findById(row.userId);
      return {
        ...toClientProfile(row),
        fullName: row.fullName,
        phone: applicant?.phone ?? null,
        submittedAt: row.createdAt,
      };
    })
  );
}

async function review({ id, decision, rejectReason, reviewedBy }) {
  const profile = await kycRepo.findById(id);
  if (!profile) throw new HttpError(404, "Not found");
  if (profile.status !== "PENDING") {
    throw new HttpError(409, "This submission has already been reviewed");
  }

  const updated = await kycRepo.setDecision({
    id,
    status: decision,
    rejectReason: decision === "REJECTED" ? rejectReason : null,
    reviewedBy,
  });
  await userRepo.updateKycStatus(profile.userId, decision);
  return toClientProfile(updated);
}

module.exports = { submit, getStatus, resolveDocument, adminList, review };
