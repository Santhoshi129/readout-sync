"use client";
import { useState } from "react";
import { Finding } from "@/lib/retention-research";

export function MethodologyPanel({ findings }: { findings: Finding[] }) {
  const [open, setOpen] = useState(false);
  const [showJson, setShowJson] = useState(false);

  const sample = findings.find((f) => f.confidence_tier === "strong") ?? findings[0] ?? null;

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 24 }}>
      <button onClick={() => setOpen((o) => !o)} className="diagnostics-toggle" data-open={open} style={{ border: "none", borderRadius: 16 }}>
        <span>How this analysis is built</span>
        <span className="chev">&#9656;</span>
      </button>

      {open && (
        <div style={{ padding: "0 22px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 13.5, color: "var(--ink-dim)", lineHeight: 1.6 }}>
            I built the classification system behind every number here: the pain-point taxonomy, the severity rubric, and the TWU-specific fit categories (core fit, partial fit, not addressable) are my design, built around what TWU's product actually does, not a generic prompt run against generic text. It runs as one automated pass per post right now, that's what makes it possible to cover 6,700+ posts instead of a hand-picked sample. What it hasn't had yet is a manual audit pass, spot-checking the classifier's calls against my own re-read of the same posts, that's next before I'd treat any single number here as final. Confidence tier reflects how sure the classifier was applying my rubric, not independent verification, worth keeping those two things separate.
          </div>

          {sample && (
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
                {showJson ? "Hide raw JSON" : "See the raw JSON behind one finding"}
              </button>

              {showJson && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 12, color: "var(--ink-dim)", marginBottom: 8 }}>
                    This is the actual record for one finding, exactly what the classifier output and what every chart on this page reads from. Nothing hidden or reshaped for the demo.
                  </div>
                  <pre
                    style={{
                      background: "#0a0a0a",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      padding: 16,
                      fontSize: 11.5,
                      lineHeight: 1.6,
                      color: "var(--ink-dim)",
                      overflowX: "auto",
                      fontFamily: "var(--mono)",
                    }}
                  >
                    {JSON.stringify(sample, null, 2)}
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
