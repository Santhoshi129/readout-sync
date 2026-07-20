"use client";
import { CommunityDataset } from "@/lib/retention-research";

export function DataCoverageTable({ communities }: { communities: CommunityDataset[] }) {
  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 14,
        }}
      >
        {communities.map((c) => {
          const hitRate = c.total_analyzed > 0 ? (c.relevant_count / c.total_analyzed) * 100 : 0;
          const strong = c.findings.filter((f) => f.confidence_tier === "strong").length;
          const moderate = c.findings.filter((f) => f.confidence_tier === "moderate").length;
          const weak = c.findings.filter((f) => f.confidence_tier === "weak").length;
          const n = c.findings.length || 1;
          const strongPct = (strong / n) * 100;
          const modPct = (moderate / n) * 100;
          const weakPct = (weak / n) * 100;
          const noStrong = c.findings.length > 0 && strong === 0;
          return (
            <div
              key={c.subreddit}
              className="card"
              style={{
                padding: 18,
                borderRadius: 14,
                border: `1px solid ${noStrong ? "var(--warm)" : "var(--border)"}`,
                background: "linear-gradient(160deg, var(--card) 0%, var(--card-raised) 100%)",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{c.label}</span>
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 9,
                    letterSpacing: "0.05em",
                    padding: "3px 8px",
                    borderRadius: 999,
                    color: c.data_note ? "var(--warm)" : "var(--hot)",
                    border: `1px solid ${c.data_note ? "var(--warm)" : "var(--hot)"}`,
                  }}
                >
                  {c.data_note ? "FUNNELED" : "EXHAUSTIVE"}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 32, fontWeight: 800, fontFamily: "var(--font-head)", color: "var(--ink)" }}>{c.relevant_count}</span>
                <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>relevant of {c.total_analyzed.toLocaleString()} analyzed</span>
              </div>

              <div>
                <div style={{ display: "flex", height: 10, borderRadius: 999, overflow: "hidden", background: "var(--muted)" }}>
                  {strong > 0 && <div style={{ width: `${strongPct}%`, background: "var(--hot)" }} title={`${strong} strong`} />}
                  {moderate > 0 && <div style={{ width: `${modPct}%`, background: "var(--amber)" }} title={`${moderate} moderate`} />}
                  {weak > 0 && <div style={{ width: `${weakPct}%`, background: "var(--ink-faint)" }} title={`${weak} weak`} />}
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 11, fontFamily: "var(--mono)" }}>
                  <span style={{ color: "var(--hot)" }}>&#9679; {strong} strong</span>
                  <span style={{ color: "var(--amber)" }}>&#9679; {moderate} mod</span>
                  <span style={{ color: "var(--ink-faint)" }}>&#9679; {weak} weak</span>
                </div>
              </div>

              <div style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>
                Hit rate {hitRate < 0.01 ? "<0.01" : hitRate.toFixed(2)}% of everything analyzed
              </div>

              {noStrong && (
                <div style={{ fontSize: 11.5, color: "var(--warm)", paddingTop: 8, borderTop: "1px solid var(--border-soft)" }}>
                  No strong-tier findings here ({strongPct.toFixed(0)}% strong). Read this community as directional, not as settled as the others.
                </div>
              )}
              {c.data_note && (
                <div style={{ fontSize: 11, color: "var(--ink-faint)", paddingTop: noStrong ? 0 : 8, borderTop: noStrong ? "none" : "1px solid var(--border-soft)" }}>
                  {c.data_note}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 14, fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.6 }}>
        Relevant count and hit rate aren't a quality signal on their own - orangetheory analyzed 1.8M posts/comments for 690 relevant findings, gymowner analyzed 6,688 for 276. The confidence bar is the separate axis that actually tells you how much to trust a community's numbers: a high hit rate can still sit on a low-confidence pull, which is exactly what's happening on the community flagged above.
      </div>
    </div>
  );
}
