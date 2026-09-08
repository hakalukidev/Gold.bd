import type { SVGProps } from "react";

/** Simplified US flag badge (solid canton, no stars) for the language toggle
 * chip — it only ever renders at ~16px wide. */
export function UsFlagIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 18" {...props}>
      <rect width="24" height="18" fill="#fff" />
      {Array.from({ length: 7 }, (_, i) => (
        <rect key={i} y={i * (18 / 13)} width="24" height={18 / 13} fill="#b22234" />
      ))}
      <rect width="11" height="9.7" fill="#3c3b6e" />
    </svg>
  );
}

/** Bangladesh flag badge — green field, red disc set slightly toward the
 * hoist as on the real flag. */
export function BdFlagIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 18" {...props}>
      <rect width="24" height="18" fill="#006a4e" />
      <circle cx="10.5" cy="9" r="4.5" fill="#f42a41" />
    </svg>
  );
}
