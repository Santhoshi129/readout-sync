"use client";
import { useState } from "react";
import { CrossCommunityRow } from "@/lib/combined-analysis";
import { PainPointExample } from "@/lib/retention-research";

const SEVERITY_COLOR = (s: number) => (s >= 3.5 ? "var(--bad)" : s >= 2.5 ? "var(--amber)" : "var(--ink-dim)");

export function CrossCommunityTable({
  rows,
  communityCount,
  sortBy,
  active,
  onSelect,
  examples,
}: {
  rows: CrossCommunityRow[];
  communityCount: number;
  sortBy: "coverage" | "buildable";
  active?: string | null;
  onSelect?: (pp: string) => void;
  examples?: Record<string, PainPointExample[]>;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const sorted = [...rows].sort((a, b) => {
    if (sortBy === "coverage") return b.coverage - a.coverage || b.totalCount - a.totalCount;
    return b.buildableCount - a.buildableCount || b.totalCount - a.totalCount;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 100px 110px 110px 40px",
          gap: 12,
          padding: "0 14px 10px",
          fontFamily: "var(--mono)",
          fontSize: 10,
          color: "var(--ink-faint)",
          letterSpacing: "0.05em",
        }}
      >
        <span>PAIN POINT</span>
        <span>COVERAGE</span>
        <span>TOTAL FINDINGS</span>
        <span>BUILDABLE</span>
        <span />
      </div>
      {sorted.map((r) => {
        const isOpen = expanded === r.pain_point;
        const isActive = active === r.pain_point;
        return (
          <div
            key={r.pain_point}
            className="card click"
            onClick={() => {
              setExpanded(isOpen ? null : r.pain_point);
              onSelect?.(r.pain_point);
            }}
            style={{ padding: "14px 14px", borderRadius: 10, border: `1px solid ${isActive ? "var(--amber)" : "var(--border)"}`, background: isActive ? "rgba(201,168,76,0.06)" : undefined }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 110px 110px 40px", gap: 12, alignItems: "center" }}>
              <span style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                {r.label}
                {r.universal && (
                  <span
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 9,
                      letterSpacing: "0.05em",
                      color: "var(--hot)",
                      border: "1px solid var(--hot)",
                      borderRadius: 999,
                      padding: "2px 7px",
                    }}
                  >
                    UNIVERSAL
                  </span>
                )}
              </span>
              <span style={{ color: "var(--ink-dim)", fontSize: 13 }}>
                {r.coverage}/{communityCount} communities
              </span>
              <span style={{ color: "var(--ink)", fontSize: 13 }}>{r.totalCount}</span>
              <span style={{ color: "var(--amber)", fontSize: 13, fontWeight: 600 }}>{r.buildableCount}</span>
              <span style={{ color: "var(--ink-faint)", fontSize: 11, textAlign: "right" }}>{isOpen ? "\u2212" : "+"}</span>
            </div>
            {isOpen && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border-soft)" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: r.buildableCount > 0 ? 10 : 0 }}>
                  {r.communities.map((c) => (
                    <span
                      key={c.subreddit}
                      style={{
                        fontSize: 11.5,
                        fontFamily: "var(--mono)",
                        padding: "4px 10px",
                        borderRadius: 999,
                        border: `1px solid ${c.count > 0 ? "var(--border)" : "var(--border-soft)"}`,
                        color: c.count > 0 ? "var(--ink)" : "var(--ink-faint)",
                        background: c.count > 0 ? "var(--card-raised)" : "transparent",
                      }}
                    >
                      {c.label}: {c.count}
                    </span>
                  ))}
                </div>
                {r.buildableCount > 0 && (
                  <div style={{ fontSize: 12.5, color: SEVERITY_COLOR(r.avgSeverityBuildable), marginBottom: 10 }}>
                    Avg severity on the {r.buildableCount} buildable finding{r.buildableCount === 1 ? "" : "s"}: {r.avgSeverityBuildable.toFixed(1)}/5
                  </div>
                )}
                {examples?.[r.pain_point]?.length ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-faint)", letterSpacing: "0.05em" }}>
                      WHAT PEOPLE ACTUALLY SAID
                    </div>
                    {examples[r.pain_point].slice(0, 2).map((ex, i) => (
                      <div key={i} style={{ fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.55, paddingLeft: 10, borderLeft: "2px solid var(--border)" }}>
                        {ex.short}
                        {ex.evidence && <div style={{ marginTop: 3, color: "var(--ink-faint)", fontStyle: "italic" }}>"{ex.evidence.length > 140 ? ex.evidence.slice(0, 140) + "…" : ex.evidence}"</div>}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
