"use client";
import { PriorityRow, painPointLabel } from "@/lib/retention-research";

export function PriorityMatrixTable({
  rows,
  activePainPoint,
  onSelect,
}: {
  rows: PriorityRow[];
  activePainPoint?: string | null;
  onSelect?: (pp: string) => void;
}) {
  const maxScore = Math.max(0.001, ...rows.map((r) => r.score));

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 760 }}>
        <thead>
          <tr>
            {["Pain point", "Priority", "Core-fit findings", "Avg severity", "Solved already", "Confidence"].map((h) => (
              <th
                key={h}
                style={{
                  textAlign: "left",
                  fontFamily: "var(--mono)",
                  fontSize: 10.5,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--ink-faint)",
                  padding: "0 14px 10px 0",
                  borderBottom: "1px solid var(--border)",
                  whiteSpace: "nowrap",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const isActive = activePainPoint === r.pain_point;
            const barW = r.score > 0 ? Math.max(4, (r.score / maxScore) * 100) : 0;
            return (
              <tr
                key={r.pain_point}
                onClick={() => onSelect?.(r.pain_point)}
                style={{
                  borderBottom: "1px solid var(--border-soft)",
                  cursor: onSelect ? "pointer" : "default",
                  background: isActive ? "rgba(201,168,76,0.06)" : "transparent",
                }}
              >
                <td style={{ padding: "12px 14px 12px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: 10,
                        color: "var(--ink-faint)",
                        width: 16,
                        flex: "none",
                      }}
                    >
                      {i + 1}
                    </span>
                    <span style={{ fontWeight: isActive ? 700 : 600, color: isActive ? "var(--amber)" : "var(--ink)" }}>
                      {painPointLabel(r.pain_point)}
                    </span>
                  </div>
                </td>
                <td style={{ padding: "12px 14px 12px 0", minWidth: 120 }}>
                  <div className="bar-track thin" title={`priority score ${r.score.toFixed(1)}`}>
                    <div className="bar-fill" style={{ width: `${barW}%`, background: i === 0 && r.score > 0 ? "var(--hot)" : "var(--amber)" }} />
                  </div>
                </td>
                <td style={{ padding: "12px 14px 12px 0", fontWeight: 700 }}>
                  {r.core_fit} <span style={{ color: "var(--ink-faint)", fontWeight: 400 }}>of {r.total}</span>
                </td>
                <td style={{ padding: "12px 14px 12px 0" }}>
                  <span style={{ color: r.avgSeverity >= 4 ? "var(--bad)" : r.avgSeverity >= 3 ? "var(--amber)" : "var(--ink-dim)" }}>
                    {r.avgSeverity > 0 ? r.avgSeverity.toFixed(1) : "n/a"}
                  </span>
                </td>
                <td style={{ padding: "12px 14px 12px 0" }}>
                  <span style={{ color: r.solutionRate < 0.3 ? "var(--hot)" : "var(--ink-dim)" }}>
                    {Math.round(r.solutionRate * 100)}%
                  </span>
                </td>
                <td style={{ padding: "12px 14px 12px 0", color: "var(--ink-faint)", fontFamily: "var(--mono)", fontSize: 11.5 }}>
                  {r.strongPct}% strong
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
