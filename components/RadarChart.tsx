"use client";
import { useState } from "react";

export type RadarSeries = {
  key: "member" | "owner";
  label: string;
  color: string;
  values: number[]; // one per axis, 0-100 scale (percent)
};

// Hand-rolled SVG radar, no charting library - matches the rest of the
// dashboard's charts (PriorityMatrix, etc.), which are all raw SVG driven
// by CSS variables so they stay on-theme automatically.
export function RadarChart({
  axisLabels,
  series,
  onHoverAxis,
  activeAxis,
}: {
  axisLabels: string[];
  series: RadarSeries[];
  onHoverAxis?: (key: string | null) => void;
  activeAxis?: string | null;
}) {
  const [hover, setHover] = useState<{ axis: number; seriesKey: string } | null>(null);
  const N = axisLabels.length;
  const SIZE = 520;
  const CENTER = SIZE / 2;
  const RADIUS = SIZE * 0.34;
  const LABEL_RADIUS = RADIUS + 46;
  const RINGS = [0.25, 0.5, 0.75, 1];

  if (N < 3) {
    return (
      <div style={{ color: "var(--ink-faint)", fontSize: 13, textAlign: "center", padding: "60px 0" }}>
        Not enough shared pain-point categories yet to plot a shape.
      </div>
    );
  }

  const angleFor = (i: number) => -Math.PI / 2 + (2 * Math.PI * i) / N;
  const pointFor = (i: number, pct: number) => {
    const r = (Math.min(100, Math.max(0, pct)) / 100) * RADIUS;
    const a = angleFor(i);
    return { x: CENTER + r * Math.cos(a), y: CENTER + r * Math.sin(a) };
  };

  const polygonPoints = (values: number[]) =>
    values.map((v, i) => pointFor(i, v)).map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="100%" height={SIZE} style={{ overflow: "visible" }}>
        {/* rings */}
        {RINGS.map((r) => (
          <polygon
            key={r}
            points={Array.from({ length: N }, (_, i) => {
              const p = pointFor(i, r * 100);
              return `${p.x},${p.y}`;
            }).join(" ")}
            fill="none"
            stroke="var(--border-soft)"
            strokeWidth={1}
          />
        ))}
        {/* spokes */}
        {axisLabels.map((_, i) => {
          const p = pointFor(i, 100);
          return (
            <line
              key={i}
              x1={CENTER}
              y1={CENTER}
              x2={p.x}
              y2={p.y}
              stroke="var(--border-soft)"
              strokeWidth={1}
            />
          );
        })}
        {/* series polygons, faintest first so the more-hovered one draws on top */}
        {series.map((s) => (
          <polygon
            key={s.key}
            points={polygonPoints(s.values)}
            fill={s.color}
            fillOpacity={0.14}
            stroke={s.color}
            strokeWidth={2}
          />
        ))}
        {/* vertices, hoverable */}
        {series.map((s) =>
          s.values.map((v, i) => {
            const p = pointFor(i, v);
            const isHover = hover?.axis === i && hover.seriesKey === s.key;
            const isActiveAxis = activeAxis === axisLabels[i];
            return (
              <circle
                key={`${s.key}-${i}`}
                cx={p.x}
                cy={p.y}
                r={isHover || isActiveAxis ? 5.5 : 3.5}
                fill={s.color}
                stroke="var(--bg)"
                strokeWidth={1.5}
                style={{ cursor: "pointer" }}
                onMouseEnter={() => {
                  setHover({ axis: i, seriesKey: s.key });
                  onHoverAxis?.(axisLabels[i]);
                }}
                onMouseLeave={() => {
                  setHover(null);
                  onHoverAxis?.(null);
                }}
              >
                <title>
                  {axisLabels[i]} - {s.label}: {v}%
                </title>
              </circle>
            );
          })
        )}
        {/* axis labels */}
        {axisLabels.map((label, i) => {
          const p = pointFor(i, (LABEL_RADIUS / RADIUS) * 100);
          const isActiveAxis = activeAxis === label;
          const anchor = Math.abs(p.x - CENTER) < 8 ? "middle" : p.x > CENTER ? "start" : "end";
          return (
            <text
              key={label}
              x={p.x}
              y={p.y}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize={11.5}
              fontFamily="var(--mono)"
              fill={isActiveAxis ? "var(--amber-bright)" : "var(--ink-dim)"}
              style={{ cursor: "default" }}
            >
              {label}
            </text>
          );
        })}
      </svg>
      <div style={{ display: "flex", gap: 20, marginTop: 8, justifyContent: "center", flexWrap: "wrap" }}>
        {series.map((s) => (
          <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--ink-dim)" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: s.color, display: "inline-block" }} />
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}
