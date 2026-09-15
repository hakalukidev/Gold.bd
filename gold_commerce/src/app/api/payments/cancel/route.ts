import { makeRedirectHandler } from "@/lib/payments/redirect-handler";

export const POST = makeRedirectHandler("CANCELLED");
export const GET = makeRedirectHandler("CANCELLED");
