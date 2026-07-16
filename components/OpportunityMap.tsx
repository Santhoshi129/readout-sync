"use client";
import { useState } from "react";
import { PriorityRow, painPointLabel } from "@/lib/retention-research";

const W = 640;
const H = 380;
const PAD_L = 60;
const PAD_R = 24;
const PAD_T = 30;
const PAD_B = 48;

// rows must arrive pre-sorted by priority score, descending, same order the
// table below uses, so the rank badge on each bubble matches the table row
// numbers exactly. Both x-axis (core-fit COUNT, not a solvability rate) and
// y-axis (avg severity) are the same two quantities the score is built
// from, so the bubble furthest up and to the right is always the same
// pain point ranked #1 in the table. No separate "build first" rectangle
// with its own, different threshold.
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
  const maxTotal = Math.max(1, ...rows.map((r) => r.total));
  const maxCoreFit = Math.max(1, ...rows.map((r) => r.core_fit));

  const xFor = (r: PriorityRow) => (r.core_fit / maxCoreFit) * plotW;
  const yFor = (r: PriorityRow) => plotH - (r.avgSeverity / 5) * plotH;
  const rFor = (r: PriorityRow) => 8 + Math.sqrt(r.total / maxTotal) * 26;

  const rankOf = (pp: string) => rows.findIndex((r) => r.pain_point === pp);

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
        <g transform={`translate(${PAD_L},${PAD_T})`}>
          <line x1={0} y1={plotH} x2={plotW} y2={plotH} stroke="var(--border)" strokeWidth={1} />
          <line x1={0} y1={0} x2={0} y2={plotH} stroke="var(--border)" strokeWidth={1} />

          {/* axis ticks */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <text key={t} x={t * plotW} y={plotH + 20} textAnchor="middle" fontSize="10" fontFamily="var(--mono)" fill="var(--ink-faint)">
              {Math.round(t * maxCoreFit)}
            </text>
          ))}
          {[0, 1, 2, 3, 4, 5].map((s) => (
            <text key={s} x={-10} y={plotH - (s / 5) * plotH + 3} textAnchor="end" fontSize="10" fontFamily="var(--mono)" fill="var(--ink-faint)">
              {s}
            </text>
          ))}

          {rows.map((r) => {
            const cx = xFor(r);
            const cy = yFor(r);
            const rad = rFor(r);
            const rank = rankOf(r.pain_point);
            const isTop = rank === 0 && r.score > 0;
            const isActive = active === r.pain_point;
            const isHover = hover === r.pain_point;
            const opportunityGap = 1 - r.solutionRate;
            const fill = opportunityGap > 0.6 ? "var(--bad)" : opportunityGap > 0.35 ? "var(--amber)" : "var(--cold)";
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
                  fillOpacity={isActive || isHover ? 0.9 : 0.6}
                  stroke={isActive ? "var(--amber-bright)" : isTop ? "var(--amber)" : "transparent"}
                  strokeWidth={2}
                  style={{ transition: "fill-opacity 150ms ease" }}
                />
                <text x={cx} y={cy + 4} textAnchor="middle" fontSize="10.5" fontWeight={800} fill="#000" style={{ pointerEvents: "none" }}>
                  {rank + 1}
                </text>
                {(isHover || isActive || isTop) && (
                  <text x={cx} y={cy - rad - 8} textAnchor="middle" fontSize="11" fontWeight={700} fill="var(--ink)" fontFamily="var(--font)">
                    {isTop ? `#1 ${painPointLabel(r.pain_point)}` : painPointLabel(r.pain_point)}
                  </text>
                )}
              </g>
            );
          })}

          <text x={plotW / 2} y={plotH + 38} textAnchor="middle" fontSize="10.5" fontFamily="var(--mono)" fill="var(--ink-dim)" letterSpacing="0.05em">
            FINDINGS TWU'S PRODUCT CAN DIRECTLY SOLVE (COUNT)
          </text>
          <text
            x={-plotH / 2}
            y={-42}
            textAnchor="middle"
            fontSize="10.5"
            fontFamily="var(--mono)"
            fill="var(--ink-dim)"
            letterSpacing="0.05em"
            transform="rotate(-90)"
          >
            AVERAGE SEVERITY
          </text>
        </g>
      </svg>

      <div style={{ marginTop: 10, fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.55 }}>
        Each bubble is a pain point. The number inside is its rank, matching the table below. Further right and higher up means a bigger, more solvable, more painful problem. Bigger bubble means more total mentions. Red means barely solved yet, blue means mostly solved already.
      </div>

      <div style={{ display: "flex", gap: 18, marginTop: 10, flexWrap: "wrap", fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--ink-faint)" }}>
        <span><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--bad)", marginRight: 6 }} />mostly unsolved</span>
        <span><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--amber)", marginRight: 6 }} />partly solved</span>
        <span><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--cold)", marginRight: 6 }} />mostly solved</span>
      </div>
    </div>
  );
}
