import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { listOrders } from "@/lib/orders/orders-service";
import type { AdminOrder, ApiResponse } from "@/types";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const data = await listOrders();
  const body: ApiResponse<AdminOrder[]> = { success: true, data };
  return NextResponse.json(body);
}
