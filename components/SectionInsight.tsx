"use client";
import { CSSProperties } from "react";
import { Finding, CONFIDENCE_TONE } from "@/lib/retention-research";

const TONE_COLOR: Record<string, string> = { hot: "var(--hot)", amber: "var(--amber)", muted: "var(--ink-faint)" };

export function SectionInsight({
  totalInView,
  matches,
  selectionLabel,
  generalText,
  onClear,
  onViewAll,
}: {
  totalInView: number;
  matches: Finding[] | null;
  selectionLabel: string | null;
  generalText: string;
  onClear: () => void;
  onViewAll: () => void;
}) {
  if (!matches || !selectionLabel) {
    return (
      <div
        style={{
          marginTop: 20,
          color: "var(--ink-dim)",
          fontSize: 13.5,
          lineHeight: 1.65,
          borderTop: "1px solid var(--border-soft)",
          paddingTop: 16,
        }}
      >
        <span style={{ color: "var(--ink-faint)", fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.06em", marginRight: 8 }}>
          READ:
        </span>
        {generalText}
      </div>
    );
  }

  const examples = [...matches]
    .sort((a, b) => (b.pain_severity ?? 0) - (a.pain_severity ?? 0))
    .slice(0, 2);
  const pct = totalInView > 0 ? Math.round((matches.length / totalInView) * 100) : 0;

  return (
    <div
      style={{
        marginTop: 20,
        border: "1px solid var(--border)",
        borderLeft: "3px solid var(--amber)",
        borderRadius: "4px 12px 12px 4px",
        background: "linear-gradient(180deg, rgba(201,168,76,0.06), transparent 60%), var(--card-raised)",
        padding: "18px 20px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ fontSize: 14, color: "var(--ink)" }}>
          <strong style={{ color: "var(--amber)" }}>{selectionLabel}</strong>
          {": "}
          {matches.length} of {totalInView} findings in this view ({pct}%)
        </div>
        <button onClick={onClear} style={linkBtn}>
          clear selection
        </button>
      </div>

      {examples.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {examples.map((f) => (
            <div key={f.id} style={{ fontSize: 13, lineHeight: 1.55 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 9.5,
                    letterSpacing: "0.05em",
                    color: TONE_COLOR[CONFIDENCE_TONE[f.confidence_tier]],
                    border: `1px solid ${TONE_COLOR[CONFIDENCE_TONE[f.confidence_tier]]}`,
                    borderRadius: 999,
                    padding: "1px 8px",
                  }}
                >
                  {f.confidence_tier}
                </span>
                {f.pain_severity != null && (
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9.5, color: "var(--ink-faint)" }}>
                    severity {f.pain_severity}/5
                  </span>
                )}
              </div>
              <div style={{ color: "var(--ink)" }}>{f.pain_point_reasoning}</div>
              {f.evidence_snippet && (
                <blockquote
                  style={{
                    borderLeft: "2px solid var(--border)",
                    paddingLeft: 10,
                    marginTop: 6,
                    color: "var(--ink-dim)",
                    fontStyle: "italic",
                  }}
                >
                  “{f.evidence_snippet}”
                </blockquote>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: "var(--ink-faint)", fontSize: 13 }}>No findings in this slice.</div>
      )}

      <button onClick={onViewAll} style={{ ...linkBtn, marginTop: 14 }}>
        view all {matches.length} in the findings table ↓
      </button>
    </div>
  );
}

const linkBtn: CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--amber)",
  fontFamily: "var(--mono)",
  fontSize: 10.5,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  cursor: "pointer",
  padding: 0,
};
