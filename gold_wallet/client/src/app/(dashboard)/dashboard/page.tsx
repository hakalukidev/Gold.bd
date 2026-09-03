import { redirect } from "next/navigation";

/** The home screen moved to /market (see market/page.tsx). Kept as a redirect so
 * the old /dashboard URL — bookmarks, anything still linking to it — lands on it
 * instead of 404ing, the same way /products redirects to /products/gold. */
export default function DashboardRedirect() {
  redirect("/market");
}
