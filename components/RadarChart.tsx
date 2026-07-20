"use client";
import { useState } from "react";

export type RadarSeries = {
  key: "member" | "owner";
  label: string;
  color: string;
  values: number[]; // one per axis, percent (0-100 domain, but rarely exceeds ~20 in this dataset)
};

// Hand-rolled SVG radar, no charting library - matches the rest of the
// dashboard's charts, which are all raw SVG driven by CSS variables.
//
// Scale is dynamic, not fixed to 0-100: this dataset's real values top out
// around 18%, so a fixed 0-100 scale used to squash every point into an
// unclickable 20px blob at the center. The axis max is now the actual max
// value in the data, rounded up to a clean step, so the shape fills the
// chart and points are actually far enough apart to click.
export function RadarChart({
  axisLabels,
  series,
  onSelectAxis,
  activeAxis,
}: {
  axisLabels: string[];
  series: RadarSeries[];
  onSelectAxis?: (label: string) => void;
  activeAxis?: string | null;
}) {
  const [hover, setHover] = useState<{ axis: number; seriesKey: string } | null>(null);
  const N = axisLabels.length;
  const SIZE = 560;
  const CENTER = SIZE / 2;
  const RADIUS = SIZE * 0.32;
  const LABEL_RADIUS = RADIUS + 52;
  const RINGS = [0.25, 0.5, 0.75, 1];

  if (N < 3) {
    return (
      <div style={{ color: "var(--ink-faint)", fontSize: 13, textAlign: "center", padding: "60px 0" }}>
        Not enough shared pain-point categories yet to plot a shape.
      </div>
    );
  }

  const rawMax = Math.max(1, ...series.flatMap((s) => s.values));
  // Round the axis max up to a clean step (2/5/10 depending on magnitude)
  // so the scale labels read as round numbers, not "17.3%".
  const step = rawMax <= 10 ? 2 : rawMax <= 25 ? 5 : rawMax <= 60 ? 10 : 20;
  const axisMax = Math.ceil(rawMax / step) * step;

  const angleFor = (i: number) => -Math.PI / 2 + (2 * Math.PI * i) / N;
  const pointFor = (i: number, pct: number) => {
    const r = (Math.min(axisMax, Math.max(0, pct)) / axisMax) * RADIUS;
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
              const p = pointFor(i, r * axisMax);
              return `${p.x},${p.y}`;
            }).join(" ")}
            fill="none"
            stroke="var(--border-soft)"
            strokeWidth={1}
          />
        ))}
        {/* scale labels along the up-spoke, real values not a fixed 0-100 */}
        {RINGS.map((r) => (
          <text
            key={`scale-${r}`}
            x={CENTER + 8}
            y={CENTER - r * RADIUS}
            fontSize={9.5}
            fontFamily="var(--mono)"
            fill="var(--ink-faint)"
          >
            {(r * axisMax).toFixed(axisMax <= 10 ? 1 : 0)}%
          </text>
        ))}
        {/* spokes */}
        {axisLabels.map((_, i) => {
          const p = pointFor(i, axisMax);
          return (
            <line key={i} x1={CENTER} y1={CENTER} x2={p.x} y2={p.y} stroke="var(--border-soft)" strokeWidth={1} />
          );
        })}
        {/* series polygons */}
        {series.map((s) => (
          <polygon key={s.key} points={polygonPoints(s.values)} fill={s.color} fillOpacity={0.16} stroke={s.color} strokeWidth={2} />
        ))}
        {/* vertices - a larger invisible hit-circle sits behind the visible dot so hover/click actually lands */}
        {series.map((s) =>
          s.values.map((v, i) => {
            const p = pointFor(i, v);
            const isHover = hover?.axis === i && hover.seriesKey === s.key;
            const isActiveAxis = activeAxis === axisLabels[i];
            return (
              <g key={`${s.key}-${i}`}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={14}
                  fill="transparent"
                  style={{ cursor: onSelectAxis ? "pointer" : "default" }}
                  onMouseEnter={() => setHover({ axis: i, seriesKey: s.key })}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => onSelectAxis?.(axisLabels[i])}
                />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHover || isActiveAxis ? 7 : 4.5}
                  fill={s.color}
                  stroke="var(--bg)"
                  strokeWidth={1.5}
                  style={{ pointerEvents: "none" }}
                >
                  <title>
                    {axisLabels[i]} - {s.label}: {v}%
                  </title>
                </circle>
                {(isHover || isActiveAxis) && (
                  <text x={p.x} y={p.y - 14} textAnchor="middle" fontSize={12} fontFamily="var(--mono)" fill={s.color} fontWeight={700} style={{ pointerEvents: "none" }}>
                    {v}%
                  </text>
                )}
              </g>
            );
          })
        )}
        {/* axis labels, clickable with a padded hit area */}
        {axisLabels.map((label, i) => {
          const p = pointFor(i, axisMax * (LABEL_RADIUS / RADIUS));
          const isActiveAxis = activeAxis === label;
          const anchor = Math.abs(p.x - CENTER) < 8 ? "middle" : p.x > CENTER ? "start" : "end";
          return (
            <text
              key={label}
              x={p.x}
              y={p.y}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize={12}
              fontFamily="var(--mono)"
              fill={isActiveAxis ? "var(--amber-bright)" : "var(--ink-dim)"}
              fontWeight={isActiveAxis ? 700 : 400}
              style={{ cursor: onSelectAxis ? "pointer" : "default", textDecoration: isActiveAxis ? "underline" : "none" }}
              onClick={() => onSelectAxis?.(label)}
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
      <div style={{ marginTop: 4, textAlign: "center", fontSize: 11.5, color: "var(--ink-faint)" }}>
        Scale runs to {axisMax}%, not 100% - the real values here top out around {rawMax.toFixed(1)}%. Click a point or label for the full breakdown below.
      </div>
    </div>
  );
}
