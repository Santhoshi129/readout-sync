"use client";
import { useState } from "react";

export type GapAxis = {
  key: string;
  label: string;
  memberPct: number;
  ownerPct: number;
};

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
}: {
  axes: GapAxis[];
  onSelect?: (label: string) => void;
  active?: string | null;
  memberLabel: string;
  ownerLabel: string;
}) {
  const [hoverKey, setHoverKey] = useState<string | null>(null);

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
          const ownerW = Math.max(2, (a.ownerPct / axisMax) * 100);
          const memberW = Math.max(2, (a.memberPct / axisMax) * 100);
          const leadColor = memberLeans ? "var(--series-a)" : "var(--series-b)";
          return (
            <div
              key={a.key}
              onClick={() => onSelect?.(a.label)}
              onMouseEnter={() => setHoverKey(a.key)}
              onMouseLeave={() => setHoverKey(null)}
              style={{
                display: "grid",
                gridTemplateColumns: "180px 1fr 68px",
                alignItems: "center",
                gap: 14,
                padding: "11px 12px",
                borderRadius: 10,
                cursor: onSelect ? "pointer" : "default",
                border: `1px solid ${isActive ? "var(--amber)" : "transparent"}`,
                background: isActive ? "rgba(201,168,76,0.10)" : isHover ? "var(--card-raised)" : idx % 2 === 0 ? "rgba(255,255,255,0.012)" : "transparent",
                boxShadow: isActive ? `0 0 0 1px var(--amber), 0 4px 16px -4px rgba(201,168,76,0.35)` : "none",
                transition: "background 0.12s ease, box-shadow 0.12s ease",
              }}
            >
              <span style={{ fontSize: 12.5, color: isActive ? "var(--ink)" : "var(--ink-dim)", fontWeight: isActive ? 600 : 400, lineHeight: 1.25 }}>
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
          );
        })}
      </div>
      <div style={{ marginTop: 16, fontSize: 11.5, color: "var(--ink-faint)", textAlign: "center" }}>
        Blue bars (left) = share of what owners say. Gold bars (right) = share of what members say. Sorted by the size of the gap between them, biggest first. Arrow on the right shows which side talks about it more. Click any row for the evidence behind it.
      </div>
    </div>
  );
}
