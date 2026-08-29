import { redirect } from "next/navigation";

// `/products` has no catalog of its own anymore — gold and silver each get
// their own page under `/products/[metal]` so switching metal is a real
// navigation, not a client-side toggle. Land visitors on gold by default.
export default function ProductsPage() {
  redirect("/products/gold");
}
