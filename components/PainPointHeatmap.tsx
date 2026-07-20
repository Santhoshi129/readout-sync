"use client";
import { Fragment, useState } from "react";
import { CrossCommunityRow } from "@/lib/combined-analysis";

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
  communities: { subreddit: string; label: string }[];
  onSelectCell?: (subreddit: string, painPoint: string) => void;
  activePainPoint?: string | null;
}) {
  const [hoverCell, setHoverCell] = useState<string | null>(null);

  return (
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
                // amber ramps from near-black (no signal) to full amber (row peak)
                const bg = c.count === 0 ? "var(--muted)" : `rgba(201,168,76,${0.08 + intensity * 0.75})`;
                return (
                  <div
                    key={cellKey}
                    onClick={() => c.count > 0 && onSelectCell?.(c.subreddit, r.pain_point)}
                    onMouseEnter={() => setHoverCell(cellKey)}
                    onMouseLeave={() => setHoverCell((k) => (k === cellKey ? null : k))}
                    title={`${c.label} × ${r.label}: ${c.count} finding${c.count === 1 ? "" : "s"}`}
                    style={{
                      height: 34,
                      borderRadius: 6,
                      background: bg,
                      border: isHover || isActiveRow ? "1px solid var(--amber)" : "1px solid transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: c.count > 0 ? "pointer" : "default",
                      transition: "border-color 0.1s ease",
                    }}
                  >
                    <span style={{ fontSize: 11.5, fontFamily: "var(--mono)", color: c.count === 0 ? "var(--ink-faint)" : intensity > 0.5 ? "#1a1400" : "var(--ink)", fontWeight: intensity > 0.6 ? 700 : 400 }}>
                      {c.count || "\u00b7"}
                    </span>
                  </div>
                );
              })}
            </Fragment>
          );
        })}
      </div>
      <div style={{ marginTop: 14, fontSize: 11.5, color: "var(--ink-faint)", lineHeight: 1.6 }}>
        Color is normalized per row, not globally - each pain point's own darkest cell is its own peak, so a smaller community's real signal on that specific issue is still visible next to a bigger one. Read each row as "who has this problem worst," not as a cross-row volume comparison (use the numbers for that). Click any lit cell to jump to that exact community + pain point.
      </div>
    </div>
  );
}
