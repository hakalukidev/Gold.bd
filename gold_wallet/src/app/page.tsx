import { redirect } from "next/navigation";

/** This app is only the signed-in wallet — the marketing site lives in
 * `gold_commerce` on its own origin. Nothing renders at `/`, so send visitors
 * straight to the wallet; an unauthenticated one gets bounced on to /login
 * from there once the server's session check says so. */
export default function WalletRootPage() {
  redirect("/wallet");
}
