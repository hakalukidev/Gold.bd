"use client";

import { useId, useState } from "react";
import { formatBDT, formatBDTShort } from "@/lib/format";
import type { Metal } from "@/lib/mock-rates";
import type { MetalRateSummary } from "@/types";

const WIDTH = 680;
const HEIGHT = 260;
// The right gutter is wide when a holding axis is drawn, narrow when it isn't.
const PAD = { top: 20, right: 16, bottom: 26, left: 52 };
const HOLDING_AXIS_WIDTH = 46;

/** Line colours picked to hold up against both the light and dark dashboard
 * themes — the brand gold, and a slate that reads as silver without vanishing
 * into a white card the way `--color-silver` would. */
export const METAL_CHART_COLOR: Record<Metal, string> = {
  gold: "#d4a62a",
  silver: "#7f8c9b",
};

export interface PricePoint {
  /** x-axis label, already formatted for the active range ("17 Aug", "Mar 25"). */
  label: string;
  /** Fuller date, for the hover tooltip. */
  caption: string;
  pricePerGram: number;
}

/** Turns a raw rate-history series into the chart's point format — shared by
 * every call site so a daily/monthly series always labels itself the same
 * way, whether that's the Market page's range toggle or a single fixed
 * series elsewhere. */
export function toPricePoints(series: MetalRateSummary[], source: "daily" | "monthly"): PricePoint[] {
  return series.map((entry) => {
    const at = new Date(entry.effectiveAt);
    return {
      label:
        source === "daily"
          ? at.toLocaleDateString("en-BD", { day: "numeric", month: "short" })
          : at.toLocaleDateString("en-BD", { month: "short", year: "2-digit" }),
      caption: at.toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" }),
      pricePerGram: Number(entry.pricePerGramBDT),
    };
  });
}

function niceStep(range: number) {
  const rough = range / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rough || 1));
  const residual = rough / magnitude;
  const step = residual > 5 ? 10 : residual > 2 ? 5 : residual > 1 ? 2 : 1;
  return step * magnitude;
}

/** Catmull-Rom-ish cubic through every point — the same gentle curve
 * MoneyFlowChart draws, so the two dashboard charts read as one family. */
function smoothPath(points: [number, number][]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0][0]} ${points[0][1]}`;

  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [p0x, p0y] = points[i - 1] ?? points[i];
    const [p1x, p1y] = points[i];
    const [p2x, p2y] = points[i + 1];
    const [p3x, p3y] = points[i + 2] ?? points[i + 1];
    const t = 0.16;
    d += ` C ${p1x + (p2x - p0x) * t} ${p1y + (p2y - p0y) * t}, ${p2x - (p3x - p1x) * t} ${p2y - (p3y - p1y) * t}, ${p2x} ${p2y}`;
  }
  return d;
}

/**
 * The Market page's live price graph: one metal's rate per gram over the
 * selected range.
 *
 * A holding's value is just grams × price, so plotting it as a second line
 * would trace the identical curve at a different scale — pointless ink. It gets
 * a second *axis* instead: the right-hand ticks label each gridline with what
 * the signed-in user's own holding was worth at that price, so one line answers
 * both "what is gold doing" and "what is my gold worth". The axis is dropped
 * entirely when the vault holds none of this metal.
 */
export function MarketPriceChart({
  data,
  holdingGrams,
  color,
  metalLabel,
}: {
  data: PricePoint[];
  holdingGrams: number;
  color: string;
  metalLabel: string;
}) {
  const gradientId = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const showHoldingAxis = holdingGrams > 0;
  const rightPad = PAD.right + (showHoldingAxis ? HOLDING_AXIS_WIDTH : 0);

  const prices = data.map((d) => d.pricePerGram);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const step = niceStep(max - min || max * 0.1);
  const niceMin = Math.floor(min / step) * step - step;
  const niceMax = Math.ceil(max / step) * step + step;

  const plotW = WIDTH - PAD.left - rightPad;
  const plotH = HEIGHT - PAD.top - PAD.bottom;

  const x = (i: number) => PAD.left + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const y = (v: number) => PAD.top + plotH - ((v - niceMin) / (niceMax - niceMin)) * plotH;

  const points = data.map((d, i) => [x(i), y(d.pricePerGram)] as [number, number]);
  const linePath = smoothPath(points);
  const areaPath = `${linePath} L ${x(data.length - 1)} ${PAD.top + plotH} L ${x(0)} ${PAD.top + plotH} Z`;

  const ticks: number[] = [];
  for (let v = niceMin + step; v < niceMax; v += step) ticks.push(v);

  // At most ~8 x labels, whatever the range's density.
  const labelStride = Math.max(1, Math.ceil(data.length / 8));

  const hovered = hoverIndex !== null ? data[hoverIndex] : null;
  const last = data[data.length - 1];

  function handlePointerMove(e: React.PointerEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setHoverIndex(Math.round(ratio * (data.length - 1)));
  }

  return (
    // Below ~560px the axis labels would shrink past legibility, so the chart
    // keeps its width and scrolls sideways instead of squashing.
    <div className="-mx-1 overflow-x-auto px-1">
      <div className="relative min-w-[520px]">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full touch-none"
          role="img"
          aria-label={
            showHoldingAxis
              ? `${metalLabel} price per gram, with the value of your ${holdingGrams.toFixed(3)} g holding on the right axis`
              : `${metalLabel} price per gram`
          }
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* gridlines, market-price axis (left) and holding-value axis (right) */}
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={WIDTH - rightPad}
                y1={y(tick)}
                y2={y(tick)}
                className="stroke-border"
                strokeWidth={1}
                strokeDasharray="3 5"
              />
              <text x={PAD.left - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle" className="fill-muted-foreground text-[9px]">
                {formatBDTShort(tick)}
              </text>
              {showHoldingAxis && (
                <text
                  x={WIDTH - rightPad + 8}
                  y={y(tick)}
                  textAnchor="start"
                  dominantBaseline="middle"
                  className="fill-muted-foreground/70 text-[9px]"
                >
                  {formatBDTShort(tick * holdingGrams)}
                </text>
              )}
            </g>
          ))}

          {data.map((d, i) => (
            <text
              key={`${d.label}-${i}`}
              x={x(i)}
              y={HEIGHT - 8}
              textAnchor="middle"
              className={i % labelStride === 0 ? "fill-muted-foreground text-[9px]" : "hidden"}
            >
              {d.label}
            </text>
          ))}

          <path d={areaPath} fill={`url(#${gradientId})`} />
          <path d={linePath} fill="none" stroke={color} strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" />

          {/* latest price marker */}
          <circle cx={x(data.length - 1)} cy={y(last.pricePerGram)} r={4.5} fill={color} className="stroke-card" strokeWidth={2} />

          {hoverIndex !== null && (
            <g>
              <line
                x1={x(hoverIndex)}
                x2={x(hoverIndex)}
                y1={PAD.top}
                y2={PAD.top + plotH}
                className="stroke-foreground/25"
                strokeWidth={1}
              />
              <circle cx={x(hoverIndex)} cy={y(data[hoverIndex].pricePerGram)} r={5} fill={color} className="stroke-card" strokeWidth={2} />
            </g>
          )}

          <rect
            x={PAD.left}
            y={PAD.top}
            width={plotW}
            height={plotH}
            fill="transparent"
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setHoverIndex(null)}
          />
        </svg>

        {hovered && (
          <div
            className="pointer-events-none absolute top-0 w-max -translate-x-1/2 rounded-md bg-popover px-3 py-2 text-xs shadow-lg ring-1 ring-foreground/10"
            style={{ left: `${Math.min(86, Math.max(14, (x(hoverIndex!) / WIDTH) * 100))}%` }}
          >
            <p className="mb-1 font-medium text-muted-foreground">{hovered.caption}</p>
            <p className="flex items-center gap-1.5 font-semibold tabular-nums">
              <span className="size-2 rounded-full" style={{ background: color }} />
              {formatBDT(hovered.pricePerGram)}/g
            </p>
            {showHoldingAxis && (
              <p className="mt-0.5 text-muted-foreground tabular-nums">
                Your {holdingGrams.toFixed(3)} g · {formatBDT(hovered.pricePerGram * holdingGrams)}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
