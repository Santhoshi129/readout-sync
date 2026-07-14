"use client";
import { useState, useEffect } from "react";
import { label } from "@/lib/retention-matrix";
import type { PainPoint } from "@/lib/retention-matrix";

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

// Classic 80/20 Pareto chart: bars ranked by frequency (left axis), a
// cumulative-percentage line overlaid (right axis). This is the specific
// technique that turns "here's a ranked list" into "here's where the
// problem concentrates" - the 80% gridline plus the point where the line
// crosses it names exactly how many categories you'd need to fix to
// address the bulk of what members are complaining about.
export function ParetoChart({ rows }: { rows: PainPoint[] }) {
  const mounted = useMounted();
  const [hover, setHover] = useState<number | null>(null);

  const total = rows.reduce((s, r) => s + r.frequency, 0);
  let running = 0;
  const points = rows.map((r) => {
    running += r.frequency;
    return { ...r, cumPct: total > 0 ? (running / total) * 100 : 0 };
  });

  // How many categories it takes to cross 80% of all mentions.
  const eightyIdx = points.findIndex((p) => p.cumPct >= 80);
  const eightyCount = eightyIdx === -1 ? points.length : eightyIdx + 1;

  const W = 720, H = 360, PAD_L = 44, PAD_R = 44, PAD_T = 20, PAD_B = 90;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const maxFreq = Math.max(1, ...rows.map((r) => r.frequency));
  const barW = plotW / points.length;

  const xOf = (i: number) => PAD_L + i * barW + barW / 2;
  const yBar = (freq: number) => PAD_T + plotH - (freq / maxFreq) * plotH;
  const yLine = (pct: number) => PAD_T + plotH - (pct / 100) * plotH;

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${xOf(i)} ${yLine(p.cumPct)}`).join(" ");

  return (
    <div>
      <div style={{ display: "flex", gap: 24, marginBottom: 18, flexWrap: "wrap" }}>
        <div className="card" style={{ padding: "14px 20px", flex: "1 1 220px", borderLeft: "3px solid var(--hot)" }}>
          <div className="stat-label" style={{ marginBottom: 6 }}>80% of mentions trace to</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{eightyCount} of {points.length} categories</div>
        </div>
        <div className="card" style={{ padding: "14px 20px", flex: "1 1 220px", borderLeft: "3px solid var(--amber)" }}>
          <div className="stat-label" style={{ marginBottom: 6 }}>Top category alone</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{total > 0 ? Math.round((points[0].frequency / total) * 100) : 0}% of mentions</div>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
        {[0, 20, 40, 60, 80, 100].map((g) => (
          <g key={g}>
            <line x1={PAD_L} x2={W - PAD_R} y1={yLine(g)} y2={yLine(g)} stroke={g === 80 ? "var(--hot)" : "var(--border-soft)"} strokeWidth={g === 80 ? 1.2 : 1} strokeDasharray={g === 80 ? "5 4" : undefined} />
            <text x={W - PAD_R + 6} y={yLine(g) + 4} fontSize="9.5" fontFamily="var(--mono)" fill={g === 80 ? "var(--hot)" : "var(--ink-faint)"}>{g}%</text>
          </g>
        ))}

        {points.map((p, i) => (
          <rect
            key={p.pain_point}
            x={PAD_L + i * barW + barW * 0.18}
            y={yBar(mounted ? p.frequency : 0)}
            width={barW * 0.64}
            height={mounted ? plotH - (yBar(p.frequency) - PAD_T) : 0}
            fill={i < eightyCount ? "var(--amber)" : "var(--muted)"}
            opacity={hover == null || hover === i ? 0.9 : 0.35}
            rx={3}
            style={{ transition: "height 700ms cubic-bezier(0.16,1,0.3,1), y 700ms cubic-bezier(0.16,1,0.3,1)", transitionDelay: `${i * 40}ms`, cursor: "pointer" }}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover((h) => (h === i ? null : h))}
          />
        ))}

        <path d={linePath} fill="none" stroke="var(--hot)" strokeWidth="2" opacity={mounted ? 1 : 0} style={{ transition: "opacity 500ms ease 600ms" }} />
        {points.map((p, i) => (
          <circle key={p.pain_point} cx={xOf(i)} cy={yLine(mounted ? p.cumPct : 0)} r={hover === i ? 5 : 3.5} fill="var(--hot)" style={{ transition: "cy 700ms cubic-bezier(0.16,1,0.3,1)" }} />
        ))}

        <line x1={PAD_L} y1={PAD_T + plotH} x2={W - PAD_R} y2={PAD_T + plotH} stroke="var(--border)" strokeWidth="1.5" />

        {points.map((p, i) => (
          <text
            key={p.pain_point}
            x={xOf(i)}
            y={PAD_T + plotH + 16}
            textAnchor="end"
            fontSize="10"
            fontFamily="var(--mono)"
            fill={hover === i ? "var(--ink)" : "var(--ink-faint)"}
            transform={`rotate(-40 ${xOf(i)} ${PAD_T + plotH + 16})`}
          >
            {label(p.pain_point).length > 18 ? label(p.pain_point).slice(0, 17) + "…" : label(p.pain_point)}
          </text>
        ))}
      </svg>

      <div style={{ display: "flex", gap: 18, marginTop: 4, fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-faint)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}><i className="dot-legend" style={{ background: "var(--amber)" }} />Mentions (bars)</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}><i className="dot-legend" style={{ background: "var(--hot)" }} />Cumulative % (line)</span>
      </div>
    </div>
  );
}
