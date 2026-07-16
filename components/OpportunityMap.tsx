"use client";
import { useState } from "react";
import { PriorityRow, painPointLabel } from "@/lib/retention-research";

const W = 640;
const H = 380;
const PAD_L = 56;
const PAD_R = 24;
const PAD_T = 20;
const PAD_B = 48;

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

  const xFor = (r: PriorityRow) => (r.total > 0 ? (r.core_fit / r.total) * plotW : 0);
  const yFor = (r: PriorityRow) => plotH - (r.avgSeverity / 5) * plotH;
  const rFor = (r: PriorityRow) => 8 + Math.sqrt(r.total / maxTotal) * 26;

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
        <g transform={`translate(${PAD_L},${PAD_T})`}>
          {/* quadrant shading: top-right = build first */}
          <rect x={plotW / 2} y={0} width={plotW / 2} height={plotH * 0.4} fill="rgba(127,201,138,0.05)" />
          <line x1={0} y1={plotH} x2={plotW} y2={plotH} stroke="var(--border)" strokeWidth={1} />
          <line x1={0} y1={0} x2={0} y2={plotH} stroke="var(--border)" strokeWidth={1} />
          <line x1={plotW / 2} y1={0} x2={plotW / 2} y2={plotH} stroke="var(--border-soft)" strokeWidth={1} strokeDasharray="4 4" />
          <line x1={0} y1={plotH * 0.4} x2={plotW} y2={plotH * 0.4} stroke="var(--border-soft)" strokeWidth={1} strokeDasharray="4 4" />

          <text x={plotW - 4} y={plotH * 0.4 - 10} textAnchor="end" fontSize="10" fontFamily="var(--mono)" fill="var(--hot)" letterSpacing="0.05em">
            BUILD FIRST
          </text>

          {/* axis ticks */}
          {[0, 25, 50, 75, 100].map((t) => (
            <text key={t} x={(t / 100) * plotW} y={plotH + 20} textAnchor="middle" fontSize="10" fontFamily="var(--mono)" fill="var(--ink-faint)">
              {t}%
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
                <circle
                  cx={cx}
                  cy={cy}
                  r={rad}
                  fill={fill}
                  fillOpacity={isActive || isHover ? 0.85 : 0.55}
                  stroke={isActive ? "var(--amber-bright)" : "transparent"}
                  strokeWidth={2}
                  style={{ transition: "fill-opacity 150ms ease" }}
                />
                {(isHover || isActive) && (
                  <text x={cx} y={cy - rad - 8} textAnchor="middle" fontSize="11" fontWeight={700} fill="var(--ink)" fontFamily="var(--font)">
                    {painPointLabel(r.pain_point)}
                  </text>
                )}
              </g>
            );
          })}

          <text x={plotW / 2} y={plotH + 38} textAnchor="middle" fontSize="10.5" fontFamily="var(--mono)" fill="var(--ink-dim)" letterSpacing="0.05em">
            SOLVABLE WITH TWU'S PRODUCT (CORE-FIT %)
          </text>
          <text
            x={-plotH / 2}
            y={-38}
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

      <div style={{ display: "flex", gap: 18, marginTop: 6, flexWrap: "wrap", fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--ink-faint)" }}>
        <span><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--bad)", marginRight: 6 }} />mostly unsolved</span>
        <span><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--amber)", marginRight: 6 }} />partly solved</span>
        <span><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--cold)", marginRight: 6 }} />mostly solved</span>
        <span style={{ marginLeft: "auto" }}>bubble size = number of findings</span>
      </div>
    </div>
  );
}
