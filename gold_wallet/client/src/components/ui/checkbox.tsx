"use client"

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        // data-checked:bg-gold is repeated under dark: for the same reason the
        // Switch does it — dark:bg-input/30 would otherwise win while checked.
        "peer flex size-4.5 shrink-0 items-center justify-center rounded-[5px] border border-input bg-transparent text-ink outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-checked:border-gold data-checked:bg-gold dark:bg-input/30 dark:data-checked:border-gold dark:data-checked:bg-gold",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current"
      >
        <CheckIcon className="size-3" strokeWidth={3.5} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
