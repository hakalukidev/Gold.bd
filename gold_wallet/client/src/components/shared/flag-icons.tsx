import type { SVGProps } from "react";

/** UK flag (Union Jack) badge — layered in the real flag's order (blue field,
 * then the white St Andrew's/St Patrick's diagonal with its red fimbriation,
 * then the white St George's cross with its own thinner red one on top), so
 * it still reads correctly at the ~16-20px this renders at in the language
 * chip rather than blurring into a plain blue-red smear. */
export function UkFlagIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 18" {...props}>
      <rect width="24" height="18" fill="#012169" />
      <line x1="0" y1="0" x2="24" y2="18" stroke="#fff" strokeWidth="4" />
      <line x1="24" y1="0" x2="0" y2="18" stroke="#fff" strokeWidth="4" />
      <line x1="0" y1="0" x2="24" y2="18" stroke="#c8102e" strokeWidth="1.6" />
      <line x1="24" y1="0" x2="0" y2="18" stroke="#c8102e" strokeWidth="1.6" />
      <rect x="0" y="6.5" width="24" height="5" fill="#fff" />
      <rect x="9.5" y="0" width="5" height="18" fill="#fff" />
      <rect x="0" y="7.7" width="24" height="2.6" fill="#c8102e" />
      <rect x="10.7" y="0" width="2.6" height="18" fill="#c8102e" />
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
