"use client";
import { CSSProperties } from "react";
import { Finding, CONFIDENCE_TONE, APP_RELEVANCE_LABEL, APP_RELEVANCE_TONE, sourceLink, sourceStatusLabel } from "@/lib/retention-research";
import { NumberTip } from "@/components/NumberTip";

const TONE_COLOR: Record<string, string> = { hot: "var(--hot)", amber: "var(--amber)", muted: "var(--ink-faint)" };

export function SectionInsight({
  totalInView,
  matches,
  selectionLabel,
  generalText,
  onClear,
  showReasoning = false,
}: {
  totalInView: number;
  matches: Finding[] | null;
  selectionLabel: string | null;
  generalText: string;
  onClear: () => void;
  // Only the Can TWU Fix It panel gets the full 'Why this severity /
  // difficulty / app fit' breakdown - everywhere else (pain point
  // frequency, severity, who's talking, solutions, priority ranking)
  // stays a bare quote + link, per explicit direction not to duplicate
  // that depth across every chart.
  showReasoning?: boolean;
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
          MY READ:
        </span>
        {generalText}
      </div>
    );
  }

  const examples = [...matches].sort(
    (a, b) => (b.pain_severity ?? 0) - (a.pain_severity ?? 0)
  );
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
        <div style={{ fontSize: 14, color: "var(--ink)" }}>
          <strong style={{ color: "var(--amber)" }}>{selectionLabel}</strong>
          {": "}
          {matches.length} of {totalInView} findings in this view ({pct}%)
        </div>
        <button onClick={onClear} style={linkBtn}>
          clear selection
        </button>
      </div>
      <div style={{ fontSize: 10.5, fontFamily: "var(--mono)", color: "var(--ink-faint)", marginBottom: 12 }}>
        scroll for every matching finding
      </div>

      {examples.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            maxHeight: 340,
            overflowY: "auto",
            paddingRight: 8,
          }}
        >
          {examples.map((f) => (
            <div key={f.id} style={{ fontSize: 13, lineHeight: 1.55, paddingBottom: 12, borderBottom: "1px solid var(--border-soft)" }}>
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
                {f.app_relevance && (
                  f.app_relevance_reasoning ? (
                    <NumberTip text={f.app_relevance_reasoning} align="left">
                      <span
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: 9.5,
                          color: TONE_COLOR[APP_RELEVANCE_TONE[f.app_relevance] as keyof typeof TONE_COLOR] || "var(--ink-faint)",
                          borderBottom: "1px dotted currentColor",
                        }}
                      >
                        {APP_RELEVANCE_LABEL[f.app_relevance].split(": ")[0]}
                      </span>
                    </NumberTip>
                  ) : (
                    <span
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: 9.5,
                        color: TONE_COLOR[APP_RELEVANCE_TONE[f.app_relevance] as keyof typeof TONE_COLOR] || "var(--ink-faint)",
                      }}
                    >
                      {APP_RELEVANCE_LABEL[f.app_relevance].split(": ")[0]}
                    </span>
                  )
                )}
                {f.pain_severity != null && (
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9.5, color: "var(--ink-faint)" }}>
                    severity {f.pain_severity}/5
                  </span>
                )}
                {f.readable_date && (
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9.5, color: "var(--ink-faint)" }}>{f.readable_date}</span>
                )}
                {f.permalink && (
                  <a
                    href={sourceLink(f.permalink)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{ fontFamily: "var(--mono)", fontSize: 9.5, color: "var(--amber)", marginLeft: "auto", whiteSpace: "nowrap" }}
                  >
                    view reddit thread ↗
                  </a>
                )}
                {sourceStatusLabel(f) && (
                  <span
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 9,
                      letterSpacing: "0.05em",
                      color: "var(--warm)",
                      border: "1px solid var(--warm)",
                      borderRadius: 999,
                      padding: "2px 8px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    ⚠ {sourceStatusLabel(f)}
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
              {showReasoning && (f.pain_severity_reasoning || f.difficulty_reasoning || f.app_relevance_reasoning) && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6, fontSize: 11.5, color: "var(--ink-dim)" }}>
                  {f.pain_severity_reasoning && (
                    <div><span style={{ color: "var(--ink-faint)" }}>Why this severity: </span>{f.pain_severity_reasoning}</div>
                  )}
                  {f.difficulty_reasoning && (
                    <div><span style={{ color: "var(--ink-faint)" }}>Why this difficulty: </span>{f.difficulty_reasoning}</div>
                  )}
                  {f.app_relevance_reasoning && (
                    <div><span style={{ color: "var(--ink-faint)" }}>Why this app fit: </span>{f.app_relevance_reasoning}</div>
                  )}
                </div>
              )}
              {(f.solution || f.effectiveness_reasoning) && (
                <div style={{ marginTop: 6, fontSize: 12, color: "var(--ink-faint)" }}>
                  {f.solution ? `Solution tried: ${f.solution}. ` : ""}
                  {f.effectiveness_reasoning ? `Outcome: ${f.effectiveness_reasoning}` : ""}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: "var(--ink-faint)", fontSize: 13 }}>No findings in this slice.</div>
      )}
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
