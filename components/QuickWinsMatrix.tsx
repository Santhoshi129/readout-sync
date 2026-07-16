"use client";
import { useMemo, useState } from "react";
import { SolutionQuadrantRow, solutionCategoryLabel } from "@/lib/retention-research";

const W = 620;
const H = 380;
const PAD_L = 56;
const PAD_R = 24;
const PAD_T = 30;
const PAD_B = 48;

type Point = { r: SolutionQuadrantRow; x: number; y: number; rad: number };

function declutter(points: Point[]): Point[] {
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
  return pts;
}

export function QuickWinsMatrix({ rows }: { rows: SolutionQuadrantRow[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const maxCount = Math.max(1, ...rows.map((r) => r.count));

  const points = useMemo(() => {
    const raw: Point[] = rows.map((r) => ({
      r,
      // difficulty 1 (easy) on the left, 5 (hard) on the right
      x: ((r.avgDifficulty - 1) / 4) * plotW,
      // effectiveness 5 (works well) at the top, 1 at the bottom
      y: plotH - ((r.avgEffectiveness - 1) / 4) * plotH,
      rad: 10 + Math.sqrt(r.count / maxCount) * 22,
    }));
    return declutter(raw).map((p) => ({
      ...p,
      x: Math.min(plotW - p.rad, Math.max(p.rad, p.x)),
      y: Math.min(plotH - p.rad, Math.max(p.rad, p.y)),
    }));
  }, [rows, maxCount, plotW, plotH]);

  if (rows.length === 0) {
    return <div style={{ color: "var(--ink-faint)" }}>Not enough scored solutions yet.</div>;
  }

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
        <g transform={`translate(${PAD_L},${PAD_T})`}>
          <rect x={0} y={0} width={plotW * 0.4} height={plotH * 0.4} fill="rgba(127,201,138,0.06)" />
          <text x={8} y={16} fontSize="10" fontFamily="var(--mono)" fill="var(--cold)" letterSpacing="0.05em">
            QUICK WINS
          </text>

          <line x1={0} y1={plotH} x2={plotW} y2={plotH} stroke="var(--border)" strokeWidth={1} />
          <line x1={0} y1={0} x2={0} y2={plotH} stroke="var(--border)" strokeWidth={1} />

          {[1, 2, 3, 4, 5].map((d) => (
            <text key={d} x={((d - 1) / 4) * plotW} y={plotH + 20} textAnchor="middle" fontSize="10" fontFamily="var(--mono)" fill="var(--ink-dim)">
              {d}
            </text>
          ))}
          {[1, 2, 3, 4, 5].map((e) => (
            <text key={e} x={-10} y={plotH - ((e - 1) / 4) * plotH + 3} textAnchor="end" fontSize="10" fontFamily="var(--mono)" fill="var(--ink-dim)">
              {e}
            </text>
          ))}

          {points.map((p) => {
            const isHover = hover === p.r.category;
            return (
              <g
                key={p.r.category}
                onMouseEnter={() => setHover(p.r.category)}
                onMouseLeave={() => setHover((h) => (h === p.r.category ? null : h))}
              >
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={p.rad}
                  fill="var(--amber)"
                  fillOpacity={isHover ? 0.9 : 0.6}
                  stroke={isHover ? "var(--amber-bright)" : "transparent"}
                  strokeWidth={2}
                  style={{ transition: "fill-opacity 150ms ease" }}
                />
                {isHover && (
                  <text x={p.x} y={p.y - p.rad - 8} textAnchor="middle" fontSize="11" fontWeight={700} fill="var(--ink)">
                    {solutionCategoryLabel(p.r.category)} ({p.r.count})
                  </text>
                )}
              </g>
            );
          })}

          <text x={plotW / 2} y={plotH + 38} textAnchor="middle" fontSize="10.5" fontFamily="var(--mono)" fill="var(--ink-dim)" letterSpacing="0.05em">
            DIFFICULTY TO IMPLEMENT (1 EASY, 5 HARD)
          </text>
          <text x={-plotH / 2} y={-38} textAnchor="middle" fontSize="10.5" fontFamily="var(--mono)" fill="var(--ink-dim)" letterSpacing="0.05em" transform="rotate(-90)">
            REPORTED EFFECTIVENESS
          </text>
        </g>
      </svg>
      <div style={{ marginTop: 10, fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.55 }}>
        Each bubble is a type of fix people actually tried, only counting cases where both difficulty and effectiveness were reported. Top-left is the sweet spot: cheap to build, reported to work. Bubble size is how often that fix was mentioned.
      </div>
    </div>
  );
}
