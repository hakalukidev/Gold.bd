import type { ReactNode, SVGProps } from "react";

/**
 * "Download on the App Store" / "Get it on Google Play" store badges, drawn
 * in-repo the same way social-icons.tsx draws its marks — the official badge
 * artwork isn't checked in, so these rebuild the familiar dark pill (brand
 * glyph + eyebrow + wordmark) from the ink/gold palette instead. Swap the
 * glyphs for the real downloaded badge images once the apps actually ship.
 */

function AppleGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M16.37 1.43c0 1.14-.42 2.2-1.14 3.02-.85.98-2.23 1.74-3.35 1.65a3.66 3.66 0 0 1 1.16-2.9c.77-.83 2.11-1.5 3.32-1.55.01.06.01.12.01.18Zm1.23 5.91c-1.86-.11-3.44 1.06-4.33 1.06-.9 0-2.26-1.01-3.72-.98-1.92.03-3.69 1.12-4.68 2.84-2 3.46-.51 8.58 1.43 11.39.95 1.37 2.08 2.9 3.57 2.85 1.43-.06 1.97-.93 3.7-.93 1.73 0 2.22.93 3.73.9 1.54-.03 2.51-1.39 3.45-2.77 1.09-1.59 1.54-3.13 1.56-3.21-.03-.01-2.99-1.15-3.02-4.56-.03-2.85 2.32-4.21 2.43-4.28-1.33-1.96-3.4-2.18-4.12-2.23Z" />
    </svg>
  );
}

function GooglePlayGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M3.61 1.81 13.79 12 3.61 22.19a1 1 0 0 1-.61-.92V2.73a1 1 0 0 1 .61-.92Z" fill="#00A0FF" />
      <path d="m17.11 15.32-3.32-3.32 3.32-3.32 4.05 2.3c.98.55.98 1.49 0 2.05l-4.05 2.29Z" fill="#FFBC00" />
      <path d="m17.11 15.32-3.32-3.32L3.61 22.19c.32.34.86.38 1.46.04l12.04-6.91Z" fill="#FF3A44" />
      <path d="M17.11 8.68 5.07 1.77c-.6-.34-1.14-.3-1.46.04L13.79 12l3.32-3.32Z" fill="#00C853" />
    </svg>
  );
}

type StoreBadgeProps = {
  href: string;
  eyebrow: string;
  store: string;
};

function StoreBadge({ href, eyebrow, store, children }: StoreBadgeProps & { children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${eyebrow} ${store}`}
      className="flex items-center gap-2.5 rounded-md border border-white/15 bg-white/5 px-3 py-2 transition-colors hover:border-gold/40 hover:bg-white/10"
    >
      {children}
      <span className="flex flex-col leading-tight">
        <span className="text-[10px] text-neutral-400">{eyebrow}</span>
        <span className="text-sm font-semibold text-white">{store}</span>
      </span>
    </a>
  );
}

export function AppStoreBadge(props: StoreBadgeProps) {
  return (
    <StoreBadge {...props}>
      <AppleGlyph className="size-6 shrink-0 text-white" />
    </StoreBadge>
  );
}

export function GooglePlayBadge(props: StoreBadgeProps) {
  return (
    <StoreBadge {...props}>
      <GooglePlayGlyph className="size-6 shrink-0" />
    </StoreBadge>
  );
}
