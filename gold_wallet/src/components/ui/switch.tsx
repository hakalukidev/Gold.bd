"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        // dark:bg-input/80 and data-checked:bg-gold are both single-class-
        // specificity rules — without dark:data-checked: too, dark mode's
        // unchecked-track color wins the cascade even while checked.
        "peer inline-flex h-5 w-8.5 shrink-0 items-center rounded-full border border-transparent bg-input p-0.5 outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-checked:bg-gold dark:bg-input/80 dark:data-checked:bg-gold",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="block size-4 rounded-full bg-background shadow-sm transition-transform data-checked:translate-x-3.5 data-unchecked:translate-x-0"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
