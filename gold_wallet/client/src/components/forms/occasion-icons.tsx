import { useId } from "react";
import type { SVGProps } from "react";

/**
 * Flat vector icons for the gift-gold occasion cards — gradient-shaded gold
 * line art in the same spirit as landing/dollar-coin-icon.tsx, rather than
 * the photographic occasion cards these replace. Each icon owns its gradient
 * ids via useId() so four copies rendered side by side (one per occasion)
 * never collide.
 */

const GOLD_STOPS = [
  { offset: "0%", color: "#fff3b0" },
  { offset: "45%", color: "#e0ac26" },
  { offset: "100%", color: "#8a5c10" },
] as const;

const GOLD_DARK_STOPS = [
  { offset: "0%", color: "#d4a62a" },
  { offset: "100%", color: "#6b4a10" },
] as const;

function GoldDefs({ id, darkId }: { id: string; darkId: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="0.1" y1="0" x2="0.9" y2="1">
        {GOLD_STOPS.map((s) => (
          <stop key={s.offset} offset={s.offset} stopColor={s.color} />
        ))}
      </linearGradient>
      <linearGradient id={darkId} x1="0" y1="0" x2="1" y2="1">
        {GOLD_DARK_STOPS.map((s) => (
          <stop key={s.offset} offset={s.offset} stopColor={s.color} />
        ))}
      </linearGradient>
    </defs>
  );
}

/** A four-point sparkle, reused for stars/glints across the set. */
function Sparkle({ cx, cy, r, fill }: { cx: number; cy: number; r: number; fill: string }) {
  return (
    <path
      d={`M ${cx} ${cy - r} Q ${cx} ${cy} ${cx + r} ${cy} Q ${cx} ${cy} ${cx} ${cy + r} Q ${cx} ${cy} ${cx - r} ${cy} Q ${cx} ${cy} ${cx} ${cy - r} Z`}
      fill={fill}
    />
  );
}

/** Crescent moon (mask-cut circle) cradling a domed mosque silhouette. */
export function EidIcon(props: SVGProps<SVGSVGElement>) {
  const uid = useId();
  const goldId = `${uid}-gold`;
  const darkId = `${uid}-dark`;
  const maskId = `${uid}-mask`;

  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" {...props}>
      <GoldDefs id={goldId} darkId={darkId} />
      <mask id={maskId}>
        <rect width="48" height="48" fill="white" />
        <circle cx="27.5" cy="15.5" r="10.5" fill="black" />
      </mask>

      <circle cx="22" cy="18" r="12.5" fill={`url(#${goldId})`} mask={`url(#${maskId})`} />
      <Sparkle cx={36} cy={10} r={1.6} fill={`url(#${goldId})`} />
      <Sparkle cx={41} cy={18} r={1.1} fill={`url(#${goldId})`} />
      <Sparkle cx={8} cy={9} r={1.1} fill={`url(#${goldId})`} />

      {/* mosque silhouette, sitting low so the crescent reads as a night sky above it */}
      <g fill={`url(#${darkId})`}>
        <rect x="8" y="30" width="3" height="12" rx="1" />
        <circle cx="9.5" cy="27.5" r="2.2" />
        <rect x="37" y="30" width="3" height="12" rx="1" />
        <circle cx="38.5" cy="27.5" r="2.2" />
        <rect x="13" y="34" width="22" height="8" rx="1" />
        <path d="M15 34 Q24 20 33 34 Z" />
        <rect x="22.5" y="16" width="3" height="6" />
        <circle cx="24" cy="14.5" r="2.4" />
      </g>
      <rect x="17" y="37" width="4" height="5" rx="0.5" fill="#0d0d0d" opacity="0.4" />
      <rect x="27" y="37" width="4" height="5" rx="0.5" fill="#0d0d0d" opacity="0.4" />
    </svg>
  );
}

/** Two interlocked rings with a small cut-gem on the forward ring. */
export function WeddingIcon(props: SVGProps<SVGSVGElement>) {
  const uid = useId();
  const goldId = `${uid}-gold`;
  const darkId = `${uid}-dark`;

  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" {...props}>
      <GoldDefs id={goldId} darkId={darkId} />
      <circle cx="18" cy="29" r="10" fill="none" stroke={`url(#${darkId})`} strokeWidth="3" />
      <circle cx="30" cy="29" r="10" fill="none" stroke={`url(#${goldId})`} strokeWidth="3" />
      {/* gem + prongs on the upper ring */}
      <path d="M30 13.5 L34 19 L30 24 L26 19 Z" fill={`url(#${goldId})`} />
      <path d="M26.5 18.5 L30 15.5 L33.5 18.5" fill="none" stroke={`url(#${goldId})`} strokeWidth="1.1" />
      <Sparkle cx={38} cy={12} r={1.6} fill={`url(#${goldId})`} />
      <Sparkle cx={10} cy={16} r={1.2} fill={`url(#${goldId})`} />
    </svg>
  );
}

/** A ribboned gift box with three balloons drifting above it on strings. */
export function BirthdayIcon(props: SVGProps<SVGSVGElement>) {
  const uid = useId();
  const goldId = `${uid}-gold`;
  const darkId = `${uid}-dark`;

  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" {...props}>
      <GoldDefs id={goldId} darkId={darkId} />

      {/* strings */}
      <g fill="none" stroke={`url(#${darkId})`} strokeWidth="0.8" opacity="0.8">
        <path d="M13 20 Q17 27 22 32" />
        <path d="M24 11 Q24 22 24 32" />
        <path d="M35 20 Q31 27 26 32" />
      </g>

      {/* balloons */}
      <ellipse cx="13" cy="13" rx="6.5" ry="8" fill={`url(#${darkId})`} />
      <ellipse cx="24" cy="9" rx="6.5" ry="8" fill={`url(#${goldId})`} />
      <ellipse cx="35" cy="13" rx="6" ry="7.5" fill={`url(#${darkId})`} />
      <ellipse cx="21.5" cy="6" rx="2" ry="1.1" fill="#fff6d5" opacity="0.6" transform="rotate(-20 21.5 6)" />

      {/* gift box */}
      <rect x="14" y="32" width="20" height="12" rx="1.5" fill={`url(#${darkId})`} />
      <rect x="22" y="32" width="4" height="12" fill={`url(#${goldId})`} />
      <rect x="14" y="36" width="20" height="4" fill={`url(#${goldId})`} />
      <path d="M24 32 C20 26 13 27 15 31 C16.5 33.5 21 33 24 32 Z" fill={`url(#${goldId})`} />
      <path d="M24 32 C28 26 35 27 33 31 C31.5 33.5 27 33 24 32 Z" fill={`url(#${goldId})`} />
    </svg>
  );
}

/** An overlapping pair of hearts, cradled by a slim laurel flourish. */
export function AnniversaryIcon(props: SVGProps<SVGSVGElement>) {
  const uid = useId();
  const goldId = `${uid}-gold`;
  const darkId = `${uid}-dark`;

  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" {...props}>
      <GoldDefs id={goldId} darkId={darkId} />

      {/* laurel flourish */}
      <g fill="none" stroke={`url(#${darkId})`} strokeWidth="1" opacity="0.85">
        <path d="M6 30 Q12 20 12 10" />
        <path d="M42 30 Q36 20 36 10" />
        {[0, 1, 2, 3].map((i) => (
          <ellipse key={`l${i}`} cx={9.5 - i * 0.6} cy={26 - i * 5.5} rx="2.6" ry="1.3" transform={`rotate(${-35 + i * 6} ${9.5 - i * 0.6} ${26 - i * 5.5})`} />
        ))}
        {[0, 1, 2, 3].map((i) => (
          <ellipse
            key={`r${i}`}
            cx={38.5 + i * 0.6}
            cy={26 - i * 5.5}
            rx="2.6"
            ry="1.3"
            transform={`rotate(${35 - i * 6} ${38.5 + i * 0.6} ${26 - i * 5.5})`}
          />
        ))}
      </g>

      <path
        d="M18 15 C11 15 8 22 12 27 C15 31 20 34 24 38 C28 34 33 31 36 27 C40 22 37 15 30 15 C27 15 24 17 24 21 C24 17 21 15 18 15 Z"
        fill={`url(#${goldId})`}
      />
      <ellipse cx="18" cy="20" rx="2.6" ry="1.6" fill="#fff6d5" opacity="0.5" transform="rotate(-25 18 20)" />
    </svg>
  );
}
