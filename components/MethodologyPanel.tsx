"use client";
import { useState } from "react";
import { Finding } from "@/lib/retention-research";

// Plain-language comment for every field in a finding record, shown next
// to the raw JSON so the field names aren't a mystery to a non-technical
// reader.
const FIELD_NOTES: Record<string, string> = {
  id: "unique ID for this Reddit post or comment",
  author: "the Reddit username who posted it, public information",
  permalink: "link back to the original thread",
  readable_date: "when it was posted",
  period_quarter: "which quarter that falls in, drives the timeline chart",
  score: "Reddit upvote count",
  perspective: "who's talking: owner, member, vendor, coach, employee",
  pain_point: "which category this complaint was sorted into",
  pain_point_reasoning: "plain-language summary, this is the headline text shown on the dashboard",
  pain_severity: "how serious it was rated, 1 to 5",
  pain_severity_reasoning: "why it got that severity score",
  app_relevance: "can TWU's product address this: core_fit, partial_fit, or not_addressable",
  app_relevance_reasoning: "why it got that app-fit call - only present for communities where this was captured (orangetheory, crossfit)",
  solution: "what fix, if any, was mentioned in the post",
  solution_category: "which type of fix that falls into",
  effectiveness: "how well the fix reportedly worked, 1 to 5, only set when an outcome was mentioned",
  effectiveness_reasoning: "why it got that effectiveness score",
  difficulty: "how hard the fix would be to implement, 1 to 5",
  difficulty_reasoning: "why it got that difficulty score",
  evidence_snippet: "the actual quote used as supporting evidence",
  confidence_tier: "how confident this classification was: strong, moderate, or weak",
  source_trust: "flags vendor or self-reported claims when relevant",
};

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number") return String(v);
  return JSON.stringify(v);
}

export function MethodologyPanel({ findings }: { findings: Finding[] }) {
  const [open, setOpen] = useState(false);
  const [showJson, setShowJson] = useState(false);

  const sample = findings.find((f) => f.confidence_tier === "strong") ?? findings[0] ?? null;
  const entries = sample ? Object.entries(sample as unknown as Record<string, unknown>) : [];

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 24 }}>
      <button onClick={() => setOpen((o) => !o)} className="diagnostics-toggle" data-open={open} style={{ border: "none", borderRadius: 16 }}>
        <span>How this analysis is built</span>
        <span className="chev">&#9656;</span>
      </button>

      {open && (
        <div style={{ padding: "0 22px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 13.5, color: "var(--ink-dim)", lineHeight: 1.6 }}>
            I built the classification system behind every number here: the pain-point taxonomy, the severity rubric, and the TWU-specific fit categories (core fit, partial fit, not addressable) are my design, built around what TWU's product actually does, not a generic prompt run against generic text. It's an automated pipeline, an LLM applying my rubric to each post, which is what makes it possible to cover 6,700+ posts instead of a hand-picked sample.
          </div>

          {sample && entries.length > 0 && (
            <div>
              <button
                onClick={() => setShowJson((v) => !v)}
                style={{
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: 999,
                  color: "var(--amber)",
                  fontFamily: "var(--mono)",
                  fontSize: 10.5,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  padding: "7px 14px",
                  cursor: "pointer",
                }}
              >
                {showJson ? "Hide raw record" : "See the raw record behind one finding"}
              </button>

              {showJson && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 12, color: "var(--ink-dim)", marginBottom: 8 }}>
                    The actual output for one finding, exactly what every chart on this page reads from, with a plain-language note on what each field is.
                  </div>
                  <pre
                    style={{
                      background: "#0a0a0a",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      padding: 16,
                      fontSize: 11.5,
                      lineHeight: 1.8,
                      color: "var(--ink-dim)",
                      overflowX: "auto",
                      fontFamily: "var(--mono)",
                      whiteSpace: "pre",
                    }}
                  >
                    {"{\n"}
                    {entries.map(([k, v], i) => {
                      const note = FIELD_NOTES[k];
                      const line = `  "${k}": ${formatValue(v)}${i < entries.length - 1 ? "," : ""}`;
                      const pad = Math.max(2, 46 - line.length);
                      return (
                        <div key={k}>
                          <span style={{ color: "var(--ink)" }}>{line}</span>
                          {note && (
                            <span style={{ color: "var(--ink-faint)" }}>
                              {" ".repeat(pad)}// {note}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {"}"}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
