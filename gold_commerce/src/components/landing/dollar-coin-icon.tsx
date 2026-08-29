import { useId } from "react";
import type { SVGProps } from "react";

const COIN_TONES = {
  gold: {
    rim: [
      { offset: "0%", color: "#fff3b0" },
      { offset: "45%", color: "#e0ac26" },
      { offset: "100%", color: "#8a5c10" },
    ],
    face: [
      { offset: "0%", color: "#fff6d5" },
      { offset: "45%", color: "#e8c66a" },
      { offset: "100%", color: "#a06f14" },
    ],
    sign: [
      { offset: "0%", color: "#fffef2" },
      { offset: "100%", color: "#e8c66a" },
    ],
  },
  silver: {
    rim: [
      { offset: "0%", color: "#f8fafc" },
      { offset: "45%", color: "#b6bec8" },
      { offset: "100%", color: "#5b6470" },
    ],
    face: [
      { offset: "0%", color: "#ffffff" },
      { offset: "45%", color: "#c7ced6" },
      { offset: "100%", color: "#6b7280" },
    ],
    sign: [
      { offset: "0%", color: "#ffffff" },
      { offset: "100%", color: "#e3e7ea" },
    ],
  },
} as const;

/**
 * A glossy coin badge — beveled rim, a radially-shaded face with a
 * reflection streak, and an embossed dollar sign, matching a reference "$"
 * coin photo. `variant` swaps gold/silver tones without touching the shape.
 * Gradient ids are per-instance (useId) so multiple copies on one page don't
 * collide.
 */
function CoinIcon({ variant, ...props }: SVGProps<SVGSVGElement> & { variant: keyof typeof COIN_TONES }) {
  const uid = useId();
  const rimId = `${uid}-rim`;
  const faceId = `${uid}-face`;
  const signId = `${uid}-sign`;
  const tones = COIN_TONES[variant];

  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" {...props}>
      <defs>
        <linearGradient id={rimId} x1="0.15" y1="0.1" x2="0.9" y2="0.95">
          {tones.rim.map((s) => (
            <stop key={s.offset} offset={s.offset} stopColor={s.color} />
          ))}
        </linearGradient>
        <radialGradient id={faceId} cx="35%" cy="30%" r="75%">
          {tones.face.map((s) => (
            <stop key={s.offset} offset={s.offset} stopColor={s.color} />
          ))}
        </radialGradient>
        <linearGradient id={signId} x1="0" y1="0" x2="0" y2="1">
          {tones.sign.map((s) => (
            <stop key={s.offset} offset={s.offset} stopColor={s.color} />
          ))}
        </linearGradient>
      </defs>

      <circle cx="24" cy="24" r="22" fill={`url(#${rimId})`} />
      <circle cx="24" cy="24" r="18.5" fill={`url(#${faceId})`} stroke="rgba(0,0,0,0.25)" strokeWidth="0.5" />

      {/* glossy reflection streak, like light catching the polished face */}
      <ellipse cx="17" cy="15" rx="9" ry="4" fill="#ffffff" opacity="0.35" transform="rotate(-25 17 15)" />

      <text
        x="24"
        y="25.5"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight="700"
        fontSize="22"
        fill={`url(#${signId})`}
        stroke="rgba(0,0,0,0.3)"
        strokeWidth="0.4"
      >
        $
      </text>
    </svg>
  );
}

export function GoldCoinIcon(props: SVGProps<SVGSVGElement>) {
  return <CoinIcon variant="gold" {...props} />;
}

export function SilverCoinIcon(props: SVGProps<SVGSVGElement>) {
  return <CoinIcon variant="silver" {...props} />;
}
