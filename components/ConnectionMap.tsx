"use client";
import { useState } from "react";
import { PainPoint, label, ACTIONABLE_TONE, ACTIONABLE_TEXT } from "@/lib/retention-matrix";

const TONE_COLOR: Record<string, string> = { hot: "var(--hot)", amber: "var(--amber)", bad: "var(--bad)" };

// Pain point -> solution flow map, colored by product relevance rather
// than just frequency. The point isn't "what's being said" (the Pareto
// chart and ranking already answer that) - it's "which of these could
// TWU's app actually move, versus which are staffing/business/culture
// problems no feature will touch." Nodes without a solution still show,
// dimmed, so the gap itself is visible rather than silently omitted.
export function ConnectionMap({ rows }: { rows: PainPoint[] }) {
  const [hoverPP, setHoverPP] = useState<string | null>(null);
  const W = 760, H = Math.max(360, rows.length * 42 + 40);
  const leftX = 190, rightX = W - 190;
  const rowH = (H - 40) / rows.length;

  const ppY = (i: number) => 30 + i * rowH + rowH / 2;

  // Flatten solutions with a stable vertical slot on the right column,
  // grouped roughly near their parent's row.
  const solutionEntries: { solution: string; parent: string; y: number }[] = [];
  rows.forEach((pp, i) => {
    pp.solutions.forEach((s, j) => {
      solutionEntries.push({ solution: s.solution, parent: pp.pain_point, y: ppY(i) + (j - (pp.solutions.length - 1) / 2) * 16 });
    });
  });

  return (
    <div>
      <div style={{ display: "flex", gap: 18, marginBottom: 16, flexWrap: "wrap", fontFamily: "var(--mono)", fontSize: 11 }}>
        {(["yes", "partial", "no"] as const).map((k) => (
          <span key={k} style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--ink-dim)" }}>
            <i className="dot-legend" style={{ background: TONE_COLOR[ACTIONABLE_TONE[k]] }} />
            {ACTIONABLE_TEXT[k]}
          </span>
        ))}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
        <text x={leftX} y={16} fontSize="9.5" fontFamily="var(--mono)" fill="var(--ink-faint)" letterSpacing="1.5">PAIN POINT</text>
        <text x={rightX} y={16} fontSize="9.5" fontFamily="var(--mono)" fill="var(--ink-faint)" letterSpacing="1.5" textAnchor="end">SOLUTION MENTIONED</text>

        {rows.map((pp, i) => {
          const y = ppY(i);
          const dimmed = hoverPP != null && hoverPP !== pp.pain_point;
          const tone = TONE_COLOR[ACTIONABLE_TONE[pp.twu_actionable]];
          return (
            <g key={pp.pain_point} opacity={dimmed ? 0.25 : 1} style={{ transition: "opacity 150ms ease" }}>
              {pp.solutions.length > 0 ? (
                pp.solutions.map((s, j) => {
                  const entry = solutionEntries.find((e) => e.parent === pp.pain_point && e.solution === s.solution);
                  const sy = entry ? entry.y : y;
                  const midX = (leftX + rightX) / 2;
                  return (
                    <path
                      key={s.solution}
                      d={`M ${leftX + 8} ${y} C ${midX} ${y}, ${midX} ${sy}, ${rightX - 8} ${sy}`}
                      fill="none"
                      stroke={tone}
                      strokeWidth="1.5"
                      opacity={0.55}
                    />
                  );
                })
              ) : null}

              <circle cx={leftX} cy={y} r={5} fill={tone} style={{ cursor: "pointer" }} onMouseEnter={() => setHoverPP(pp.pain_point)} onMouseLeave={() => setHoverPP(null)} />
              <text
                x={leftX - 12} y={y + 4} textAnchor="end" fontSize="12"
                fill={dimmed ? "var(--ink-faint)" : "var(--ink)"} fontWeight={hoverPP === pp.pain_point ? 700 : 400}
                style={{ cursor: "pointer" }} onMouseEnter={() => setHoverPP(pp.pain_point)} onMouseLeave={() => setHoverPP(null)}
              >
                {label(pp.pain_point)}
              </text>
              <text x={leftX - 12} y={y + 17} textAnchor="end" fontSize="9.5" fontFamily="var(--mono)" fill="var(--ink-faint)">
                {pp.frequency} mention{pp.frequency === 1 ? "" : "s"}
              </text>
            </g>
          );
        })}

        {solutionEntries.map((e) => {
          const dimmed = hoverPP != null && hoverPP !== e.parent;
          const parent = rows.find((r) => r.pain_point === e.parent)!;
          return (
            <g key={`${e.parent}-${e.solution}`} opacity={dimmed ? 0.25 : 1} style={{ transition: "opacity 150ms ease" }}>
              <circle cx={rightX} cy={e.y} r={4} fill={TONE_COLOR[ACTIONABLE_TONE[parent.twu_actionable]]} />
              <text x={rightX + 12} y={e.y + 4} fontSize="11.5" fill="var(--ink-dim)">{e.solution}</text>
            </g>
          );
        })}

        {rows.filter((r) => r.solutions.length === 0).map((pp, i) => {
          const idx = rows.findIndex((r) => r.pain_point === pp.pain_point);
          const y = ppY(idx);
          const dimmed = hoverPP != null && hoverPP !== pp.pain_point;
          return (
            <text key={pp.pain_point} x={rightX} y={y + 4} textAnchor="start" fontSize="10.5" fontFamily="var(--mono)" fill="var(--ink-faint)" opacity={dimmed ? 0.25 : 0.7}>
              — no solution surfaced yet
            </text>
          );
        })}
      </svg>
    </div>
  );
}
