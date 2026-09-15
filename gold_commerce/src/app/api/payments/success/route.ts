import { makeRedirectHandler } from "@/lib/payments/redirect-handler";

export const POST = makeRedirectHandler("VALID");
export const GET = makeRedirectHandler("VALID");
