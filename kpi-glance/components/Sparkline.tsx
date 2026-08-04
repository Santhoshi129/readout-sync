"use client";

import { useState } from "react";
import { Severity } from "@/lib/types";

const stroke: Record<Severity, string> = {
  good: "#6fd39a",
  warn: "#d9a13c",
  bad: "#c25151",
  neutral: "#a1a1a1",
};

/**
 * Trend line for a single KPI. Readable at a glance without touching it —
 * the shape is the message — and hovering any point names the day and the
 * exact value, so the reader never has to guess what a bend means.
 *
 * Nothing is drawn with fewer than two real points; an absent sparkline
 * means the history genuinely isn't there yet, never an interpolated line.
 */
export default function Sparkline({
  values,
  dates,
  severity,
  label,
  unit,
}: {
  values: number[];
  dates?: string[];
  severity: Severity;
  label: string;
  unit: "%" | "count";
}) {
  const [active, setActive] = useState<number | null>(null);
  if (values.length < 2) return null;

  const w = 100;
  const h = 30;
  const padY = 4;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const xs = values.map((_, i) => (i / (values.length - 1)) * w);
  const ys = values.map((v) => h - padY - ((v - min) / span) * (h - padY * 2));
  const d = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(" ");
  const color = stroke[severity];

  const fmt = (v: number) => (unit === "%" ? `${v.toFixed(1)}%` : v.toLocaleString());
  const dayLabel = (i: number) => {
    const iso = dates?.[i];
    if (!iso) return `Reading ${i + 1} of ${values.length}`;
    const t = Date.parse(iso);
    if (Number.isNaN(t)) return iso;
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(
      new Date(t)
    );
  };

  const i = active;

  return (
    <div className="relative mt-2.5">
      {i !== null && (
        <div
          className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-base-line bg-base-raised px-2 py-1 shadow-lg"
          style={{ left: `${(i / (values.length - 1)) * 100}%` }}
        >
          <span className="font-mono text-[11px] tabular text-ink">{fmt(values[i])}</span>
          <span className="ml-1.5 text-[10px] text-ink-faint">{dayLabel(i)}</span>
        </div>
      )}

      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className="h-[30px] w-full overflow-visible"
        role="img"
        aria-label={`${label}: ${values.length} daily readings, from ${fmt(values[0])} to ${fmt(
          values[values.length - 1]
        )}`}
        onMouseLeave={() => setActive(null)}
      >
        <path d={d} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" />

        {i !== null && (
          <>
            <line
              x1={xs[i]}
              y1={0}
              x2={xs[i]}
              y2={h}
              stroke="#3a3a3a"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <circle cx={xs[i]} cy={ys[i]} r={3.5} fill={color} stroke="#141414" strokeWidth={2} />
          </>
        )}

        {/* Head of the line, so "now" is findable without hovering. */}
        <circle
          cx={xs[xs.length - 1]}
          cy={ys[ys.length - 1]}
          r={3}
          fill={color}
          stroke="#141414"
          strokeWidth={2}
        />

        {/* Invisible hit bands — wider than the marks, so hover is forgiving. */}
        {values.map((_, idx) => (
          <rect
            key={idx}
            x={idx === 0 ? 0 : (xs[idx] + xs[idx - 1]) / 2}
            y={0}
            width={
              (idx === values.length - 1 ? w : (xs[idx] + xs[idx + 1]) / 2) -
              (idx === 0 ? 0 : (xs[idx] + xs[idx - 1]) / 2)
            }
            height={h}
            fill="transparent"
            onMouseEnter={() => setActive(idx)}
          />
        ))}
      </svg>
    </div>
  );
}
