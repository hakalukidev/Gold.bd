import type { SVGProps } from "react";
import { BANGLADESH_DIVISIONS, BANGLADESH_SVG_HEIGHT, BANGLADESH_SVG_WIDTH } from "./bangladesh-geo";

export function BangladeshMapIcon({ strokeWidth = 1.5, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox={`0 0 ${BANGLADESH_SVG_WIDTH} ${BANGLADESH_SVG_HEIGHT}`}
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      {...props}
    >
      {BANGLADESH_DIVISIONS.map((division) => (
        <path key={division.id} d={division.d} />
      ))}
    </svg>
  );
}
