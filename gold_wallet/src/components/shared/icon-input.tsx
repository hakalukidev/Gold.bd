import type { LucideIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** `Input` with a leading icon — used for phone/password/amount-style fields
 * on the auth and trade forms. Forwards everything (including `ref`, via
 * React 19's ref-as-prop) straight through to `Input`. */
export function IconInput({ icon: Icon, className, ...props }: ComponentProps<typeof Input> & { icon: LucideIcon }) {
  return (
    <div className="relative">
      <Icon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        strokeWidth={1.75}
      />
      <Input className={cn("pl-8", className)} {...props} />
    </div>
  );
}
