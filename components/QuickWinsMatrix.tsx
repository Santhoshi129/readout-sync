"use client";
import { SolutionQuadrantRow, solutionCategoryLabel } from "@/lib/retention-research";

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
  if (rows.length === 0) {
    return <div style={{ color: "var(--ink-faint)" }}>Not enough scored solutions yet.</div>;
  }

  const ranked = [...rows].sort((a, b) => (b.avgEffectiveness - b.avgDifficulty) - (a.avgEffectiveness - a.avgDifficulty));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 130px 130px 60px", gap: 12, fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-dim)", letterSpacing: "0.05em", padding: "0 4px" }}>
        <div>FIX TRIED</div>
        <div>EASY TO BUILD</div>
        <div>WORKED WELL</div>
        <div style={{ textAlign: "right" }}>N</div>
      </div>
      {ranked.map((r) => {
        const isQuickWin = r.avgDifficulty <= 2.5 && r.avgEffectiveness >= 3.5;
        return (
          <div
            key={r.category}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 130px 130px 60px",
              gap: 12,
              alignItems: "center",
              padding: "12px 14px",
              borderRadius: 10,
              border: `1px solid ${isQuickWin ? "var(--cold)" : "var(--border)"}`,
              background: isQuickWin ? "rgba(122,168,201,0.06)" : "var(--card)",
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
        );
      })}
    </div>
  );
}
