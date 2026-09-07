/**
 * Cross-app links. The public storefront (landing, products, calculator,
 * admin) is a separate Next.js app served on its own origin — see
 * `gold_commerce` — so a "back to the site" link has to be an absolute URL on
 * a plain `<a>`, not a `next/link` route: this app's router has no `/` page
 * beyond the redirect into the wallet.
 *
 * `NEXT_PUBLIC_COMMERCE_URL` is inlined at build time, so it must be set in
 * the environment this app is *built* in, not just where it runs. The fallback
 * is the port `gold_commerce` uses in local dev.
 */
export const COMMERCE_URL = process.env.NEXT_PUBLIC_COMMERCE_URL ?? "http://localhost:3000";
