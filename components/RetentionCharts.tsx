"use client";
import { useState, useEffect } from "react";
import { fmt } from "@/lib/format";
import { RetentionFinding } from "@/lib/retention";

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

const BAND_COLOR: Record<string, string> = {
  Strong: "var(--hot)",
  Moderate: "var(--amber)",
  Emerging: "var(--ink-faint)",
};

function bandKey(band: string) {
  return (band || "").split(" ")[0];
}

// Frequency (mentions) vs. reported solution effectiveness. Bubble size is
// the confidence score, color is the confidence band. Top-right quadrant is
// where to build first — high volume, high reported effectiveness. Hovering
// a bubble names the finding inline (not just a native title tooltip) so
// the matrix is readable on its own.
export function PriorityMatrix({ findings }: { findings: RetentionFinding[] }) {
  const mounted = useMounted();
  const [hover, setHover] = useState<string | null>(null);
  const plottable = findings.filter((f) => f.effectiveness_score != null);
  const W = 640, H = 340, PAD = 48;

  if (plottable.length === 0) {
    return (
      <div style={{ color: "var(--ink-faint)", fontSize: 13, textAlign: "center", padding: "60px 0" }}>
        Not enough findings with a scored effectiveness yet to plot.
      </div>
    );
  }

  const maxFreq = Math.max(1, ...plottable.map((f) => f.frequency));
  const midX = PAD + 0.5 * (W - PAD * 2);
  const midY = H - PAD - 0.5 * (H - PAD * 2);
  const active = hover != null ? plottable.find((f) => f.finding_key === hover) : null;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <line
            key={g}
            x1={PAD} x2={W - PAD}
            y1={H - PAD - g * (H - PAD * 2)} y2={H - PAD - g * (H - PAD * 2)}
            stroke="var(--border-soft)" strokeWidth="1"
          />
        ))}
        {/* quadrant guides */}
        <line x1={midX} y1={PAD} x2={midX} y2={H - PAD} stroke="var(--border-soft)" strokeWidth="1" strokeDasharray="4 4" />
        <rect x={midX} y={PAD} width={W - PAD - midX} height={midY - PAD} fill="rgba(201,168,76,0.04)" />
        <text x={W - PAD - 6} y={PAD + 16} textAnchor="end" fontSize="9.5" fontFamily="var(--mono)" fill="var(--amber)" letterSpacing="1.5">
          BUILD FIRST · HIGH VOLUME, PROVEN
        </text>
        <text x={PAD + 6} y={PAD + 16} fontSize="9.5" fontFamily="var(--mono)" fill="var(--ink-faint)" letterSpacing="1.5">
          WORKS, NICHE
        </text>
        <text x={W - PAD - 6} y={H - PAD - 8} textAnchor="end" fontSize="9.5" fontFamily="var(--mono)" fill="var(--ink-faint)" letterSpacing="1.5">
          LOUD BUT UNSOLVED
        </text>

        <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="var(--border)" strokeWidth="1.5" />
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--border)" strokeWidth="1.5" />
        <text x={PAD} y={H - 16} fontSize="10" fontFamily="var(--mono)" fill="var(--ink-faint)" letterSpacing="1">
          MENTIONS →
        </text>
        <text x={14} y={PAD} fontSize="10" fontFamily="var(--mono)" fill="var(--ink-faint)" letterSpacing="1" transform={`rotate(-90 14 ${PAD})`}>
          EFFECTIVENESS →
        </text>

        {plottable.map((f) => {
          const x = PAD + (f.frequency / maxFreq) * (W - PAD * 2);
          const y = H - PAD - (f.effectiveness_score as number) * (H - PAD * 2);
          const r = mounted ? 6 + f.community_confidence_score * 1.4 : 0;
          return (
            <circle
              key={f.finding_key}
              cx={x} cy={y} r={r}
              fill={BAND_COLOR[bandKey(f.confidence_band)]}
              opacity={hover == null || hover === f.finding_key ? 0.75 : 0.25}
              stroke="var(--bg)"
              strokeWidth="2"
              style={{ transition: "r 700ms cubic-bezier(0.16,1,0.3,1), opacity 150ms ease", cursor: "pointer" }}
              onMouseEnter={() => setHover(f.finding_key)}
              onMouseLeave={() => setHover((h) => (h === f.finding_key ? null : h))}
            >
              <title>{f.pain_point} — {f.frequency} mentions, {((f.effectiveness_score as number) * 100).toFixed(0)}% effective</title>
            </circle>
          );
        })}
      </svg>
      <div style={{ display: "flex", gap: 18, marginTop: 8, fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-dim)", flexWrap: "wrap" }}>
        <span><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--hot)", marginRight: 6 }} />Strong</span>
        <span><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--amber)", marginRight: 6 }} />Moderate</span>
        <span><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--ink-faint)", marginRight: 6 }} />Emerging</span>
        <span style={{ marginLeft: "auto" }}>Bubble size = confidence score</span>
      </div>
      <div style={{ marginTop: 10, minHeight: 20, fontSize: 12.5, color: active ? "var(--ink-dim)" : "var(--ink-faint)" }}>
        {active
          ? <><strong style={{ color: "var(--amber)" }}>{active.pain_point}</strong> — {fmt(active.frequency)} mentions · {((active.effectiveness_score as number) * 100).toFixed(0)}% of clear reports said the fix worked · score {active.community_confidence_score}</>
          : "Hover a bubble to identify the finding."}
      </div>
    </div>
  );
}

// Expandable evidence card. The "chain of evidence" stepper at the bottom
// of the expanded view is the auditability signature — every finding shows
// its path from raw Reddit source to scored, benchmarked conclusion.
export function FindingCard({ finding, rank }: { finding: RetentionFinding; rank: number }) {
  const [open, setOpen] = useState(false);
  const f = finding;

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div
        onClick={() => setOpen((o) => !o)}
        style={{ display: "flex", alignItems: "center", gap: 20, padding: "20px 24px", cursor: "pointer" }}
      >
        <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-faint)", width: 24 }}>
          {String(rank).padStart(2, "0")}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-head)", fontSize: 17, fontWeight: 700, marginBottom: 6 }}>
            {f.pain_point}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {f.pain_point_category && <span className="chip">{f.pain_point_category.replace("_", " / ")}</span>}
            {f.affiliate_segment && f.affiliate_segment !== "unclear" && <span className="chip">{f.affiliate_segment}</span>}
            <span className="chip">
              <span className="dot" style={{ width: 7, height: 7, background: BAND_COLOR[bandKey(f.confidence_band)] }} />
              {f.confidence_band}
            </span>
            {f.industry_validated === true && (
              <span className="chip" style={{ color: "var(--hot)", borderColor: "rgba(127,201,138,0.35)" }}>Validated</span>
            )}
            {f.contradiction_flag && (
              <span className="chip" style={{ color: "var(--warm)" }}>⚠ Split reports</span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 24, flexShrink: 0 }}>
          <div style={{ textAlign: "right" }}>
            <div className="stat-label">Mentions</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 15, marginTop: 2 }}>{fmt(f.frequency)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="stat-label">Score</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 15, marginTop: 2, color: "var(--amber)" }}>{f.community_confidence_score}</div>
          </div>
        </div>
      </div>

      {open && (
        <div style={{ borderTop: "1px solid var(--border-soft)", padding: 24, display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 32 }}>
          <div>
            {(f.pain_point_examples || []).length > 1 && (
              <>
                <div className="stat-label" style={{ marginBottom: 10 }}>How owners phrased it</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
                  {(f.pain_point_examples || []).map((ex, i) => (
                    <div key={i} style={{ fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.6, paddingLeft: 12, borderLeft: "2px solid var(--border-soft)" }}>
                      “{ex}”
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="stat-label" style={{ marginBottom: 12 }}>Solutions mentioned</div>
            {(f.solutions_by_frequency || []).length === 0 && (
              <div style={{ fontSize: 12.5, color: "var(--ink-faint)", padding: "8px 0" }}>No concrete solutions were proposed in these threads — the pain is described, not solved.</div>
            )}
            {(f.solutions_by_frequency || []).map((s, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border-soft)", fontSize: 13 }}>
                <span style={{ color: "var(--ink-dim)" }}>{s.solution}</span>
                <span style={{ fontFamily: "var(--mono)", color: "var(--amber)", flexShrink: 0 }}>{s.mentioned}×</span>
              </div>
            ))}
            {(f.feature_gaps_mentioned || []).map((g, i) => (
              <div key={i} style={{ marginTop: 8, fontSize: 11.5, color: "var(--bad)", background: "rgba(176,74,74,0.08)", border: "1px solid rgba(176,74,74,0.25)", padding: "6px 11px", borderRadius: 8 }}>
                ⚙ {g}
              </div>
            ))}
            {f.effectiveness_summary && (
              <div style={{ marginTop: 16, fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.7, padding: "14px 16px", background: "var(--card-raised)", borderRadius: 8, borderLeft: "2px solid var(--amber-deep)" }}>
                {f.effectiveness_summary}
                {f.twu_relevance && (<><br /><strong style={{ color: "var(--amber-bright)" }}>→ {f.twu_relevance}</strong></>)}
              </div>
            )}
            {f.methodology_note && (
              <div style={{ marginTop: 12, fontSize: 11, color: "var(--ink-faint)", fontFamily: "var(--mono)", lineHeight: 1.6 }}>
                {f.methodology_note}
              </div>
            )}
          </div>

          <div>
            <div className="stat-label" style={{ marginBottom: 12 }}>Benchmark</div>
            <div style={{
              padding: "14px 16px", borderRadius: 8,
              background: f.industry_validated ? "rgba(127,201,138,0.06)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${f.industry_validated ? "rgba(127,201,138,0.25)" : "var(--border-soft)"}`,
            }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, color: f.industry_validated ? "var(--hot)" : "var(--ink-faint)" }}>
                {f.industry_validated === true ? `✓ Industry validated${f.source ? " · " + f.source : ""}` : f.industry_validated === false ? "Not confirmed by published data" : "Not yet benchmarked"}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.6 }}>{f.benchmark_note || "—"}</div>
              {f.complicating_factor && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed var(--border-soft)", fontSize: 12, color: "var(--warm)" }}>
                  ⚠ {f.complicating_factor}
                </div>
              )}
            </div>

            {(f.sample_sources || []).filter((s) => s.permalink).length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div className="stat-label" style={{ marginBottom: 10 }}>Trace to source</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {(f.sample_sources || []).filter((s) => s.permalink).map((s, i) => (
                    <a
                      key={i}
                      href={s.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12, color: "var(--amber)", textDecoration: "none", padding: "7px 10px", border: "1px solid var(--border-soft)", borderRadius: 8 }}
                    >
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>reddit thread #{i + 1}</span>
                      <span style={{ fontFamily: "var(--mono)", color: "var(--ink-faint)", flexShrink: 0 }}>
                        {s.author_type === "likely_owner" ? "owner" : s.author_type || "?"} · ▲{fmt(s.upvotes ?? 0)}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", marginTop: 18 }}>
              {["Reddit", "Claude", "Scored", "Benchmark"].map((label, i) => (
                <div key={label} style={{ flex: 1, textAlign: "center", position: "relative", paddingTop: 18 }}>
                  <div style={{ position: "absolute", top: 5, left: "50%", transform: "translateX(-50%)", width: 9, height: 9, borderRadius: "50%", background: "var(--amber)", border: "2px solid var(--bg)", zIndex: 2 }} />
                  {i < 3 && <div style={{ position: "absolute", top: 9, left: "50%", width: "100%", height: 1, background: "var(--border)" }} />}
                  <div style={{ fontFamily: "var(--mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-faint)" }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
