"use client";
import { useState, useEffect } from "react";
import { label } from "@/lib/retention-matrix";

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

interface Point {
  solution: string;
  parentPainPoint: string;
  effectiveness: number;
  difficulty: number;
  frequency: number;
}

// Difficulty (x) vs effectiveness (y), bubble size = mention frequency.
// Top-left is the quadrant to act on first - a solution that's cheap to
// run and reported as working. Same visual grammar as PriorityMatrix on
// Retention Signal (quadrant guides, hover-to-name, dashed midlines) but
// independent props - this page doesn't import anything from lib/retention.
export function QuickWinsMatrix({ points }: { points: Point[] }) {
  const mounted = useMounted();
  const [hover, setHover] = useState<number | null>(null);
  const W = 640, H = 340, PAD = 48;

  if (points.length === 0) {
    return (
      <div style={{ color: "var(--ink-faint)", fontSize: 13, textAlign: "center", padding: "60px 0" }}>
        No solutions with a scored effectiveness yet to plot — this fills in as more discussions surface concrete fixes, not just complaints.
      </div>
    );
  }

  const midX = PAD + 0.5 * (W - PAD * 2);
  const midY = H - PAD - 0.5 * (H - PAD * 2);
  const active = hover != null ? points[hover] : null;

  const xOf = (difficulty: number) => PAD + (difficulty / 5) * (W - PAD * 2);
  const yOf = (effectiveness: number) => H - PAD - (effectiveness / 5) * (H - PAD * 2);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <line
            key={g}
            x1={PAD} x2={W - PAD}
            y1={H - PAD - g * (H - PAD * 2)} y2={H - PAD - g * (H - PAD * 2)}
            stroke="var(--border-soft)" strokeWidth="1"
          />
        ))}

        <line x1={midX} y1={PAD} x2={midX} y2={H - PAD} stroke="var(--border-soft)" strokeWidth="1" strokeDasharray="4 4" />
        <line x1={PAD} y1={midY} x2={W - PAD} y2={midY} stroke="var(--border-soft)" strokeWidth="1" strokeDasharray="4 4" />
        <rect x={PAD} y={PAD} width={midX - PAD} height={midY - PAD} fill="rgba(127,201,138,0.05)" />

        <text x={PAD + 6} y={PAD + 16} fontSize="9.5" fontFamily="var(--mono)" fill="var(--hot)" letterSpacing="1.5">
          QUICK WINS · CHEAP &amp; WORKING
        </text>
        <text x={W - PAD - 6} y={PAD + 16} textAnchor="end" fontSize="9.5" fontFamily="var(--mono)" fill="var(--amber)" letterSpacing="1.5">
          MAJOR BETS
        </text>
        <text x={PAD + 6} y={H - PAD - 8} fontSize="9.5" fontFamily="var(--mono)" fill="var(--ink-faint)" letterSpacing="1.5">
          LOW PRIORITY
        </text>
        <text x={W - PAD - 6} y={H - PAD - 8} textAnchor="end" fontSize="9.5" fontFamily="var(--mono)" fill="var(--bad)" letterSpacing="1.5">
          HEAVY LIFT
        </text>

        <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="var(--border)" strokeWidth="1.5" />
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--border)" strokeWidth="1.5" />
        <text x={PAD} y={H - 16} fontSize="10" fontFamily="var(--mono)" fill="var(--ink-faint)" letterSpacing="1">
          DIFFICULTY →
        </text>
        <text x={14} y={PAD} fontSize="10" fontFamily="var(--mono)" fill="var(--ink-faint)" letterSpacing="1" transform={`rotate(-90 14 ${PAD})`}>
          EFFECTIVENESS →
        </text>

        {points.map((p, i) => {
          const x = xOf(p.difficulty);
          const y = yOf(p.effectiveness);
          const r = mounted ? 8 + p.frequency * 5 : 0;
          return (
            <circle
              key={`${p.solution}-${i}`}
              cx={x} cy={y} r={r}
              fill="var(--amber)"
              opacity={hover == null || hover === i ? 0.75 : 0.25}
              stroke="var(--bg)"
              strokeWidth="2"
              style={{ transition: "r 500ms cubic-bezier(0.16,1,0.3,1), opacity 180ms ease", cursor: "pointer" }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover((h) => (h === i ? null : h))}
            />
          );
        })}
      </svg>

      <div style={{ marginTop: 10, fontSize: 12.5, color: "var(--ink-dim)", minHeight: 18 }}>
        {active ? (
          <>
            <strong style={{ color: "var(--ink)" }}>{active.solution}</strong>
            {" — under "}{label(active.parentPainPoint)}
            {" · effectiveness "}{active.effectiveness}/5{" · difficulty "}{active.difficulty}/5
            {" · "}{active.frequency} mention{active.frequency === 1 ? "" : "s"}
          </>
        ) : (
          "Hover a bubble for detail."
        )}
      </div>
    </div>
  );
}
