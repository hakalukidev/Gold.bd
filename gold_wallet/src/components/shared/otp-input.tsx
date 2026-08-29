"use client";
import { OTPField } from "@base-ui/react/otp-field";
import { cn } from "@/lib/utils";
/** Six-slot verification-code field. Base UI's OTP field owns the fiddly parts:
 * typing auto-advances, backspace steps back, pasting the whole code from an SMS
 * fills every slot, and the slots carry `autocomplete="one-time-code"` so iOS and
 * Android offer the code straight from the notification — no paste button needed. */
export function OtpInput({
  length = 6,
  className,
  ...props
}: Omit<OTPField.Root.Props, "length"> & { length?: number }) {
  return (
    <OTPField.Root
      length={length}
      inputMode="numeric"
      className={cn("flex items-center gap-2 sm:gap-2.5", className)}
      {...props}
    >
      {/* Slots take their index from render order — Base UI tracks them itself. */}
      {Array.from({ length }, (_, index) => (
        <OTPField.Input
          key={index}
          className="h-13 w-full min-w-0 flex-1 rounded-md border border-input bg-transparent text-center text-lg font-semibold tabular-nums transition-colors outline-none focus-visible:border-gold focus-visible:ring-3 focus-visible:ring-gold/25 disabled:pointer-events-none disabled:opacity-50 data-filled:border-gold/60 dark:bg-input/30"
        />
      ))}
    </OTPField.Root>
  );
}
