import path from "node:path";
import fs from "node:fs";
import { randomUUID } from "node:crypto";

// Never served as static/public files — always read back through the
// admin-gated /api/admin/manual-payments/[id]/proof route. Created eagerly at
// module load so the disk destination exists before the first upload hits
// it, mirroring gold_wallet/server's kyc.storage.js.
export const UPLOAD_DIR = path.join(process.cwd(), "uploads", "payment-proofs");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const MAX_BYTES = 5 * 1024 * 1024;

export async function saveProofImage(file: File): Promise<string> {
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) throw new Error("Proof image must be a JPEG, PNG, or WebP file");
  if (file.size > MAX_BYTES) throw new Error("Proof image must be 5MB or smaller");

  const filename = `${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.promises.writeFile(path.join(UPLOAD_DIR, filename), buffer);
  return filename;
}

export function contentTypeFor(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}
