import { useId } from "react";
import type { CSSProperties } from "react";

/**
 * Decorative open treasure chest with spilling coins and bars — a hand-drawn
 * SVG rather than a stock photo, matching how the rest of the site draws its
 * own bullion art (see the calculator page's GoldBar/BalanceScale and
 * dollar-coin-icon.tsx) instead of embedding external images. Meant to sit
 * large and faint behind a page as ambient decoration, not as a focal image
 * — callers control size/opacity/position via `className`.
 */
export function GoldTreasureBg({ className, style }: { className?: string; style?: CSSProperties }) {
  const uid = useId();
  const woodId = `${uid}-wood`;
  const goldId = `${uid}-gold`;
  const coinId = `${uid}-coin`;

  return (
    <svg viewBox="0 0 600 400" className={className} style={style} aria-hidden="true" preserveAspectRatio="xMidYMax slice">
      <defs>
        <linearGradient id={woodId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5c3a1e" />
          <stop offset="100%" stopColor="#2a1a0d" />
        </linearGradient>
        <linearGradient id={goldId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f4c64e" />
          <stop offset="50%" stopColor="#d4a62a" />
          <stop offset="100%" stopColor="#8a6a1c" />
        </linearGradient>
        <radialGradient id={coinId} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#fff6d5" />
          <stop offset="45%" stopColor="#e8c66a" />
          <stop offset="100%" stopColor="#a06f14" />
        </radialGradient>
      </defs>

      {/* open lid, seen from the front as an arch behind the box */}
      <path d={`M150 262 C150 150 450 150 450 262 Z`} fill={`url(#${woodId})`} stroke={`url(#${goldId})`} strokeWidth="5" />
      <path d="M168 258 C168 168 432 168 432 258" fill="none" stroke={`url(#${goldId})`} strokeWidth="2" opacity="0.6" />

      {/* gold bars leaning against the chest */}
      <g transform="translate(455,300) rotate(18)">
        <rect width="76" height="36" rx="3" fill={`url(#${goldId})`} stroke="#5c4110" strokeWidth="1.5" />
      </g>
      <g transform="translate(90,308) rotate(-14)">
        <rect width="66" height="32" rx="3" fill={`url(#${goldId})`} stroke="#5c4110" strokeWidth="1.5" />
      </g>

      {/* coin pile spilling out of the opening */}
      {[
        { cx: 190, cy: 250, r: 24 },
        { cx: 232, cy: 232, r: 28 },
        { cx: 278, cy: 246, r: 22 },
        { cx: 318, cy: 224, r: 30 },
        { cx: 362, cy: 244, r: 24 },
        { cx: 404, cy: 228, r: 26 },
        { cx: 210, cy: 288, r: 20 },
        { cx: 260, cy: 300, r: 18 },
        { cx: 340, cy: 296, r: 19 },
        { cx: 390, cy: 284, r: 21 },
      ].map((c, i) => (
        <circle key={i} cx={c.cx} cy={c.cy} r={c.r} fill={`url(#${coinId})`} stroke="#8a6a1c" strokeWidth="2" />
      ))}

      {/* chest body (front box), drawn last so the lid/coins read as behind/inside it */}
      <rect x="150" y="262" width="300" height="108" rx="12" fill={`url(#${woodId})`} stroke={`url(#${goldId})`} strokeWidth="5" />
      {[190, 240, 290, 340, 390].map((x) => (
        <rect key={x} x={x} y="262" width="8" height="108" fill={`url(#${goldId})`} opacity="0.85" />
      ))}
      <rect x="278" y="250" width="44" height="36" rx="6" fill={`url(#${goldId})`} stroke="#5c4110" strokeWidth="1.5" />
      <circle cx="300" cy="268" r="4" fill="#5c4110" />
    </svg>
  );
}
