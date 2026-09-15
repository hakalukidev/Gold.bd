import { handleGetRateHistory } from "@/lib/rate-handlers";

/** ?karat=22k|21k|18k|sonaton picks the grade; omitted, this keeps returning
 * the 22K anchor history every other consumer of this route already relies on. */
export const GET = handleGetRateHistory("gold");
