/** Long-lived anonymous cookie used to tell repeat visits from the same
 * browser apart from new ones — set by POST /api/visits, read there and
 * nowhere else. Not tied to a user account; this exists purely so
 * "unique visitors" means something. */
export const VISITOR_COOKIE = "gold_bd_visitor_id";
