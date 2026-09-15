import { makeRedirectHandler } from "@/lib/payments/redirect-handler";

export const POST = makeRedirectHandler("FAILED");
export const GET = makeRedirectHandler("FAILED");
