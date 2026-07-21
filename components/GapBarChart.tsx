"use client";
import { useState } from "react";
import { PainPointExample } from "@/lib/retention-research";
import { InfoTip } from "@/components/InfoTip";

export type GapAxis = {
  key: string;
  label: string;
  memberPct: number;
  ownerPct: number;
  memberCount: number;
  ownerCount: number;
};

const quoteBoxStyle = (side: "member" | "owner", isOpen: boolean): React.CSSProperties => ({
  fontSize: 12.5,
  color: "var(--ink-dim)",
  lineHeight: 1.55,
  padding: "8px 10px",
  borderRadius: 6,
  borderLeft: `2px solid ${side === "member" ? "var(--series-a)" : "var(--series-b)"}`,
  background: isOpen ? "var(--card)" : "transparent",
  cursor: "pointer",
});

// One quote list, capped and independently scrollable - used for both the
// member and owner half of a row's expanded evidence. Deepened past a
// couple of examples on purpose: a header claiming "(84)" next to a list
// that only ever renders 2-3 items regardless of the real count is worse
// than not showing a count at all.
function QuoteList({
  quotes,
  side,
  total,
  expandedQuote,
  onToggleQuote,
}: {
  quotes: PainPointExample[];
  side: "member" | "owner";
  total: number;
  expandedQuote: string | null;
  onToggleQuote: (key: string) => void;
}) {
  return (
    <div>
      <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: side === "member" ? "var(--series-a)" : "var(--series-b)", letterSpacing: "0.05em", marginBottom: 8 }}>
        {side === "member" ? "WHAT MEMBERS SAY" : "WHAT OWNERS SAY"} ({quotes.length < total ? `showing ${quotes.length} of ${total}` : total})
      </div>
      {quotes.length > 0 ? (
        <div className="scroll-panel" style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto", paddingRight: 4 }}>
          {quotes.map((ex, i) => {
            const qKey = `${side}::${i}`;
            const isOpen = expandedQuote === qKey;
            return (
              <div key={i} onClick={(e) => { e.stopPropagation(); onToggleQuote(qKey); }} style={quoteBoxStyle(side, isOpen)}>
                {isOpen ? ex.reasoning : ex.short}
                {ex.evidence && (
                  <div style={{ marginTop: 4, color: "var(--ink-faint)", fontStyle: "italic" }}>
                    "{isOpen || ex.evidence.length <= 140 ? ex.evidence : ex.evidence.slice(0, 140) + "…"}"
                  </div>
                )}
                <div style={{ marginTop: 4, fontSize: 10.5, fontFamily: "var(--mono)", color: "var(--ink-faint)" }}>{isOpen ? "tap to collapse" : "tap to read full"}</div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>No {side} findings in this category.</div>
      )}
    </div>
  );
}

// Replaces the radar chart. A radar is a chart-literacy test - twelve
// overlapping axes and two translucent blobs is not something a
// non-technical exec parses in the three seconds they'll spend on it.
// A diverging "tug of war" bar reads instantly: which side is longer wins,
// full stop. Sorted by gap size by default, exact percentages printed
// directly on the bar (never hidden behind a hover), one combined
// component instead of a chart plus a separate values table.
export function GapBarChart({
  axes,
  onSelect,
  active,
  memberLabel,
  ownerLabel,
  memberExamples,
  ownerExamples,
  painPointMeaning,
}: {
  axes: GapAxis[];
  onSelect?: (label: string) => void;
  active?: string | null;
  memberLabel: string;
  ownerLabel: string;
  // Evidence for the inline expansion, keyed by pain_point (same key as
  // axis.key). Optional - without it a row still expands, just without a
  // quote section, so this component doesn't hard-require data callers
  // might not have on hand.
  memberExamples?: Record<string, PainPointExample[]>;
  ownerExamples?: Record<string, PainPointExample[]>;
  painPointMeaning?: Record<string, string>;
}) {
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  // Expansion is local to this component and renders directly under the
  // clicked row - deliberately NOT wired to a shared panel elsewhere on
  // the page. A prior version jumped the whole page down to one evidence
  // block shared across every row, which meant "click a row" and "read its
  // evidence" were visually disconnected once the chart had more than a
  // couple of rows above the fold. This keeps evidence attached to the row
  // that produced it.
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [expandedQuote, setExpandedQuote] = useState<string | null>(null);

  if (axes.length === 0) {
    return (
      <div style={{ color: "var(--ink-faint)", fontSize: 13, textAlign: "center", padding: "60px 0" }}>
        Not enough shared pain-point categories yet to compare.
      </div>
    );
  }

  const sorted = [...axes].sort((a, b) => Math.abs(b.memberPct - b.ownerPct) - Math.abs(a.memberPct - a.ownerPct));
  const rawMax = Math.max(1, ...axes.flatMap((a) => [a.memberPct, a.ownerPct]));
  const axisMax = Math.ceil(rawMax / 2) * 2;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "center", gap: 28, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink-dim)" }}>
          <span style={{ width: 12, height: 12, borderRadius: 4, background: "var(--series-b)", display: "inline-block" }} />
          {ownerLabel}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink-dim)" }}>
          <span style={{ width: 12, height: 12, borderRadius: 4, background: "var(--series-a)", display: "inline-block" }} />
          {memberLabel}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {sorted.map((a, idx) => {
          const gap = a.memberPct - a.ownerPct;
          const memberLeans = gap > 0;
          const isActive = active === a.label;
          const isHover = hoverKey === a.key;
          const isExpanded = expandedKey === a.key;
          const ownerW = Math.max(2, (a.ownerPct / axisMax) * 100);
          const memberW = Math.max(2, (a.memberPct / axisMax) * 100);
          const leadColor = memberLeans ? "var(--series-a)" : "var(--series-b)";
          return (
            <div key={a.key}>
              <div
                onClick={() => {
                  setExpandedKey((k) => (k === a.key ? null : a.key));
                  setExpandedQuote(null);
                  onSelect?.(a.label);
                }}
                onMouseEnter={() => setHoverKey(a.key)}
                onMouseLeave={() => setHoverKey(null)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "180px 1fr 68px",
                  alignItems: "center",
                  gap: 14,
                  padding: "11px 12px",
                  borderRadius: isExpanded ? "10px 10px 0 0" : 10,
                  cursor: onSelect ? "pointer" : "default",
                  border: `1px solid ${isActive || isExpanded ? "var(--amber)" : "transparent"}`,
                  borderBottom: isExpanded ? "1px solid transparent" : undefined,
                  background: isActive || isExpanded ? "rgba(201,168,76,0.10)" : isHover ? "var(--card-raised)" : idx % 2 === 0 ? "rgba(255,255,255,0.012)" : "transparent",
                  boxShadow: isActive || isExpanded ? `0 0 0 1px var(--amber), 0 4px 16px -4px rgba(201,168,76,0.35)` : "none",
                  transition: "background 0.12s ease, box-shadow 0.12s ease",
                }}
              >
                <span style={{ fontSize: 12.5, color: isActive || isExpanded ? "var(--ink)" : "var(--ink-dim)", fontWeight: isActive || isExpanded ? 600 : 400, lineHeight: 1.25 }}>
                  {a.label}
                </span>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 2px 1fr", alignItems: "center", height: 24 }}>
                  {/* owner half - grows right-to-left toward the center line */}
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <div
                      style={{
                        width: `${ownerW}%`,
                        height: 16,
                        borderRadius: "9px 3px 3px 9px",
                        background: "linear-gradient(90deg, rgba(91,147,214,0.35), var(--series-b))",
                        boxShadow: !memberLeans && (isHover || isActive) ? "0 0 10px rgba(91,147,214,0.5)" : "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-start",
                        paddingLeft: 6,
                        minWidth: 28,
                        transition: "box-shadow 0.12s ease",
                      }}
                    >
                      <span style={{ fontSize: 10.5, fontFamily: "var(--mono)", color: "#0a0a0a", fontWeight: 700 }}>{a.ownerPct}%</span>
                    </div>
                  </div>
                  <div style={{ width: 2, height: 24, background: "var(--border)" }} />
                  {/* member half - grows left-to-right away from the center line */}
                  <div style={{ display: "flex", justifyContent: "flex-start" }}>
                    <div
                      style={{
                        width: `${memberW}%`,
                        height: 16,
                        borderRadius: "3px 9px 9px 3px",
                        background: "linear-gradient(90deg, var(--series-a), rgba(230,199,102,0.35))",
                        boxShadow: memberLeans && (isHover || isActive) ? "0 0 10px rgba(230,199,102,0.5)" : "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        paddingRight: 6,
                        minWidth: 28,
                        transition: "box-shadow 0.12s ease",
                      }}
                    >
                      <span style={{ fontSize: 10.5, fontFamily: "var(--mono)", color: "#0a0a0a", fontWeight: 700 }}>{a.memberPct}%</span>
                    </div>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: 11,
                    fontFamily: "var(--mono)",
                    textAlign: "right",
                    color: Math.abs(gap) >= 8 ? leadColor : "var(--ink-faint)",
                    fontWeight: Math.abs(gap) >= 8 ? 700 : 400,
                  }}
                >
                  {memberLeans ? "\u2192" : "\u2190"} {Math.abs(gap).toFixed(1)}
                </span>
              </div>

              {isExpanded && (
                <div
                  style={{
                    border: "1px solid var(--amber)",
                    borderTop: "none",
                    borderRadius: "0 0 10px 10px",
                    padding: "16px 14px",
                    background: "rgba(201,168,76,0.04)",
                  }}
                >
                  {painPointMeaning?.[a.key] && (
                    <div style={{ fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.55, marginBottom: 14 }}>{painPointMeaning[a.key]}</div>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <QuoteList
                      quotes={memberExamples?.[a.key] ?? []}
                      side="member"
                      total={a.memberCount}
                      expandedQuote={expandedQuote}
                      onToggleQuote={(k) => setExpandedQuote((cur) => (cur === k ? null : k))}
                    />
                    <QuoteList
                      quotes={ownerExamples?.[a.key] ?? []}
                      side="owner"
                      total={a.ownerCount}
                      expandedQuote={expandedQuote}
                      onToggleQuote={(k) => setExpandedQuote((cur) => (cur === k ? null : k))}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 16, fontSize: 11.5, color: "var(--ink-faint)", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <span>
          Blue bars (left) = share of what owners say. Gold bars (right) = share of what members say. The <strong style={{ color: "var(--ink-dim)" }}>black percentage text</strong> sits on the bar itself, dark for contrast against the colored fill. The number with an arrow on the right is the gap between the two sides, in percentage points - it's <strong style={{ color: "var(--amber)" }}>bold and colored</strong> (gold or blue, whichever side leads) when the gap is 8 points or more, and <strong style={{ color: "var(--ink-faint)" }}>dim gray</strong> for anything smaller - color there marks "worth noticing," not a different measurement. Sorted by gap size, biggest first. Click any row to expand its evidence right here.
        </span>
        <InfoTip text="Three colors, three different jobs: bar fill (blue/gold) says which side owns this row's story. Percentage text is always black regardless of side, purely for legibility against the colored fill. Gap-arrow color/weight is a threshold flag, not a new data series - it's the same gap number every row has, just visually promoted past 8 points so the reader's eye lands on the divergences that are actually large enough to act on." />
      </div>
    </div>
  );
}
