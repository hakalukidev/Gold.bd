import { cn } from "@/lib/utils"

/** Pulsing placeholder block for content still loading — sized per use-site
 * via `className` (a `h-*`/`w-*` pair matching the real content's footprint)
 * so nothing reflows once the data arrives. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="skeleton" role="status" aria-label="Loading" className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />
}

export { Skeleton }
