import type { SVGProps } from "react";

/** Solid up/down triangle, like the arrow next to a price change on a ticker. */
export function TrendArrowIcon({
  direction = "up",
  ...props
}: SVGProps<SVGSVGElement> & { direction?: "up" | "down" }) {
  return (
    <svg viewBox="0 0 10 10" fill="currentColor" aria-hidden="true" {...props}>
      {direction === "up" ? <path d="M5 1.5 L9 8 L1 8 Z" /> : <path d="M5 8.5 L1 2 L9 2 Z" />}
    </svg>
  );
}
