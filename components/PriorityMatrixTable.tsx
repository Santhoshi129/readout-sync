"use client";
import { Fragment, useMemo, useState } from "react";
import { PriorityRow, painPointLabel, solutionCategoryLabel } from "@/lib/retention-research";
import { InfoTip } from "@/components/InfoTip";

type SortKey = "score" | "core_fit" | "avgSeverity" | "solutionRate" | "total";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "score", label: "Priority" },
  { key: "core_fit", label: "Core-fit findings" },
  { key: "avgSeverity", label: "Avg severity" },
  { key: "solutionRate", label: "Solved already" },
  { key: "total", label: "Total findings" },
];

function Dots({ value, max = 5, color }: { value: number; max?: number; color: string }) {
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: i < Math.round(value) ? color : "var(--border)",
            display: "inline-block",
          }}
        />
      ))}
    </span>
  );
}

const TIER_COLOR: Record<string, string> = { strong: "var(--hot)", moderate: "var(--amber)", weak: "var(--muted)" };
const TIER_DEF: Record<string, string> = {
  strong: "Specific, credible, unambiguous. High trust it's a real, on-topic retention finding.",
  moderate: "Plausible and on-topic, but less specific or certain than strong.",
  weak: "Worth watching, not yet settled. A lead, not a conclusion.",
};

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
  const [hoverConf, setHoverConf] = useState<string | null>(null);

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
              {(
                [
                  { label: "Pain point", tip: null },
                  { label: "Priority", tip: null },
                  {
                    label: "Core-fit findings",
                    tip: "A finding is one classified Reddit post or comment, not a whole thread. A single thread can produce several findings if more than one comment mentions this pain point. Core-fit means TWU's product can address it directly.",
                  },
                  {
                    label: "Avg severity",
                    tip: "Severity (1-5) is set per finding based on how the member described the impact: a passing annoyance scores low, a stated reason someone left or nearly left scores 4-5. This column averages that score across every finding in the row.",
                  },
                  { label: "Solved already", tip: null },
                  { label: "Confidence", tip: null },
                ] as { label: string; tip: string | null }[]
              ).map((h) => (
                <th
                  key={h.label}
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
                  {h.label}
                  {h.tip && <InfoTip text={h.tip} />}
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
                            padding: "16px 20px",
                            borderRadius: 10,
                            background: "var(--card-raised)",
                            border: "1px solid var(--border-soft)",
                            display: "flex",
                            flexDirection: "column",
                            gap: 14,
                          }}
                        >
                          <div style={{ fontSize: 13.5, color: "var(--ink)", lineHeight: 1.6 }}>{r.recommendedAction}</div>

                          <div style={{ display: "flex", flexWrap: "wrap", gap: 24, paddingTop: 12, borderTop: "1px solid var(--border-soft)" }}>
                            <div>
                              <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-dim)", marginBottom: 6, letterSpacing: "0.05em" }}>
                                CONFIDENCE MIX
                              </div>
                              <div style={{ position: "relative", padding: "10px 0", margin: "-10px 0", width: 200 }}>
                                <div className="bar-track thin" style={{ display: "flex", width: "100%" }}>
                                  {(["strong", "moderate", "weak"] as const).map((t) => {
                                    const w = r.total > 0 ? (r.confidenceMix[t] / r.total) * 100 : 0;
                                    const key = `${r.pain_point}:${t}`;
                                    if (r.confidenceMix[t] === 0) return null;
                                    return (
                                      <div
                                        key={t}
                                        onMouseEnter={() => setHoverConf(key)}
                                        onMouseLeave={() => setHoverConf((h) => (h === key ? null : h))}
                                        style={{ width: `${w}%`, position: "relative", cursor: "pointer" }}
                                      >
                                        <div style={{ width: "100%", height: "100%", background: TIER_COLOR[t] }} />
                                        {hoverConf === key && (
                                          <div
                                            style={{
                                              position: "absolute",
                                              bottom: "140%",
                                              left: "50%",
                                              transform: "translateX(-50%)",
                                              width: 200,
                                              background: "var(--card-raised)",
                                              border: "1px solid var(--border)",
                                              borderRadius: 10,
                                              padding: "9px 11px",
                                              fontSize: 11.5,
                                              color: "var(--ink-dim)",
                                              lineHeight: 1.5,
                                              zIndex: 50,
                                              boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                                              pointerEvents: "none",
                                            }}
                                          >
                                            <div style={{ color: "var(--ink)", fontWeight: 700, marginBottom: 3 }}>
                                              {r.confidenceMix[t]} of {r.total} findings
                                            </div>
                                            {TIER_DEF[t]}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div style={{ paddingTop: 4 }}>
                            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-dim)", marginBottom: 10, letterSpacing: "0.05em" }}>
                              SOLUTIONS DISCUSSED FOR THIS PROBLEM
                              <InfoTip text="Every distinct fix mentioned in a finding under this pain point, ranked by how often it came up. Effectiveness and difficulty are only averaged over the findings that reported both - a solution can be frequently mentioned but rarely scored, that's called out separately." />
                            </div>
                            {r.solutions.length === 0 ? (
                              <div style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>No solution mentioned in any finding under this pain point yet.</div>
                            ) : (
                              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 70px 90px 90px",
                                    gap: 10,
                                    fontFamily: "var(--mono)",
                                    fontSize: 9.5,
                                    color: "var(--ink-faint)",
                                    letterSpacing: "0.04em",
                                    padding: "0 2px",
                                  }}
                                >
                                  <div>FIX</div>
                                  <div style={{ textAlign: "right" }}>MENTIONS</div>
                                  <div>EFFECTIVENESS</div>
                                  <div>DIFFICULTY</div>
                                </div>
                                {r.solutions.map((s) => (
                                  <div
                                    key={s.category}
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns: "1fr 70px 90px 90px",
                                      gap: 10,
                                      alignItems: "center",
                                      padding: "7px 2px",
                                      borderTop: "1px solid var(--border-soft)",
                                    }}
                                  >
                                    <div style={{ fontSize: 12.5, color: "var(--ink)" }}>{solutionCategoryLabel(s.category)}</div>
                                    <div style={{ textAlign: "right", fontSize: 12, color: "var(--ink-dim)" }}>{s.count}</div>
                                    <div title={s.effectivenessWhy ? `Why: ${s.effectivenessWhy}` : undefined} style={{ cursor: s.effectivenessWhy ? "pointer" : "default" }}>
                                      {s.avgEffectiveness != null ? (
                                        <Dots value={s.avgEffectiveness} color="var(--hot)" />
                                      ) : (
                                        <span style={{ fontSize: 10.5, color: "var(--ink-faint)" }}>not scored</span>
                                      )}
                                    </div>
                                    <div title={s.difficultyWhy ? `Why: ${s.difficultyWhy}` : undefined} style={{ cursor: s.difficultyWhy ? "pointer" : "default" }}>
                                      {s.avgDifficulty != null ? (
                                        <Dots value={6 - s.avgDifficulty} color="var(--cold)" />
                                      ) : (
                                        <span style={{ fontSize: 10.5, color: "var(--ink-faint)" }}>not scored</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
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
