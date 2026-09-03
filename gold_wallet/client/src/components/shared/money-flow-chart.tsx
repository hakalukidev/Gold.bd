"use client";

import { useId, useState } from "react";
import { formatBDT, formatBDTShort } from "@/lib/format";
import type { FlowPoint } from "@/lib/wallet-flow";

const WIDTH = 640;
const HEIGHT = 232;
const PAD = { top: 18, right: 14, bottom: 26, left: 46 };

/** Money in is the filled series, money out rides on top as a plain line —
 * two stacked gradients would just muddy each other. */
export const FLOW_IN_COLOR = "#10b981"; // emerald-500, matching the credit amounts in the activity feed
export const FLOW_OUT_COLOR = "#f43f5e"; // rose-500

function niceCeil(value: number) {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude) * magnitude;
}

/** Catmull-Rom-ish cubic through every point — the gentle curve the reference
 * design uses, without pulling in a charting library. */
function smoothPath(points: [number, number][]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0][0]} ${points[0][1]}`;

  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [p0x, p0y] = points[i - 1] ?? points[i];
    const [p1x, p1y] = points[i];
    const [p2x, p2y] = points[i + 1];
    const [p3x, p3y] = points[i + 2] ?? points[i + 1];
    const t = 0.18;
    d += ` C ${p1x + (p2x - p0x) * t} ${p1y + (p2y - p0y) * t}, ${p2x - (p3x - p1x) * t} ${p2y - (p3y - p1y) * t}, ${p2x} ${p2y}`;
  }
  return d;
}

/**
 * Money in vs. money out per bucket — the wallet page's cash-flow chart. Plain
 * SVG like RateChart, but theme-token styled (this one renders inside the
 * light/dark-aware dashboard rather than the always-dark landing page). The
 * bucket width comes from whatever range the caller filtered to: days for a
 * week or a month, months for a year.
 */
export function MoneyFlowChart({ data }: { data: FlowPoint[] }) {
  const gradientId = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const max = niceCeil(
    Math.max(...data.flatMap((d) => [d.inBDT, d.outBDT]), 1),
  );
  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;

  const x = (i: number) =>
    PAD.left +
    (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;

  const baseY = y(0);
  const inPoints = data.map((d, i) => [x(i), y(d.inBDT)] as [number, number]);
  const outPoints = data.map((d, i) => [x(i), y(d.outBDT)] as [number, number]);
  const inLine = smoothPath(inPoints);
  const inArea = `${inLine} L ${x(data.length - 1)} ${baseY} L ${x(0)} ${baseY} Z`;

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const hovered = hoverIndex !== null ? data[hoverIndex] : null;
  // Only ever ~8 x labels, however many buckets the range produced.
  const labelStep = Math.ceil(data.length / 8);

  function handlePointerMove(e: React.PointerEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(
      1,
      Math.max(0, (e.clientX - rect.left) / rect.width),
    );
    setHoverIndex(Math.round(ratio * (data.length - 1)));
  }

  return (
    // Below ~520px the axis labels would shrink past legibility, so the chart
    // keeps its width and scrolls sideways instead of squashing.
    <div className="-mx-1 overflow-x-auto px-1">
      <div className="relative min-w-[480px]">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full touch-none"
          role="img"
          aria-label="Money in and money out over the selected date range"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={FLOW_IN_COLOR} stopOpacity="0.28" />
              <stop offset="100%" stopColor={FLOW_IN_COLOR} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* gridlines + y axis */}
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={WIDTH - PAD.right}
                y1={y(tick)}
                y2={y(tick)}
                className="stroke-border"
                strokeWidth={1}
                strokeDasharray="3 5"
              />
              <text
                x={PAD.left - 8}
                y={y(tick)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-muted-foreground text-[9px]"
              >
                {formatBDTShort(tick)}
              </text>
            </g>
          ))}

          {/* zero baseline */}
          <line
            x1={PAD.left}
            x2={WIDTH - PAD.right}
            y1={baseY}
            y2={baseY}
            className="stroke-border"
            strokeWidth={1}
          />

          {/* x axis labels — thinned on dense ranges so they don't collide */}
          {data.map((d, i) => (
            <text
              key={`${d.label}-${i}`}
              x={x(i)}
              y={HEIGHT - 8}
              textAnchor="middle"
              className={
                i % labelStep === 0
                  ? "fill-muted-foreground text-[9px]"
                  : "hidden"
              }
            >
              {d.label}
            </text>
          ))}

          <path d={inArea} fill={`url(#${gradientId})`} />
          <path
            d={inLine}
            fill="none"
            stroke={FLOW_IN_COLOR}
            strokeWidth={2.25}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={smoothPath(outPoints)}
            fill="none"
            stroke={FLOW_OUT_COLOR}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity={0.85}
          />

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
              <circle
                cx={x(hoverIndex)}
                cy={y(data[hoverIndex].outBDT)}
                r={4}
                fill={FLOW_OUT_COLOR}
                className="stroke-card"
                strokeWidth={2}
              />
              <circle
                cx={x(hoverIndex)}
                cy={y(data[hoverIndex].inBDT)}
                r={5}
                fill={FLOW_IN_COLOR}
                className="stroke-card"
                strokeWidth={2}
              />
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
            style={{
              left: `${Math.min(88, Math.max(12, (x(hoverIndex!) / WIDTH) * 100))}%`,
            }}
          >
            <p className="mb-1 font-medium text-muted-foreground">
              {hovered.label}
            </p>
            <p className="flex items-center gap-1.5 font-semibold tabular-nums">
              <span
                className="size-2 rounded-full"
                style={{ background: FLOW_IN_COLOR }}
              />
              In {formatBDT(hovered.inBDT)}
            </p>
            <p className="flex items-center gap-1.5 font-semibold tabular-nums">
              <span
                className="size-2 rounded-full"
                style={{ background: FLOW_OUT_COLOR }}
              />
              Out {formatBDT(hovered.outBDT)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
