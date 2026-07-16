"use client";
import { Fragment, useMemo, useState } from "react";
import { PriorityRow, painPointLabel, solutionCategoryLabel } from "@/lib/retention-research";

type SortKey = "score" | "core_fit" | "avgSeverity" | "solutionRate" | "total";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "score", label: "Priority" },
  { key: "core_fit", label: "Core-fit findings" },
  { key: "avgSeverity", label: "Avg severity" },
  { key: "solutionRate", label: "Solved already" },
  { key: "total", label: "Total findings" },
];

const TIER_COLOR: Record<string, string> = { strong: "var(--hot)", moderate: "var(--amber)", weak: "var(--muted)" };

export function PriorityMatrixTable({
  rows,
  activePainPoint,
  onSelect,
}: {
  rows: PriorityRow[];
  activePainPoint?: string | null;
  onSelect?: (pp: string) => void;
}) {
  const [sort, setSort] = useState<SortKey>("score");
  const [expanded, setExpanded] = useState<string | null>(null);

  const sorted = useMemo(() => [...rows].sort((a, b) => b[sort] - a[sort]), [rows, sort]);
  const maxScore = Math.max(0.001, ...rows.map((r) => r.score));

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--ink-faint)", padding: "6px 4px" }}>
          SORT BY:
        </span>
        {SORTS.map((s) => (
          <span
            key={s.key}
            onClick={() => setSort(s.key)}
            style={{
              background: sort === s.key ? "rgba(201,168,76,0.12)" : "transparent",
              border: `1px solid ${sort === s.key ? "var(--amber)" : "var(--border)"}`,
              borderRadius: 999,
              color: sort === s.key ? "var(--amber)" : "var(--ink-dim)",
              fontFamily: "var(--mono)",
              fontSize: 10.5,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              padding: "6px 12px",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {s.label}
          </span>
        ))}
      </div>

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
            {sorted.map((r, i) => {
              const isActive = activePainPoint === r.pain_point;
              const isExpanded = expanded === r.pain_point;
              const barW = r.score > 0 ? Math.max(4, (r.score / maxScore) * 100) : 0;
              return (
                <Fragment key={r.pain_point}>
                  <tr
                    style={{
                      borderBottom: isExpanded ? "none" : "1px solid var(--border-soft)",
                      cursor: "pointer",
                      background: isActive ? "rgba(201,168,76,0.06)" : "transparent",
                    }}
                  >
                    <td style={{ padding: "12px 14px 12px 0" }} onClick={() => setExpanded(isExpanded ? null : r.pain_point)}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: "var(--ink-faint)", fontSize: 10, transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform 150ms ease", display: "inline-block" }}>
                          &#9656;
                        </span>
                        <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-faint)", width: 14, flex: "none" }}>{i + 1}</span>
                        <span style={{ fontWeight: isActive ? 700 : 600, color: isActive ? "var(--amber)" : "var(--ink)" }}>
                          {painPointLabel(r.pain_point)}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px 12px 0", minWidth: 120 }} onClick={() => setExpanded(isExpanded ? null : r.pain_point)}>
                      <div className="bar-track thin" title={`priority score ${r.score.toFixed(1)}`}>
                        <div className="bar-fill" style={{ width: `${barW}%`, background: i === 0 && r.score > 0 ? "var(--hot)" : "var(--amber)" }} />
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px 12px 0", fontWeight: 700 }} onClick={() => setExpanded(isExpanded ? null : r.pain_point)}>
                      {r.core_fit} <span style={{ color: "var(--ink-faint)", fontWeight: 400 }}>of {r.total}</span>
                    </td>
                    <td style={{ padding: "12px 14px 12px 0" }} onClick={() => setExpanded(isExpanded ? null : r.pain_point)}>
                      <span style={{ color: r.avgSeverity >= 4 ? "var(--bad)" : r.avgSeverity >= 3 ? "var(--amber)" : "var(--ink-dim)" }}>
                        {r.avgSeverity > 0 ? r.avgSeverity.toFixed(1) : "n/a"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px 12px 0" }} onClick={() => setExpanded(isExpanded ? null : r.pain_point)}>
                      <span style={{ color: r.solutionRate < 0.3 ? "var(--hot)" : "var(--ink-dim)" }}>
                        {Math.round(r.solutionRate * 100)}%
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px 12px 0" }}>
                      <button
                        onClick={() => onSelect?.(r.pain_point)}
                        style={{
                          background: "transparent",
                          border: `1px solid ${isActive ? "var(--amber)" : "var(--border)"}`,
                          borderRadius: 999,
                          color: isActive ? "var(--amber)" : "var(--ink-faint)",
                          fontFamily: "var(--mono)",
                          fontSize: 10,
                          letterSpacing: "0.05em",
                          padding: "3px 10px",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {isActive ? "selected" : "see evidence"}
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr style={{ borderBottom: "1px solid var(--border-soft)" }}>
                      <td colSpan={6} style={{ padding: "0 14px 18px 0" }}>
                        <div
                          style={{
                            marginLeft: 22,
                            padding: "14px 18px",
                            borderRadius: 10,
                            background: "var(--card-raised)",
                            border: "1px solid var(--border-soft)",
                            display: "flex",
                            flexDirection: "column",
                            gap: 12,
                          }}
                        >
                          <div>
                            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-faint)", marginBottom: 6, letterSpacing: "0.05em" }}>
                              CONFIDENCE MIX
                            </div>
                            <div className="bar-track thin" style={{ display: "flex", maxWidth: 280 }}>
                              {(["strong", "moderate", "weak"] as const).map((t) => {
                                const w = r.total > 0 ? (r.confidenceMix[t] / r.total) * 100 : 0;
                                return r.confidenceMix[t] > 0 ? (
                                  <div key={t} style={{ width: `${w}%`, background: TIER_COLOR[t], height: "100%" }} title={`${t}: ${r.confidenceMix[t]}`} />
                                ) : null;
                              })}
                            </div>
                          </div>
                          <div style={{ fontSize: 12.5, color: "var(--ink-dim)" }}>
                            <span style={{ color: "var(--ink-faint)" }}>Most-tried fix: </span>
                            {r.topSolution ? `${solutionCategoryLabel(r.topSolution)} (${r.topSolutionCount} mentions)` : "none named yet"}
                          </div>
                          <div style={{ fontSize: 13, color: "var(--ink)", fontWeight: 500 }}>{r.recommendedAction}</div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
