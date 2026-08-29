/** Shared between the login/logout route handlers (which set/clear it) and
 * the protected admin layout (which reads it). Just a presence flag, not a
 * signed token — see mock-admin-auth.ts for why that's fine here. */
export const ADMIN_SESSION_COOKIE = "gold_bd_admin_session";
