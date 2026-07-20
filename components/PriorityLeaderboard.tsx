"use client";
import { useState } from "react";
import type { CSSProperties } from "react";
import { PriorityRow, painPointLabel, solutionCategoryLabel } from "@/lib/retention-research";
import { InfoTip } from "@/components/InfoTip";

const MEDAL = ["#e6c766", "#b8b8b8", "#c9834c"];

function SolutionsBreakdown({ solutions }: { solutions: PriorityRow["solutions"] }) {
  const [showAll, setShowAll] = useState(false);
  if (solutions.length === 0) return null;
  const shown = showAll ? solutions : solutions.slice(0, 3);
  const hidden = solutions.length - shown.length;

  const toggleBtnStyle: CSSProperties = {
    marginTop: 8,
    background: "transparent",
    border: "1px solid var(--border)",
    borderRadius: 999,
    color: "var(--amber)",
    fontFamily: "var(--mono)",
    fontSize: 10.5,
    letterSpacing: "0.05em",
    padding: "5px 12px",
    cursor: "pointer",
  };

  return (
    <div style={{ marginTop: 12 }} onClick={(e) => e.stopPropagation()}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-faint)", letterSpacing: "0.05em", marginBottom: 8, display: "flex", alignItems: "center" }}>
        SOLUTIONS DISCUSSED FOR THIS PROBLEM
        <InfoTip text="Every distinct fix people mentioned trying for this pain point, ranked by how often it came up. Effectiveness (1-5) is how well the fix reportedly worked, based on the outcome the person described. Difficulty (1-5) is how hard that fix looked to build or run. Both are averaged only over findings that reported both scores, so a fix mentioned once with no outcome shows as 'not yet scored' rather than a misleading average." />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {shown.map((s) => (
          <div
            key={s.category}
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 10,
              fontSize: 12.5,
              padding: "7px 0",
              borderTop: "1px solid var(--border-soft)",
            }}
          >
            <span style={{ color: "var(--ink)", fontWeight: 600, minWidth: 160 }}>{solutionCategoryLabel(s.category)}</span>
            <span style={{ color: "var(--ink-dim)" }}>
              {s.count} mention{s.count === 1 ? "" : "s"}
            </span>
            {s.avgEffectiveness != null ? (
              <span
                title={
                  s.effectivenessWhy
                    ? `Effectiveness ${s.avgEffectiveness.toFixed(1)}/5 - why: ${s.effectivenessWhy}`
                    : `Effectiveness ${s.avgEffectiveness.toFixed(1)}/5, averaged across ${s.scoredCount} scored finding${s.scoredCount === 1 ? "" : "s"}.`
                }
                style={{ color: "var(--hot)", cursor: "pointer", borderBottom: "1px dotted var(--hot)" }}
              >
                {s.avgEffectiveness.toFixed(1)}/5 effectiveness
              </span>
            ) : (
              <span
                title="No finding for this specific fix reported both a difficulty and an effectiveness outcome, so there isn't enough to average yet - it's still a real mention, just not a scored one."
                style={{ color: "var(--ink-faint)", cursor: "pointer", borderBottom: "1px dotted var(--ink-faint)" }}
              >
                not yet scored
              </span>
            )}
            {s.avgDifficulty != null && (
              <span
                title={
                  s.difficultyWhy
                    ? `Difficulty ${s.avgDifficulty.toFixed(1)}/5 - why: ${s.difficultyWhy}`
                    : `Difficulty ${s.avgDifficulty.toFixed(1)}/5, averaged across the same ${s.scoredCount} scored finding${s.scoredCount === 1 ? "" : "s"}.`
                }
                style={{ color: "var(--cold)", cursor: "pointer", borderBottom: "1px dotted var(--cold)" }}
              >
                {s.avgDifficulty.toFixed(1)}/5 difficulty
              </span>
            )}
          </div>
        ))}
      </div>
      {solutions.length > 3 && (
        <button onClick={() => setShowAll((v) => !v)} style={toggleBtnStyle}>
          {showAll ? "Show fewer" : `+${hidden} more solution${hidden === 1 ? "" : "s"}`}
        </button>
      )}
    </div>
  );
}

export function PriorityLeaderboard({
  rows,
  active,
  onSelect,
}: {
  rows: PriorityRow[];
  active?: string | null;
  onSelect?: (pp: string) => void;
}) {
  const ranked = rows.filter((r) => r.score > 0).slice(0, 6);

  if (ranked.length === 0) {
    return <div style={{ color: "var(--ink-faint)" }}>Not enough data yet to rank anything.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {ranked.map((r, i) => {
        const isActive = active === r.pain_point;
        const openPct = Math.round((1 - r.solutionRate) * 100);
        const barColor = openPct >= 60 ? "var(--bad)" : openPct >= 35 ? "var(--amber)" : "var(--cold)";
        return (
          <div
            key={r.pain_point}
            onClick={() => onSelect?.(r.pain_point)}
            style={{
              display: "grid",
              gridTemplateColumns: "44px 1fr",
              gap: 18,
              padding: "18px 20px",
              borderRadius: 12,
              border: `1px solid ${isActive ? "var(--amber)" : "var(--border)"}`,
              background: isActive ? "rgba(201,168,76,0.08)" : "var(--card)",
              cursor: onSelect ? "pointer" : "default",
              transition: "border-color 150ms ease, background 150ms ease",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-head)",
                fontSize: 19,
                fontWeight: 800,
                color: i < 3 ? "#000" : "var(--ink-dim)",
                background: i < 3 ? MEDAL[i] : "var(--card-raised)",
                border: i < 3 ? "none" : "1px solid var(--border)",
              }}
            >
              {i + 1}
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ fontFamily: "var(--font-head)", fontSize: 19, fontWeight: 700, color: isActive ? "var(--amber)" : "var(--ink)" }}>
                  {painPointLabel(r.pain_point)}
                </div>
                {i === 0 && (
                  <span
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 10,
                      letterSpacing: "0.08em",
                      color: "var(--amber-bright)",
                      border: "1px solid var(--amber-deep)",
                      borderRadius: 999,
                      padding: "3px 10px",
                    }}
                  >
                    HIGHEST PRIORITY IN THIS DATA
                  </span>
                )}
              </div>

              <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 10, fontSize: 13.5 }}>
                <div>
                  <span style={{ color: "var(--ink)", fontWeight: 700 }}>{r.core_fit}</span>{" "}
                  <span style={{ color: "var(--ink-dim)" }}>findings TWU can fix</span>
                  <InfoTip text="A finding is one classified Reddit post or comment, not a whole thread. One thread can produce several findings if more than one comment mentions this pain point." />
                </div>
                <div>
                  <span style={{ color: "var(--ink)", fontWeight: 700 }}>{r.avgSeverity.toFixed(1)}/5</span>{" "}
                  <span style={{ color: "var(--ink-dim)" }}>average severity</span>
                  <InfoTip text="Severity is set per finding based on how the member described the impact: passing annoyance scores low, a stated reason someone left or nearly left scores 4-5. This is the average across every finding here." />
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-dim)", marginBottom: 5 }}>
                  <span>STILL UNSOLVED</span>
                  <span style={{ color: barColor, fontWeight: 700 }}>{openPct}%</span>
                </div>
                <div className="bar-track thin">
                  <div className="bar-fill" style={{ width: `${openPct}%`, background: barColor }} />
                </div>
              </div>

              <div style={{ marginTop: 12, fontSize: 13.5, color: "var(--ink)", lineHeight: 1.5 }}>{r.recommendedAction}</div>

              <SolutionsBreakdown solutions={r.solutions} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
