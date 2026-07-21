"use client";
import { Fragment, useState } from "react";
import { CrossCommunityRow } from "@/lib/combined-analysis";
import { CommunityDataset, painPointExamples } from "@/lib/retention-research";

// The one view that can only exist on the combined tab: every pain point
// against every community, at once. No individual community tab can show
// this - there's nothing to cross-reference against with only one
// community's data. Color intensity is normalized per row (per pain
// point), not globally, so a smaller community's real signal on a given
// issue doesn't just disappear next to a bigger one - each row answers
// "of the communities that have this problem, who has it worst," not
// "which community talks the most overall."
export function PainPointHeatmap({
  rows,
  communities,
  onSelectCell,
  activePainPoint,
}: {
  rows: CrossCommunityRow[];
  communities: CommunityDataset[];
  onSelectCell?: (subreddit: string, painPoint: string) => void;
  activePainPoint?: string | null;
}) {
  const [hoverCell, setHoverCell] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ pain_point: string; subreddit: string } | null>(null);

  // Cell color is intensity of raw count only - it says nothing about
  // whether that count is backed by strong-tier findings or almost
  // entirely weak-tier ones. A community with zero strong-tier findings
  // (hyrox, at least as of this classification pass) can still show a
  // mid-intensity cell purely on volume, which reads as "meaningful
  // signal" when the Data coverage table below already flags that
  // community's numbers as directional, not settled. Flagging it here too,
  // right where the count is shown, means a reader doesn't have to
  // cross-reference a different section to catch the caveat.
  const noStrongTierCommunities = new Set(
    communities.filter((c) => c.findings.length > 0 && !c.findings.some((f) => f.confidence_tier === "strong")).map((c) => c.subreddit)
  );

  const hoverInfo = (() => {
    if (!hoverCell) return null;
    const [pp, subreddit] = hoverCell.split("::");
    const row = rows.find((r) => r.pain_point === pp);
    const cell = row?.communities.find((c) => c.subreddit === subreddit);
    if (!row || !cell) return null;
    return { label: row.label, community: cell.label, count: cell.count, subreddit };
  })();

  return (
    <div>
      <div style={{ overflowX: "auto" }} className="scroll-panel">
        <div style={{ display: "grid", gridTemplateColumns: `220px repeat(${communities.length}, 1fr)`, gap: 3, minWidth: 620 }}>
          <div />
          {communities.map((c) => (
            <div key={c.subreddit} style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-faint)", textAlign: "center", paddingBottom: 8, letterSpacing: "0.03em" }}>
              {c.label}
            </div>
          ))}

          {rows.map((r) => {
            const rowMax = Math.max(1, ...r.communities.map((c) => c.count));
            const isActiveRow = activePainPoint === r.pain_point;
            return (
              <Fragment key={r.pain_point}>
                <div
                  style={{
                    fontSize: 12.5,
                    color: isActiveRow ? "var(--ink)" : "var(--ink-dim)",
                    fontWeight: isActiveRow ? 700 : 400,
                    display: "flex",
                    alignItems: "center",
                    paddingRight: 8,
                  }}
                >
                  {r.label}
                </div>
                {r.communities.map((c) => {
                  const intensity = c.count / rowMax; // 0-1, relative to this row's own peak
                  const cellKey = `${r.pain_point}::${c.subreddit}`;
                  const isHover = hoverCell === cellKey;
                  const isSelected = selectedCell && selectedCell.pain_point === r.pain_point && selectedCell.subreddit === c.subreddit;
                  const isUnreliable = c.count > 0 && noStrongTierCommunities.has(c.subreddit);
                  const bg = c.count === 0 ? "var(--muted)" : `rgba(201,168,76,${0.08 + intensity * 0.75})`;
                  return (
                    <div
                      key={cellKey}
                      onClick={() => {
                        if (c.count === 0) return;
                        setSelectedCell({ pain_point: r.pain_point, subreddit: c.subreddit });
                        onSelectCell?.(c.subreddit, r.pain_point);
                      }}
                      onMouseEnter={() => setHoverCell(cellKey)}
                      onMouseLeave={() => setHoverCell((k) => (k === cellKey ? null : k))}
                      style={{
                        height: 34,
                        borderRadius: 6,
                        background: bg,
                        border: isSelected ? "2px solid var(--amber)" : isHover ? "1px solid var(--amber)" : isUnreliable ? "1px dashed var(--ink-faint)" : "1px solid transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: c.count > 0 ? "pointer" : "default",
                        transition: "border-color 0.1s ease",
                      }}
                    >
                      <span style={{ fontSize: 11.5, fontFamily: "var(--mono)", color: c.count === 0 ? "var(--ink-faint)" : intensity > 0.5 ? "#1a1400" : "var(--ink)", fontWeight: intensity > 0.6 ? 700 : 400 }}>
                        {c.count || "\u00b7"}{isUnreliable ? "\u00b9" : ""}
                      </span>
                    </div>
                  );
                })}
              </Fragment>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 10, minHeight: 20, fontSize: 12.5, color: "var(--amber)", fontFamily: "var(--mono)" }}>
        {hoverInfo ? `${hoverInfo.community} × ${hoverInfo.label}: ${hoverInfo.count} finding${hoverInfo.count === 1 ? "" : "s"}${noStrongTierCommunities.has(hoverInfo.subreddit) ? " · this community has no strong-tier findings, read as directional" : ""}` : "\u00a0"}
      </div>

      {selectedCell && (() => {
        const community = communities.find((c) => c.subreddit === selectedCell.subreddit);
        const row = rows.find((r) => r.pain_point === selectedCell.pain_point);
        const cellFindings = community ? community.findings.filter((f) => f.pain_point === selectedCell.pain_point) : [];
        const quotes = painPointExamples(cellFindings, 20)[selectedCell.pain_point] || [];
        return (
          <div style={{ marginTop: 16, padding: 18, borderRadius: 12, background: "var(--card)", border: "1px solid var(--amber)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
              <div className="eyebrow" style={{ color: "var(--amber)" }}>
                {community?.label} × {row?.label} · {cellFindings.length} finding{cellFindings.length === 1 ? "" : "s"}
                {quotes.length < cellFindings.length && ` · showing ${quotes.length}`}
              </div>
              <button
                onClick={() => setSelectedCell(null)}
                style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 999, color: "var(--ink-dim)", fontFamily: "var(--mono)", fontSize: 10.5, padding: "4px 10px", cursor: "pointer" }}
              >
                CLOSE
              </button>
            </div>
            {quotes.length > 0 ? (
              <div className="scroll-panel" style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 360, overflowY: "auto", paddingRight: 4 }}>
                {quotes.map((ex, i) => (
                  <QuoteRow key={i} ex={ex} />
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>No reasoning text captured for this pairing yet.</div>
            )}
          </div>
        );
      })()}

      <div style={{ marginTop: 14, fontSize: 11.5, color: "var(--ink-faint)", lineHeight: 1.6 }}>
        Color is normalized per row, not globally - each pain point's own darkest cell is its own peak, so a smaller community's real signal on that specific issue is still visible next to a bigger one. A low count from a low-volume community will correctly look dim here, that's the row's own scale, not a bug. Cells marked with a dashed border and ¹ are from a community with zero strong-tier findings overall (currently r/hyrox) - the color reflects raw volume only, not confidence, so treat those specific numbers as directional. Hover a cell for the exact reading, click a lit cell for the evidence right here below.
      </div>
    </div>
  );
}

function QuoteRow({ ex }: { ex: { reasoning: string; short: string; evidence: string | null } }) {
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
    </div>
  );
}
