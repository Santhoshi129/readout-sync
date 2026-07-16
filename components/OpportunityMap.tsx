"use client";
import { useMemo, useState } from "react";
import { PriorityRow, painPointLabel } from "@/lib/retention-research";

const W = 640;
const H = 400;
const PAD_L = 60;
const PAD_R = 24;
const PAD_T = 34;
const PAD_B = 48;

type Point = { r: PriorityRow; rank: number; x: number; y: number; rad: number };

// Simple iterative separation so bubbles that land close together don't
// print on top of each other, standard technique for small scatter/bubble
// charts (a lightweight beeswarm-style relaxation, not a physics engine).
function declutter(points: Point[], plotW: number, plotH: number): Point[] {
  const pts = points.map((p) => ({ ...p }));
  for (let iter = 0; iter < 120; iter++) {
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i];
        const b = pts[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const minDist = a.rad + b.rad + 6;
        if (dist < minDist) {
          const overlap = (minDist - dist) / 2;
          const ux = dx / dist;
          const uy = dy / dist;
          a.x -= ux * overlap * 0.5;
          a.y -= uy * overlap * 0.5;
          b.x += ux * overlap * 0.5;
          b.y += uy * overlap * 0.5;
        }
      }
    }
  }
  // clamp back inside the plot
  return pts.map((p) => ({
    ...p,
    x: Math.min(plotW - p.rad, Math.max(p.rad, p.x)),
    y: Math.min(plotH - p.rad, Math.max(p.rad, p.y)),
  }));
}

// rows must arrive pre-sorted by priority score, descending, same order the
// table below uses, so the rank badge on each bubble matches the table row
// numbers exactly.
export function OpportunityMap({
  rows,
  active,
  onSelect,
}: {
  rows: PriorityRow[];
  active?: string | null;
  onSelect?: (pp: string) => void;
}) {
  const [hover, setHover] = useState<string | null>(null);

  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const plottable = rows.filter((r) => r.core_fit > 0);
  const unbuildable = rows.filter((r) => r.core_fit === 0);
  const maxTotal = Math.max(1, ...rows.map((r) => r.total));
  const maxCoreFit = Math.max(1, ...plottable.map((r) => r.core_fit));

  const points = useMemo(() => {
    const raw: Point[] = plottable.map((r) => ({
      r,
      rank: rows.findIndex((row) => row.pain_point === r.pain_point),
      x: (r.core_fit / maxCoreFit) * plotW,
      y: plotH - (r.avgSeverity / 5) * plotH,
      rad: 10 + Math.sqrt(r.total / maxTotal) * 24,
    }));
    return declutter(raw, plotW, plotH);
  }, [plottable, rows, maxCoreFit, maxTotal, plotW, plotH]);

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
        <g transform={`translate(${PAD_L},${PAD_T})`}>
          <line x1={0} y1={plotH} x2={plotW} y2={plotH} stroke="var(--border)" strokeWidth={1} />
          <line x1={0} y1={0} x2={0} y2={plotH} stroke="var(--border)" strokeWidth={1} />

          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <text key={t} x={t * plotW} y={plotH + 20} textAnchor="middle" fontSize="10" fontFamily="var(--mono)" fill="var(--ink-dim)">
              {Math.round(t * maxCoreFit)}
            </text>
          ))}
          {[0, 1, 2, 3, 4, 5].map((s) => (
            <text key={s} x={-12} y={plotH - (s / 5) * plotH + 3} textAnchor="end" fontSize="10" fontFamily="var(--mono)" fill="var(--ink-dim)">
              {s}
            </text>
          ))}

          {points.map((p) => {
            const { r, rank, x: cx, y: cy, rad } = p;
            const isTop = rank === 0 && r.score > 0;
            const isActive = active === r.pain_point;
            const isHover = hover === r.pain_point;
            const opportunityGap = 1 - r.solutionRate;
            const fill = opportunityGap > 0.6 ? "var(--bad)" : opportunityGap > 0.35 ? "var(--amber)" : "var(--cold)";
            const nearLeftEdge = cx < 60;
            const nearTop = cy < 24;
            return (
              <g
                key={r.pain_point}
                onMouseEnter={() => setHover(r.pain_point)}
                onMouseLeave={() => setHover((h) => (h === r.pain_point ? null : h))}
                onClick={() => onSelect?.(r.pain_point)}
                style={{ cursor: onSelect ? "pointer" : "default" }}
              >
                {isTop && (
                  <circle cx={cx} cy={cy} r={rad + 6} fill="none" stroke="var(--amber-bright)" strokeWidth={1.5} strokeDasharray="3 3" />
                )}
                <circle
                  cx={cx}
                  cy={cy}
                  r={rad}
                  fill={fill}
                  fillOpacity={isActive || isHover ? 0.92 : 0.62}
                  stroke={isActive ? "var(--amber-bright)" : isTop ? "var(--amber)" : "transparent"}
                  strokeWidth={2}
                  style={{ transition: "fill-opacity 150ms ease" }}
                />
                <text x={cx} y={cy + 4} textAnchor="middle" fontSize="10.5" fontWeight={800} fill="#000" style={{ pointerEvents: "none" }}>
                  {rank + 1}
                </text>
                {(isHover || isActive || isTop) && (
                  <text
                    x={nearLeftEdge ? cx + rad + 8 : cx}
                    y={nearTop ? cy + rad + 18 : cy - rad - 8}
                    textAnchor={nearLeftEdge ? "start" : "middle"}
                    fontSize="11"
                    fontWeight={700}
                    fill="var(--ink)"
                    fontFamily="var(--font)"
                  >
                    {isTop ? `#1 ${painPointLabel(r.pain_point)}` : painPointLabel(r.pain_point)}
                  </text>
                )}
              </g>
            );
          })}

          <text x={plotW / 2} y={plotH + 36} textAnchor="middle" fontSize="9.5" fontFamily="var(--mono)" fill="var(--ink-dim)" letterSpacing="0.02em">
            Findings TWU can fix (count)
          </text>
          <text
            x={-plotH / 2}
            y={-42}
            textAnchor="middle"
            fontSize="9.5"
            fontFamily="var(--mono)"
            fill="var(--ink-dim)"
            letterSpacing="0.02em"
            transform="rotate(-90)"
          >
            Average severity
          </text>
        </g>
      </svg>

      <div style={{ marginTop: 10, fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.55 }}>
        Each bubble is a pain point with at least one finding TWU can fix. The number is its rank, matching the table below. Further right and higher up means a bigger, more solvable, more painful problem. Bigger bubble means more total mentions. Red means barely solved yet, blue means mostly solved already.
      </div>

      {unbuildable.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 12, color: "var(--ink-dim)" }}>
          Not shown, zero core-fit findings so nothing to plot: {unbuildable.map((r) => painPointLabel(r.pain_point)).join(", ")}.
        </div>
      )}

      <div style={{ display: "flex", gap: 18, marginTop: 10, flexWrap: "wrap", fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--ink-dim)" }}>
        <span><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--bad)", marginRight: 6 }} />mostly unsolved</span>
        <span><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--amber)", marginRight: 6 }} />partly solved</span>
        <span><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--cold)", marginRight: 6 }} />mostly solved</span>
      </div>
    </div>
  );
}
