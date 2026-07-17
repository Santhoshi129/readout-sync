"use client";
import { useState } from "react";
import { SolutionQuadrantRow, solutionCategoryLabel, painPointLabel } from "@/lib/retention-research";
import { InfoTip } from "@/components/InfoTip";

function Dots({ value, max = 5, color }: { value: number; max?: number; color: string }) {
  return (
    <span style={{ display: "inline-flex", gap: 3 }}>
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: i < Math.round(value) ? color : "var(--border)",
            display: "inline-block",
          }}
        />
      ))}
    </span>
  );
}

export function QuickWinsMatrix({ rows }: { rows: SolutionQuadrantRow[] }) {
  const [hover, setHover] = useState<string | null>(null);

  if (rows.length === 0) {
    return <div style={{ color: "var(--ink-faint)" }}>Not enough scored solutions yet.</div>;
  }

  const ranked = [...rows].sort((a, b) => (b.avgEffectiveness - b.avgDifficulty) - (a.avgEffectiveness - a.avgDifficulty));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 11, color: "var(--ink-dim)", padding: "0 4px" }}>
        <span style={{ display: "flex", alignItems: "center" }}>
          A fix counts as a "quick win" when it scores <span style={{ color: "var(--ink)", fontWeight: 600, margin: "0 4px" }}>≤2.5/5 difficulty</span> AND{" "}
          <span style={{ color: "var(--ink)", fontWeight: 600, margin: "0 4px" }}>≥3.5/5 effectiveness</span>
          <InfoTip text="Both thresholds have to hold at once - a fix that's easy but didn't work well doesn't qualify, and neither does one that worked well but was a real lift to pull off. This is a fixed rule applied the same way to every solution, not a judgment call made row by row." />
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 130px 130px 60px", gap: 12, fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-dim)", letterSpacing: "0.05em", padding: "0 4px" }}>
        <div>FIX TRIED</div>
        <div>EASY TO BUILD</div>
        <div>WORKED WELL</div>
        <div style={{ textAlign: "right" }}>N</div>
      </div>
      {ranked.map((r) => {
        const isQuickWin = r.avgDifficulty <= 2.5 && r.avgEffectiveness >= 3.5;
        const isHovered = hover === r.category;
        return (
          <div
            key={r.category}
            onMouseEnter={() => setHover(r.category)}
            onMouseLeave={() => setHover((h) => (h === r.category ? null : h))}
            style={{ position: "relative" }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 130px 130px 60px",
                gap: 12,
                alignItems: "center",
                padding: "12px 14px",
                borderRadius: 10,
                border: `1px solid ${isQuickWin ? "var(--cold)" : "var(--border)"}`,
                background: isQuickWin ? "rgba(122,168,201,0.06)" : "var(--card)",
                cursor: "help",
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{solutionCategoryLabel(r.category)}</div>
                {isQuickWin && (
                  <div style={{ fontFamily: "var(--mono)", fontSize: 9.5, color: "var(--cold)", letterSpacing: "0.05em", marginTop: 3 }}>
                    QUICK WIN
                  </div>
                )}
              </div>
              <Dots value={6 - r.avgDifficulty} color="var(--cold)" />
              <Dots value={r.avgEffectiveness} color="var(--hot)" />
              <div style={{ textAlign: "right", fontSize: 13, color: "var(--ink-dim)" }}>{r.count}</div>
            </div>
            {isHovered && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  marginTop: 6,
                  background: "var(--card-raised)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "12px 14px",
                  fontSize: 12,
                  color: "var(--ink-dim)",
                  lineHeight: 1.55,
                  zIndex: 60,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                }}
              >
                <div style={{ color: "var(--ink)", marginBottom: 8 }}>
                  {isQuickWin
                    ? `Qualifies because ${r.avgDifficulty.toFixed(1)}/5 difficulty is at or under the 2.5 threshold, and ${r.avgEffectiveness.toFixed(1)}/5 effectiveness is at or over the 3.5 threshold.`
                    : `Doesn't qualify: ${r.avgDifficulty.toFixed(1)}/5 difficulty ${r.avgDifficulty <= 2.5 ? "is under 2.5" : "is over the 2.5 threshold"}, ${r.avgEffectiveness.toFixed(
                        1
                      )}/5 effectiveness ${r.avgEffectiveness >= 3.5 ? "is over 3.5" : "is under the 3.5 threshold"}.`}
                </div>
                {r.effectivenessWhy && (
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ color: "var(--hot)", fontWeight: 600 }}>Why this effectiveness score: </span>
                    {r.effectivenessWhy}
                  </div>
                )}
                {r.difficultyWhy && (
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: "var(--cold)", fontWeight: 600 }}>Why this difficulty score: </span>
                    {r.difficultyWhy}
                  </div>
                )}
                <div style={{ fontSize: 11, color: "var(--ink-faint)", paddingTop: 6, borderTop: "1px solid var(--border-soft)" }}>
                  Tried against: {r.painPoints.slice(0, 3).map((p) => `${painPointLabel(p.pain_point)} (${p.count})`).join(", ")}
                  {r.painPoints.length > 3 && `, +${r.painPoints.length - 3} more`}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
