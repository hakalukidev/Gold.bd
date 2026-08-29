"use client";

import { useId, useState } from "react";
import { useT } from "@/lib/i18n/use-t";
import { formatBDT, formatDateTime } from "@/lib/format";

const WIDTH = 560;
const HEIGHT = 220;
const PAD = { top: 16, right: 12, bottom: 28, left: 56 };

function niceStep(range: number) {
  const rough = range / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rough || 1));
  const residual = rough / magnitude;
  const step = residual > 5 ? 10 : residual > 2 ? 5 : residual > 1 ? 2 : 1;
  return step * magnitude;
}

/**
 * Gold-themed rate history line chart — gradient area fill, gridlines, an
 * end-of-line price marker, and a pointer-driven crosshair/tooltip. Shared
 * by the landing page's rate tracker and the calculator page's live trend
 * card; keep both call sites in sync with any visual change here.
 */
export function RateChart({ data }: { data: { pricePerGramBDT: string; effectiveAt: string }[] }) {
  const t = useT();
  const gradientId = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const prices = data.map((d) => Number(d.pricePerGramBDT));
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const step = niceStep(max - min || max * 0.1);
  const niceMin = Math.floor(min / step) * step - step;
  const niceMax = Math.ceil(max / step) * step + step;

  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;

  const x = (i: number) => PAD.left + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const y = (v: number) => PAD.top + plotH - ((v - niceMin) / (niceMax - niceMin)) * plotH;

  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(Number(d.pricePerGramBDT))}`).join(" ");
  const areaPath = `${linePath} L ${x(data.length - 1)} ${PAD.top + plotH} L ${x(0)} ${PAD.top + plotH} Z`;

  const ticks: number[] = [];
  for (let v = niceMin + step; v < niceMax; v += step) ticks.push(v);

  const hovered = hoverIndex !== null ? data[hoverIndex] : null;
  const last = data[data.length - 1];

  function handlePointerMove(e: React.PointerEvent<SVGRectElement>) {
    const rect = (e.target as SVGRectElement).getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const ratio = Math.min(1, Math.max(0, relX / rect.width));
    const idx = Math.round(ratio * (data.length - 1));
    setHoverIndex(idx);
  }

  return (
    <div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full overflow-visible"
          role="img"
          aria-label={t.rateHistory.chartCardTitle}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c8a951" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#c8a951" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* gridlines + y ticks */}
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={WIDTH - PAD.right}
                y1={y(tick)}
                y2={y(tick)}
                stroke="white"
                strokeOpacity={0.08}
                strokeWidth={1}
              />
              <text x={PAD.left - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle" className="fill-neutral-500 text-[9px]">
                ৳{Math.round(tick).toLocaleString("en-BD")}
              </text>
            </g>
          ))}

          <path d={areaPath} fill={`url(#${gradientId})`} />
          <path d={linePath} fill="none" stroke="#c8a951" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

          {/* end marker + direct label */}
          <circle cx={x(data.length - 1)} cy={y(Number(last.pricePerGramBDT))} r={5} fill="#c8a951" stroke="#0d0d0d" strokeWidth={2} />
          <text
            x={x(data.length - 1)}
            y={y(Number(last.pricePerGramBDT)) - 12}
            textAnchor="end"
            className="fill-gold text-[11px] font-medium"
          >
            {formatBDT(last.pricePerGramBDT)}
          </text>

          {/* crosshair */}
          {hovered && (
            <g>
              <line
                x1={x(hoverIndex!)}
                x2={x(hoverIndex!)}
                y1={PAD.top}
                y2={PAD.top + plotH}
                stroke="white"
                strokeOpacity={0.25}
                strokeWidth={1}
              />
              <circle cx={x(hoverIndex!)} cy={y(Number(hovered.pricePerGramBDT))} r={4} fill="#c8a951" stroke="#0d0d0d" strokeWidth={2} />
            </g>
          )}

          {/* hover hit area */}
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
            className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-md border border-white/10 bg-ink-light px-3 py-2 text-xs shadow-xl"
            style={{ left: `${(x(hoverIndex!) / WIDTH) * 100}%` }}
          >
            <p className="font-semibold text-white">{formatBDT(hovered.pricePerGramBDT)}</p>
            <p className="text-neutral-400">{formatDateTime(hovered.effectiveAt)}</p>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowTable((v) => !v)}
        className="mt-2 text-xs text-neutral-400 underline underline-offset-2 hover:text-neutral-200"
      >
        {showTable ? t.rateHistory.tableHide : t.rateHistory.tableShow}
      </button>

      {showTable && (
        <div className="mt-3 overflow-x-auto rounded-md border border-white/10">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-neutral-400">
              <tr>
                <th className="px-3 py-2 font-medium">{t.rateHistory.tableDate}</th>
                <th className="px-3 py-2 font-medium">{t.rateHistory.tablePrice}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-neutral-300">
              {data.map((d) => (
                <tr key={d.effectiveAt}>
                  <td className="px-3 py-2">{formatDateTime(d.effectiveAt)}</td>
                  <td className="px-3 py-2">{formatBDT(d.pricePerGramBDT)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
