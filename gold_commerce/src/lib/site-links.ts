/**
 * Cross-app links. The customer wallet (sign-in, dashboard, buy/sell) is a
 * separate Next.js app served on its own origin — see `gold_wallet/client` —
 * so these have to be absolute URLs rendered as plain `<a>` elements, not
 * `next/link` routes: there is no page for them in this app's router.
 *
 * `NEXT_PUBLIC_WALLET_URL` is inlined at build time, so it must be set in the
 * environment the commerce app is *built* in, not just where it runs. The
 * fallback is the port `gold_wallet/client` uses in local dev.
 */
export const WALLET_URL = process.env.NEXT_PUBLIC_WALLET_URL ?? "http://localhost:3001";

/** No trailing slash on WALLET_URL, so paths concatenate cleanly. */
const walletUrl = (path: string) => `${WALLET_URL.replace(/\/$/, "")}${path}`;

/** "Gold Wallet" / sign-in entry point in the navbar. */
export const WALLET_SIGN_IN_URL = walletUrl("/login");

/** "Open an account" CTAs on the landing and buying-guide pages. */
export const WALLET_REGISTER_URL = walletUrl("/register");
