import { handleGetRate } from "@/lib/rate-handlers";

/** ?karat=22k|21k|18k|sonaton picks the grade; omitted, this keeps returning
 * the 22K anchor every other consumer of this route already relies on. */
export const GET = handleGetRate("silver");
