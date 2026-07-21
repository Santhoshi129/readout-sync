"use client";
import { useState } from "react";
import { CrossCommunityRow } from "@/lib/combined-analysis";
import { CommunityDataset, Finding, PainPointExample, painPointExamples, severityHistogram, sourceLink, timelineBreakdown } from "@/lib/retention-research";

const SEVERITY_COLOR = (s: number) => (s >= 3.5 ? "var(--bad)" : s >= 2.5 ? "var(--amber)" : "var(--ink-dim)");

export function CrossCommunityTable({
  rows,
  communityCount,
  sortBy,
  active,
  onSelect,
  onSelectCommunity,
  communities,
}: {
  rows: CrossCommunityRow[];
  communityCount: number;
  sortBy: "coverage" | "buildable";
  active?: string | null;
  onSelect?: (pp: string) => void;
  onSelectCommunity?: (subreddit: string, pp: string) => void;
  // Optional - when passed, clicking a community pill previews that
  // community's own quotes for this pain point right there inline,
  // instead of only navigating away to the receipts table. Also powers
  // the member/owner evidence split rendered inline per row.
  communities?: CommunityDataset[];
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [severityOpen, setSeverityOpen] = useState<string | null>(null); // pain_point whose severity breakdown is showing
  const [previewPill, setPreviewPill] = useState<string | null>(null); // "<pain_point>::<subreddit>"
  const [expandedQuote, setExpandedQuote] = useState<string | null>(null); // "<pain_point>::<side>::<index>"
  // Column headers double as sort controls - starts from whatever the
  // parent asked for, but stays interactive rather than fixed for the
  // life of the component.
  const [sortMode, setSortMode] = useState<"coverage" | "buildable" | "severity">(sortBy);

  const sorted = [...rows].sort((a, b) => {
    if (sortMode === "coverage") return b.coverage - a.coverage || b.totalCount - a.totalCount;
    if (sortMode === "severity") return b.avgSeverityBuildable - a.avgSeverityBuildable || b.buildableCount - a.buildableCount;
    return b.buildableCount - a.buildableCount || b.totalCount - a.totalCount;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 100px 160px 90px 40px",
          gap: 12,
          padding: "0 14px 4px",
          fontFamily: "var(--mono)",
          fontSize: 10,
          color: "var(--ink-faint)",
          letterSpacing: "0.05em",
        }}
      >
        <span>PAIN POINT</span>
        <span
          onClick={() => setSortMode("coverage")}
          style={{ cursor: "pointer", color: sortMode === "coverage" ? "var(--amber)" : "var(--ink-faint)", textDecoration: sortMode === "coverage" ? "underline" : "none" }}
        >
          COVERAGE {sortMode === "coverage" && "\u2193"}
        </span>
        <span
          onClick={() => setSortMode("buildable")}
          style={{ cursor: "pointer", color: sortMode === "buildable" ? "var(--amber)" : "var(--ink-faint)", textDecoration: sortMode === "buildable" ? "underline" : "none" }}
        >
          COMPOSITION {sortMode === "buildable" && "\u2193"}
        </span>
        <span
          onClick={() => setSortMode("severity")}
          style={{ cursor: "pointer", color: sortMode === "severity" ? "var(--amber)" : "var(--ink-faint)", textDecoration: sortMode === "severity" ? "underline" : "none" }}
        >
          SEVERITY {sortMode === "severity" && "\u2193"}
        </span>
        <span />
      </div>
      <div style={{ padding: "0 14px 10px", fontSize: 11, color: "var(--ink-faint)" }}>
        Composition bar: <span style={{ color: "var(--hot)" }}>core-fit</span> · <span style={{ color: "var(--amber)" }}>partial-fit</span> · <span style={{ color: "var(--ink-faint)" }}>not addressable</span>. Tap a row for the community split, tap a pill to preview.
      </div>
      <div className="scroll-panel" style={{ maxHeight: 640, overflowY: "auto", paddingRight: 4 }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 160px 90px 40px", gap: 12, alignItems: "center" }}>
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
              <div>
                <div style={{ display: "flex", height: 12, borderRadius: 4, overflow: "hidden", background: "var(--muted)" }}>
                  {r.coreFitCount > 0 && <div style={{ width: `${(r.coreFitCount / r.totalCount) * 100}%`, background: "var(--hot)" }} title={`${r.coreFitCount} core-fit`} />}
                  {r.partialFitCount > 0 && <div style={{ width: `${(r.partialFitCount / r.totalCount) * 100}%`, background: "var(--amber)" }} title={`${r.partialFitCount} partial-fit`} />}
                  {r.totalCount - r.buildableCount > 0 && (
                    <div style={{ width: `${((r.totalCount - r.buildableCount) / r.totalCount) * 100}%`, background: "var(--border)" }} title={`${r.totalCount - r.buildableCount} not addressable`} />
                  )}
                </div>
                <div style={{ marginTop: 3, fontSize: 10, fontFamily: "var(--mono)", color: "var(--ink-faint)" }}>{r.totalCount} total, {r.buildableCount} buildable</div>
              </div>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  if (r.buildableCount === 0) return;
                  setSeverityOpen((k) => (k === r.pain_point ? null : r.pain_point));
                }}
                title={r.buildableCount > 0 ? "Tap to see why it scores this" : undefined}
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 13,
                  color: SEVERITY_COLOR(r.avgSeverityBuildable),
                  cursor: r.buildableCount > 0 ? "pointer" : "default",
                  borderBottom: r.buildableCount > 0 ? `1px dashed ${severityOpen === r.pain_point ? SEVERITY_COLOR(r.avgSeverityBuildable) : "transparent"}` : "none",
                }}
              >
                {r.buildableCount > 0 ? `${r.avgSeverityBuildable.toFixed(1)}/5` : "\u2013"}
              </span>
              <span style={{ color: "var(--ink-faint)", fontSize: 11, textAlign: "right" }}>{isOpen ? "\u2212" : "+"}</span>
            </div>
            {severityOpen === r.pain_point && communities && (() => {
              const buildable = communities
                .flatMap((c) => c.findings)
                .filter((f) => f.pain_point === r.pain_point && (f.app_relevance === "core_fit" || f.app_relevance === "partial_fit"));
              const hist = severityHistogram(buildable);
              const maxH = Math.max(1, ...hist.map((h) => h.count));
              const topReasons = [...buildable]
                .filter((f) => f.pain_severity_reasoning)
                .sort((a, b) => (b.pain_severity ?? 0) - (a.pain_severity ?? 0))
                .slice(0, 3);
              return (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border-soft)" }}
                >
                  <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-faint)", letterSpacing: "0.05em", marginBottom: 10 }}>
                    WHY {r.avgSeverityBuildable.toFixed(1)}/5 &mdash; {buildable.length} BUILDABLE FINDING{buildable.length === 1 ? "" : "S"}, RATED INDIVIDUALLY
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 64, marginBottom: 6, maxWidth: 320 }}>
                    {hist.map((h) => (
                      <div key={h.severity} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        <div style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--ink-faint)" }}>{h.count > 0 ? h.count : ""}</div>
                        <div
                          title={`${h.count} finding${h.count === 1 ? "" : "s"} rated ${h.severity}/5`}
                          style={{
                            width: "100%",
                            height: Math.max(3, (h.count / maxH) * 42),
                            borderRadius: "3px 3px 1px 1px",
                            background: SEVERITY_COLOR(h.severity),
                            opacity: h.count === 0 ? 0.25 : 1,
                          }}
                        />
                        <div style={{ fontSize: 9.5, fontFamily: "var(--mono)", color: "var(--ink-faint)" }}>{h.severity}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--ink-faint)", marginBottom: 12, maxWidth: 420 }}>
                    Each finding gets its own 1-5 severity rating - 1 is a minor annoyance, 5 is named as an actual reason someone left or considered leaving. The {r.avgSeverityBuildable.toFixed(1)}/5 up top is just the average of this distribution, not a single judgment call.
                  </div>
                  {topReasons.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-faint)", letterSpacing: "0.05em" }}>HIGHEST-RATED EXAMPLES</div>
                      {topReasons.map((f, i) => (
                        <SeverityReasonQuote key={i} finding={f} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
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
                  // Enough examples that the panel's own scroll has real
                  // content to scroll through, instead of a count in the
                  // header that implies far more than the 4 rows actually
                  // shown - jumping to the receipts table for "the rest"
                  // was the workaround for that gap; showing enough right
                  // here removes the need for it.
                  const commExamples = painPointExamples(commFindings, 25)[r.pain_point] || [];
                  return (
                    <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 8, background: "var(--card-raised)", border: "1px solid var(--border-soft)" }}>
                      <div style={{ marginBottom: 6 }}>
                        <div style={{ fontFamily: "var(--mono)", fontSize: 9.5, color: "var(--amber)", letterSpacing: "0.05em" }}>
                          {community?.label.toUpperCase()} · {commFindings.length} FINDING{commFindings.length === 1 ? "" : "S"}
                          {commExamples.length < commFindings.length && ` · showing ${commExamples.length}`}
                        </div>
                      </div>
                      {commExamples.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {commExamples.map((ex, i) => {
                            const qKey = `${r.pain_point}::${subreddit}::${i}`;
                            const isQOpen = expandedQuote === qKey;
                            return (
                              <div
                                key={i}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedQuote((k) => (k === qKey ? null : qKey));
                                }}
                                style={{ fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.5, cursor: "pointer", padding: "4px 6px", margin: "-4px -6px", borderRadius: 4, background: isQOpen ? "var(--card)" : "transparent" }}
                              >
                                {isQOpen ? ex.reasoning : ex.short}
                                {ex.evidence && isQOpen && <div style={{ marginTop: 3, color: "var(--ink-faint)", fontStyle: "italic" }}>"{ex.evidence}"</div>}
                                <div style={{ marginTop: 3, fontSize: 10, fontFamily: "var(--mono)", color: "var(--ink-faint)" }}>
                                  {isQOpen ? "tap to collapse" : "tap to read full"}
                                  {isQOpen && (
                                    <>
                                      {" · "}
                                      <a
                                        href={ex.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        style={{ color: "var(--amber)", textDecoration: "underline" }}
                                      >
                                        view original thread &#8599;
                                      </a>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>No reasoning text captured for this pairing yet.</div>
                      )}
                    </div>
                  );
                })()}

                {communities && (() => {
                  const pooled = communities.flatMap((c) => c.findings).filter((f) => f.pain_point === r.pain_point);
                  const timeline = timelineBreakdown(pooled);
                  const maxT = Math.max(1, ...timeline.map(([, v]) => v));
                  const memberFindings = pooled.filter((f) => f.perspective === "member");
                  const ownerFindings = pooled.filter((f) => f.perspective === "owner");
                  const memberQuotes = painPointExamples(memberFindings, 25)[r.pain_point] || [];
                  const ownerQuotes = painPointExamples(ownerFindings, 25)[r.pain_point] || [];

                  const quoteBlock = (quotes: PainPointExample[], side: "member" | "owner", count: number) => (
                    <div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: side === "member" ? "var(--series-a)" : "var(--series-b)", letterSpacing: "0.05em", marginBottom: 8 }}>
                        {side === "member" ? "WHAT MEMBERS SAY" : "WHAT OWNERS SAY"} ({quotes.length < count ? `showing ${quotes.length} of ${count}` : count})
                      </div>
                      {quotes.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {quotes.map((ex, i) => {
                            const qKey = `${r.pain_point}::${side}::${i}`;
                            const isQOpen = expandedQuote === qKey;
                            return (
                              <div
                                key={i}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedQuote((k) => (k === qKey ? null : qKey));
                                }}
                                style={{
                                  fontSize: 12.5,
                                  color: "var(--ink-dim)",
                                  lineHeight: 1.55,
                                  padding: "8px 10px",
                                  borderRadius: 6,
                                  borderLeft: `2px solid ${side === "member" ? "var(--series-a)" : "var(--series-b)"}`,
                                  background: isQOpen ? "var(--card)" : "transparent",
                                  cursor: "pointer",
                                }}
                              >
                                {isQOpen ? ex.reasoning : ex.short}
                                {ex.evidence && (
                                  <div style={{ marginTop: 4, color: "var(--ink-faint)", fontStyle: "italic" }}>
                                    "{isQOpen || ex.evidence.length <= 140 ? ex.evidence : ex.evidence.slice(0, 140) + "…"}"
                                  </div>
                                )}
                                <div style={{ marginTop: 4, fontSize: 10.5, fontFamily: "var(--mono)", color: "var(--ink-faint)" }}>
                                  {isQOpen ? "tap to collapse" : "tap to read full"}
                                </div>
                                {isQOpen && (
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
                          })}
                        </div>
                      ) : (
                        <div style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>No {side} findings in this category.</div>
                      )}
                    </div>
                  );

                  return (
                    <>
                      {timeline.length > 1 && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-faint)", letterSpacing: "0.05em", marginBottom: 8 }}>OVER TIME</div>
                          <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 32 }}>
                            {timeline.map(([q, count]) => (
                              <div key={q} title={`${q}: ${count}`} style={{ flex: 1, display: "flex", alignItems: "flex-end", height: "100%" }}>
                                <div style={{ width: "100%", background: "var(--amber)", borderRadius: 1, height: `${Math.max(6, (count / maxT) * 100)}%` }} />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        {quoteBlock(memberQuotes, "member", memberFindings.length)}
                        {quoteBlock(ownerQuotes, "owner", ownerFindings.length)}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}

// One finding's severity rating with the classifier's own stated reason for
// it - this is the actual "why" behind the average score above, not a
// restatement of the number. Reuses the evidence-quote pattern already used
// elsewhere on this table (tap to read the full reasoning + jump to source).
function SeverityReasonQuote({ finding }: { finding: Finding }) {
  const [open, setOpen] = useState(false);
  const color = (finding.pain_severity ?? 0) >= 3.5 ? "var(--bad)" : (finding.pain_severity ?? 0) >= 2.5 ? "var(--amber)" : "var(--ink-dim)";
  const reasoning = finding.pain_severity_reasoning || "";
  const short = reasoning.length <= 110 ? reasoning : reasoning.slice(0, 110) + "…";
  return (
    <div
      onClick={() => setOpen((o) => !o)}
      style={{ fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.5, padding: "8px 10px", borderRadius: 6, borderLeft: `2px solid ${color}`, background: open ? "var(--card-raised)" : "transparent", cursor: "pointer" }}
    >
      <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color, fontWeight: 700, marginRight: 6 }}>
        {finding.pain_severity}/5
      </span>
      {open ? reasoning : short}
      {finding.evidence_snippet && (
        <div style={{ marginTop: 4, color: "var(--ink-faint)", fontStyle: "italic" }}>
          "{open || finding.evidence_snippet.length <= 140 ? finding.evidence_snippet : finding.evidence_snippet.slice(0, 140) + "…"}"
        </div>
      )}
      <div style={{ marginTop: 4, fontSize: 10, fontFamily: "var(--mono)", color: "var(--ink-faint)" }}>
        {open ? "tap to collapse" : "tap to read full reasoning"}
        {open && (
          <>
            {" · "}
            <a
              href={sourceLink(finding.permalink, finding.evidence_snippet)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{ color: "var(--amber)", textDecoration: "underline" }}
            >
              view original thread &#8599;
            </a>
          </>
        )}
      </div>
    </div>
  );
}
