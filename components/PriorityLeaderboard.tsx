"use client";
import { PriorityRow, painPointLabel, solutionCategoryLabel } from "@/lib/retention-research";
import { InfoTip } from "@/components/InfoTip";

const MEDAL = ["#e6c766", "#b8b8b8", "#c9834c"];

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

              {r.topSolution && (
                <div style={{ marginTop: 6, fontSize: 12, color: "var(--ink-dim)" }}>
                  Most tried so far: {solutionCategoryLabel(r.topSolution)} ({r.topSolutionCount} mentions)
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
