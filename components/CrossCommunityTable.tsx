"use client";
import { useState } from "react";
import { CrossCommunityRow } from "@/lib/combined-analysis";
import { CommunityDataset, PainPointExample, painPointExamples } from "@/lib/retention-research";

const SEVERITY_COLOR = (s: number) => (s >= 3.5 ? "var(--bad)" : s >= 2.5 ? "var(--amber)" : "var(--ink-dim)");

export function CrossCommunityTable({
  rows,
  communityCount,
  sortBy,
  active,
  onSelect,
  onSelectCommunity,
  examples,
  communities,
}: {
  rows: CrossCommunityRow[];
  communityCount: number;
  sortBy: "coverage" | "buildable";
  active?: string | null;
  onSelect?: (pp: string) => void;
  onSelectCommunity?: (subreddit: string, pp: string) => void;
  examples?: Record<string, PainPointExample[]>;
  // Optional - when passed, clicking a community pill previews that
  // community's own quotes for this pain point right there inline,
  // instead of only navigating away to the receipts table.
  communities?: CommunityDataset[];
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [previewPill, setPreviewPill] = useState<string | null>(null); // "<pain_point>::<subreddit>"

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
          padding: "0 14px 4px",
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
      <div style={{ padding: "0 14px 10px", fontSize: 11, color: "var(--ink-faint)" }}>
        Coverage = how many of the {communityCount} communities mention it at all. Buildable = findings tagged core-fit or partial-fit (TWU could plausibly act on them), pooled across every community - click a row to see the exact core/partial split and click a community pill to filter to just that community's findings for this pain point.
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
                <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-faint)", letterSpacing: "0.05em", marginBottom: 8 }}>
                  FROM WHERE - scroll, tap a community to preview it here
                </div>
                <div style={{ display: "flex", flexWrap: "nowrap", gap: 8, marginBottom: 8, overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 4 }}>
                  {r.communities.map((c) => {
                    const pillKey = `${r.pain_point}::${c.subreddit}`;
                    const isPreviewing = previewPill === pillKey;
                    return (
                      <span
                        key={c.subreddit}
                        title={c.count > 0 ? `${c.count} finding${c.count === 1 ? "" : "s"} from ${c.label} on ${r.label.toLowerCase()}. Tap to preview.` : `${c.label} has no findings in this category.`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (c.count === 0) return;
                          setPreviewPill((p) => (p === pillKey ? null : pillKey));
                        }}
                        style={{
                          flexShrink: 0,
                          fontSize: 11.5,
                          fontFamily: "var(--mono)",
                          padding: "4px 10px",
                          borderRadius: 999,
                          border: `1px solid ${isPreviewing ? "var(--amber)" : c.count > 0 ? "var(--border)" : "var(--border-soft)"}`,
                          color: c.count > 0 ? "var(--ink)" : "var(--ink-faint)",
                          background: isPreviewing ? "rgba(201,168,76,0.12)" : c.count > 0 ? "var(--card-raised)" : "transparent",
                          cursor: c.count > 0 ? "pointer" : "default",
                          transition: "background 0.1s ease, border-color 0.1s ease",
                        }}
                      >
                        {c.label}: {c.count}
                      </span>
                    );
                  })}
                </div>
                {previewPill?.startsWith(`${r.pain_point}::`) && communities && (() => {
                  const subreddit = previewPill.split("::")[1];
                  const community = communities.find((c) => c.subreddit === subreddit);
                  const commFindings = community ? community.findings.filter((f) => f.pain_point === r.pain_point) : [];
                  const commExamples = painPointExamples(commFindings, 2)[r.pain_point] || [];
                  const openInReceipts = () => community && onSelectCommunity?.(community.subreddit, r.pain_point);
                  return (
                    <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 8, background: "var(--card-raised)", border: "1px solid var(--border-soft)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <div style={{ fontFamily: "var(--mono)", fontSize: 9.5, color: "var(--amber)", letterSpacing: "0.05em" }}>
                          {community?.label.toUpperCase()} · {commFindings.length} FINDING{commFindings.length === 1 ? "" : "S"}
                        </div>
                        <span onClick={(e) => { e.stopPropagation(); openInReceipts(); }} style={{ fontSize: 10.5, fontFamily: "var(--mono)", color: "var(--ink-faint)", cursor: "pointer", textDecoration: "underline" }}>
                          see all in receipts &rarr;
                        </span>
                      </div>
                      {commExamples.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {commExamples.map((ex, i) => (
                            <div key={i} style={{ fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.5 }}>{ex.short}</div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>No reasoning text captured for this pairing yet.</div>
                      )}
                    </div>
                  );
                })()}
                <div style={{ display: "flex", gap: 16, marginBottom: 10, fontSize: 12.5 }}>
                  <span><span style={{ color: "var(--hot)", fontWeight: 700 }}>{r.coreFitCount}</span> <span style={{ color: "var(--ink-dim)" }}>core fit</span></span>
                  <span><span style={{ color: "var(--amber)", fontWeight: 700 }}>{r.partialFitCount}</span> <span style={{ color: "var(--ink-dim)" }}>partial fit</span></span>
                  <span><span style={{ color: "var(--ink-faint)", fontWeight: 700 }}>{r.totalCount - r.buildableCount}</span> <span style={{ color: "var(--ink-dim)" }}>not addressable</span></span>
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
