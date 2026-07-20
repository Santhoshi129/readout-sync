"use client";
import { useState } from "react";
import { CommunityDataset, painPointBreakdown, painPointLabel, timelineBreakdown } from "@/lib/retention-research";

export function DataCoverageTable({ communities }: { communities: CommunityDataset[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 14,
        }}
      >
        {communities.map((c) => {
          const hitRate = c.total_analyzed > 0 ? (c.relevant_count / c.total_analyzed) * 100 : 0;
          const strong = c.findings.filter((f) => f.confidence_tier === "strong").length;
          const moderate = c.findings.filter((f) => f.confidence_tier === "moderate").length;
          const weak = c.findings.filter((f) => f.confidence_tier === "weak").length;
          const n = c.findings.length || 1;
          const strongPct = (strong / n) * 100;
          const modPct = (moderate / n) * 100;
          const weakPct = (weak / n) * 100;
          const noStrong = c.findings.length > 0 && strong === 0;
          const isOpen = expanded === c.subreddit;

          const topPains = painPointBreakdown(c.findings).filter(([p]) => p !== "other").slice(0, 3);
          const maxPain = Math.max(1, ...topPains.map(([, v]) => v.total));
          const timeline = timelineBreakdown(c.findings);
          const maxT = Math.max(1, ...timeline.map(([, v]) => v));
          const avgSeverity = (() => {
            const scored = c.findings.filter((f) => f.pain_severity != null);
            if (scored.length === 0) return null;
            return scored.reduce((s, f) => s + (f.pain_severity ?? 0), 0) / scored.length;
          })();

          return (
            <div
              key={c.subreddit}
              className="card"
              onClick={() => setExpanded(isOpen ? null : c.subreddit)}
              style={{
                padding: 18,
                borderRadius: 14,
                border: `1px solid ${noStrong ? "var(--warm)" : isOpen ? "var(--amber)" : "var(--border)"}`,
                background: "linear-gradient(160deg, var(--card) 0%, var(--card-raised) 100%)",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                cursor: "pointer",
                gridColumn: isOpen ? "1 / -1" : undefined,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{c.label}</span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 9,
                      letterSpacing: "0.05em",
                      padding: "3px 8px",
                      borderRadius: 999,
                      color: c.data_note ? "var(--warm)" : "var(--hot)",
                      border: `1px solid ${c.data_note ? "var(--warm)" : "var(--hot)"}`,
                    }}
                  >
                    {c.data_note ? "FUNNELED" : "EXHAUSTIVE"}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>{isOpen ? "\u2212" : "+"}</span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 32, fontWeight: 800, fontFamily: "var(--font-head)", color: "var(--ink)" }}>{c.relevant_count}</span>
                <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>relevant of {c.total_analyzed.toLocaleString()} analyzed</span>
              </div>

              <div>
                <div style={{ display: "flex", height: 10, borderRadius: 999, overflow: "hidden", background: "var(--muted)" }}>
                  {strong > 0 && <div style={{ width: `${strongPct}%`, background: "var(--hot)" }} title={`${strong} strong`} />}
                  {moderate > 0 && <div style={{ width: `${modPct}%`, background: "var(--amber)" }} title={`${moderate} moderate`} />}
                  {weak > 0 && <div style={{ width: `${weakPct}%`, background: "var(--ink-faint)" }} title={`${weak} weak`} />}
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 11, fontFamily: "var(--mono)" }}>
                  <span style={{ color: "var(--hot)" }}>&#9679; {strong} strong</span>
                  <span style={{ color: "var(--amber)" }}>&#9679; {moderate} mod</span>
                  <span style={{ color: "var(--ink-faint)" }}>&#9679; {weak} weak</span>
                </div>
              </div>

              <div style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>
                Hit rate {hitRate < 0.01 ? "<0.01" : hitRate.toFixed(2)}% of everything analyzed
                {avgSeverity != null && ` · avg severity ${avgSeverity.toFixed(1)}/5`}
              </div>

              {topPains.length > 0 && !isOpen && (
                <div style={{ fontSize: 11.5, color: "var(--ink-dim)", paddingTop: 8, borderTop: "1px solid var(--border-soft)" }}>
                  Top issue: <span style={{ color: "var(--ink)", fontWeight: 600 }}>{painPointLabel(topPains[0][0])}</span> ({topPains[0][1].total} findings). Tap to see the full breakdown.
                </div>
              )}

              {noStrong && (
                <div style={{ fontSize: 11.5, color: "var(--warm)", paddingTop: isOpen ? 0 : 8, borderTop: isOpen ? "none" : "1px solid var(--border-soft)" }}>
                  No strong-tier findings here ({strongPct.toFixed(0)}% strong). Read this community as directional, not as settled as the others.
                </div>
              )}
              {c.data_note && (
                <div style={{ fontSize: 11, color: "var(--ink-faint)", paddingTop: noStrong ? 0 : 8, borderTop: noStrong ? "none" : "1px solid var(--border-soft)" }}>
                  {c.data_note}
                </div>
              )}

              {isOpen && (
                <div style={{ marginTop: 4, paddingTop: 14, borderTop: "1px solid var(--border)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-faint)", letterSpacing: "0.05em", marginBottom: 10 }}>TOP PAIN POINTS HERE</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {topPains.map(([p, v]) => (
                        <div key={p} style={{ display: "grid", gridTemplateColumns: "140px 1fr 30px", gap: 8, alignItems: "center" }}>
                          <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>{painPointLabel(p)}</span>
                          <div style={{ height: 8, borderRadius: 4, background: "var(--muted)", overflow: "hidden" }}>
                            <div style={{ width: `${(v.total / maxPain) * 100}%`, height: "100%", background: "var(--amber)" }} />
                          </div>
                          <span style={{ fontSize: 12, color: "var(--ink)", textAlign: "right" }}>{v.total}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-faint)", letterSpacing: "0.05em", marginBottom: 10 }}>WHEN THESE WERE POSTED</div>
                    <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 40 }}>
                      {timeline.map(([q, count]) => (
                        <div key={q} title={`${q}: ${count}`} style={{ flex: 1, display: "flex", alignItems: "flex-end", height: "100%" }}>
                          <div style={{ width: "100%", background: "var(--series-b)", borderRadius: 1, height: `${Math.max(4, (count / maxT) * 100)}%` }} />
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 10.5, color: "var(--ink-faint)", marginTop: 6 }}>
                      {timeline.length > 0 ? `${timeline[0][0]} through ${timeline[timeline.length - 1][0]}` : "No dated findings"}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 14, fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.6 }}>
        Relevant count and hit rate aren't a quality signal on their own - orangetheory analyzed 1.8M posts/comments for 690 relevant findings, gymowner analyzed 6,688 for 276. The confidence bar is the separate axis that actually tells you how much to trust a community's numbers: a high hit rate can still sit on a low-confidence pull, which is exactly what's happening on the community flagged above. Tap any card for its own top pain points and posting timeline.
      </div>
    </div>
  );
}
