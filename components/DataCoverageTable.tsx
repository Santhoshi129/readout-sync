"use client";
import { useState } from "react";
import { CommunityDataset, painPointBreakdown, painPointExamples, painPointLabel, perspectiveBreakdown, perspectiveLabel, timelineBreakdown, authorDiversity } from "@/lib/retention-research";

export function DataCoverageTable({ communities }: { communities: CommunityDataset[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const graded = communities.map((c) => ({ c })).sort((a, b) => b.c.relevant_count - a.c.relevant_count);

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 14,
        }}
      >
        {graded.map(({ c }) => {
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
          const topPain = painPointBreakdown(c.findings).filter(([p]) => p !== "other")[0];
          const diversity = authorDiversity(c.findings);

          const topPains = painPointBreakdown(c.findings).filter(([p]) => p !== "other").slice(0, 5);
          const maxPain = Math.max(1, ...topPains.map(([, v]) => v.total));
          const detailTimeline = timelineBreakdown(c.findings);
          const maxT = Math.max(1, ...detailTimeline.map(([, v]) => v));
          const voices = perspectiveBreakdown(c.findings).slice(0, 4);
          const maxVoice = Math.max(1, ...voices.map(([, v]) => v));
          const avgSeverity = (() => {
            const scored = c.findings.filter((f) => f.pain_severity != null);
            if (scored.length === 0) return null;
            return scored.reduce((s, f) => s + (f.pain_severity ?? 0), 0) / scored.length;
          })();
          const topQuotes = topPains.length > 0 ? painPointExamples(c.findings.filter((f) => f.pain_point === topPains[0][0]), 3)[topPains[0][0]] || [] : [];

          return (
            <div key={c.subreddit} style={{ display: "contents" }}>
            <div
              className="card"
              onClick={() => setExpanded(isOpen ? null : c.subreddit)}
              style={{
                padding: 18,
                borderRadius: 14,
                border: `1px solid ${isOpen ? "var(--amber)" : noStrong ? "var(--warm)" : "var(--border)"}`,
                background: "linear-gradient(160deg, var(--card) 0%, var(--card-raised) 100%)",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{c.label}</span>
                <span style={{ fontSize: 13, color: isOpen ? "var(--amber)" : "var(--ink-faint)" }}>{isOpen ? "\u2212" : "+"}</span>
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
                Hit rate {hitRate < 0.01 ? "<0.01" : hitRate.toFixed(2)}%
                {topPain && <> · top issue <span style={{ color: "var(--ink-dim)" }}>{painPointLabel(topPain[0])}</span></>}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--ink-faint)" }} title="Distinct Reddit accounts behind these findings, versus total findings. Lower means a smaller group of repeat posters is doing more of the talking.">
                {diversity.uniqueAuthors} distinct voice{diversity.uniqueAuthors === 1 ? "" : "s"} behind {diversity.total} finding{diversity.total === 1 ? "" : "s"} ({diversity.pct}% unique)
              </div>

              {noStrong && (
                <div style={{ fontSize: 11.5, color: "var(--warm)", paddingTop: 8, borderTop: "1px solid var(--border-soft)" }}>
                  No strong-tier findings here ({strongPct.toFixed(0)}% strong). Directional, not settled.
                </div>
              )}
            </div>

            {isOpen && (
              <div className="scroll-panel" style={{ gridColumn: "1 / -1", padding: 22, borderRadius: 14, background: "var(--card)", border: "1px solid var(--amber)", maxHeight: 560, overflowY: "auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 }}>
                  <div className="eyebrow" style={{ color: "var(--amber)" }}>{c.label} in detail{avgSeverity != null ? ` · avg severity ${avgSeverity.toFixed(1)}/5` : ""}</div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setExpanded(null); }}
                    style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 999, color: "var(--ink-dim)", fontFamily: "var(--mono)", fontSize: 10.5, padding: "4px 10px", cursor: "pointer" }}
                  >
                    CLOSE
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 24 }}>
                  <div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-faint)", letterSpacing: "0.05em", marginBottom: 10 }}>TOP PAIN POINTS HERE</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {topPains.map(([p, v]) => (
                        <div key={p} style={{ display: "grid", gridTemplateColumns: "160px 1fr 32px", gap: 8, alignItems: "center" }}>
                          <span style={{ fontSize: 12.5, color: "var(--ink-dim)" }}>{painPointLabel(p)}</span>
                          <div style={{ height: 9, borderRadius: 4, background: "var(--muted)", overflow: "hidden" }}>
                            <div style={{ width: `${(v.total / maxPain) * 100}%`, height: "100%", background: "var(--amber)" }} />
                          </div>
                          <span style={{ fontSize: 12.5, color: "var(--ink)", textAlign: "right" }}>{v.total}</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-faint)", letterSpacing: "0.05em", margin: "20px 0 10px" }}>WHO'S TALKING</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {voices.map(([p, count]) => (
                        <div key={p} style={{ display: "grid", gridTemplateColumns: "160px 1fr 32px", gap: 8, alignItems: "center" }}>
                          <span style={{ fontSize: 12.5, color: "var(--ink-dim)" }}>{perspectiveLabel(p)}</span>
                          <div style={{ height: 9, borderRadius: 4, background: "var(--muted)", overflow: "hidden" }}>
                            <div style={{ width: `${(count / maxVoice) * 100}%`, height: "100%", background: "var(--series-b)" }} />
                          </div>
                          <span style={{ fontSize: 12.5, color: "var(--ink)", textAlign: "right" }}>{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-faint)", letterSpacing: "0.05em", marginBottom: 10 }}>WHEN THESE WERE POSTED</div>
                    <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 60 }}>
                      {detailTimeline.map(([q, count]) => (
                        <div key={q} title={`${q}: ${count}`} style={{ flex: 1, display: "flex", alignItems: "flex-end", height: "100%" }}>
                          <div style={{ width: "100%", background: "var(--series-a)", borderRadius: 1, height: `${Math.max(4, (count / maxT) * 100)}%` }} />
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 10.5, color: "var(--ink-faint)", marginTop: 6 }}>
                      {detailTimeline.length > 0 ? `${detailTimeline[0][0]} through ${detailTimeline[detailTimeline.length - 1][0]}` : "No dated findings"}
                    </div>
                  </div>
                </div>
                {topQuotes.length > 0 && (
                  <div style={{ marginTop: 20, paddingTop: 18, borderTop: "1px solid var(--border-soft)" }}>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--amber)", letterSpacing: "0.05em", marginBottom: 10 }}>
                      WHAT PEOPLE SAY ABOUT {painPointLabel(topPains[0][0]).toUpperCase()} HERE
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {topQuotes.map((ex, i) => (
                        <Quote key={i} ex={ex} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 14, fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.6 }}>
        The confidence bar is the axis that tells you how much to trust a community's numbers. "Distinct voices" is a second axis: how many different accounts the findings actually came from, so a community's numbers don't get mistaken for a few repeat posters padding the count. Tap any card for its top pain points, who's actually talking, its posting timeline, and real quotes.
      </div>
    </div>
  );
}

function Quote({ ex }: { ex: { reasoning: string; short: string; evidence: string | null; link: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      onClick={() => setOpen((o) => !o)}
      style={{ fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.55, padding: "8px 10px", borderRadius: 6, borderLeft: "2px solid var(--amber)", background: open ? "var(--card-raised)" : "transparent", cursor: "pointer" }}
    >
      {open ? ex.reasoning : ex.short}
      {ex.evidence && (
        <div style={{ marginTop: 4, color: "var(--ink-faint)", fontStyle: "italic" }}>
          "{open || ex.evidence.length <= 140 ? ex.evidence : ex.evidence.slice(0, 140) + "…"}"
        </div>
      )}
      <div style={{ marginTop: 4, fontSize: 10.5, fontFamily: "var(--mono)", color: "var(--ink-faint)" }}>{open ? "tap to collapse" : "tap to read full"}</div>
      {open && (
        <a
          href={ex.link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{ marginTop: 4, display: "inline-block", fontSize: 10.5, fontFamily: "var(--mono)", color: "var(--amber)", textDecoration: "underline" }}
        >
          view original thread &#8599;
        </a>
      )}
    </div>
  );
}
