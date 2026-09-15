import path from "node:path";
import fs from "node:fs";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { getProofImagePath, HttpError } from "@/lib/payments/manual-payments-service";
import { UPLOAD_DIR, contentTypeFor } from "@/lib/payments/proof-storage";

/** Streams a bank-transfer proof screenshot — never a public URL, only
 * reachable through this admin-gated route, mirroring gold_wallet/server's
 * kyc.controller.js#getDocument. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  try {
    const filename = await getProofImagePath(id);
    if (!filename) return new NextResponse("No proof image for this payment", { status: 404 });

    const filePath = path.join(UPLOAD_DIR, filename);
    const data = await fs.promises.readFile(filePath);
    return new NextResponse(new Uint8Array(data), {
      headers: { "Content-Type": contentTypeFor(filename), "Cache-Control": "private, no-store" },
    });
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 404;
    return new NextResponse("Not found", { status });
  }
}
