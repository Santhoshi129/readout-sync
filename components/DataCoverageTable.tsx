"use client";
import { CommunityDataset } from "@/lib/retention-research";

export function DataCoverageTable({ communities }: { communities: CommunityDataset[] }) {
  const maxRelevant = Math.max(1, ...communities.map((c) => c.relevant_count));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 130px 100px 80px 150px",
          gap: 12,
          padding: "0 14px 10px",
          fontFamily: "var(--mono)",
          fontSize: 10,
          color: "var(--ink-faint)",
          letterSpacing: "0.05em",
        }}
      >
        <span>COMMUNITY</span>
        <span>ANALYZED</span>
        <span>RELEVANT</span>
        <span>HIT RATE</span>
        <span>CONFIDENCE MIX</span>
      </div>
      {communities.map((c) => {
        const hitRate = c.total_analyzed > 0 ? (c.relevant_count / c.total_analyzed) * 100 : 0;
        const barW = Math.max(2, (c.relevant_count / maxRelevant) * 100);
        const strong = c.findings.filter((f) => f.confidence_tier === "strong").length;
        const moderate = c.findings.filter((f) => f.confidence_tier === "moderate").length;
        const weak = c.findings.filter((f) => f.confidence_tier === "weak").length;
        const n = c.findings.length || 1;
        const strongPct = Math.round((strong / n) * 100);
        const noStrong = c.findings.length > 0 && strong === 0;
        return (
          <div key={c.subreddit} className="card" style={{ padding: "14px 14px", borderRadius: 10, border: noStrong ? "1px solid var(--warm)" : undefined }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 130px 100px 80px 150px", gap: 12, alignItems: "center" }}>
              <span style={{ fontWeight: 600 }}>{c.label}</span>
              <span style={{ color: "var(--ink-dim)", fontSize: 13 }}>{c.total_analyzed.toLocaleString()}</span>
              <span style={{ color: "var(--ink)", fontSize: 13 }}>{c.relevant_count}</span>
              <span style={{ color: "var(--amber)", fontSize: 13 }}>{hitRate < 0.01 ? "<0.01" : hitRate.toFixed(2)}%</span>
              <span style={{ fontSize: 12.5, color: noStrong ? "var(--warm)" : "var(--ink-dim)" }}>
                {strong} strong / {moderate} mod / {weak} weak
              </span>
            </div>
            <div style={{ marginTop: 8, height: 4, borderRadius: 2, background: "var(--muted)", overflow: "hidden" }}>
              <div style={{ width: `${barW}%`, height: "100%", background: "var(--amber)" }} />
            </div>
            {noStrong && (
              <div style={{ marginTop: 8, fontSize: 11.5, color: "var(--warm)" }}>
                No strong-tier findings in this community - every one of its {c.relevant_count} relevant findings cleared only moderate or weak confidence ({strongPct}% strong). Read this community's numbers as directional, not as settled as the others on this page.
              </div>
            )}
            {c.data_note && (
              <div style={{ marginTop: 8, fontSize: 11.5, color: "var(--warm)" }}>{c.data_note}</div>
            )}
          </div>
        );
      })}
      <div style={{ marginTop: 8, fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.6 }}>
        Bar length is relevant-finding count, not analyzed volume - the two aren't proportional (orangetheory analyzed 1.8M posts/comments for 690 relevant findings; gymowner analyzed 6,688 for 276). Read hit rate as how dense a community's actual pull was in retention-relevant content, not as a quality signal on its own. Confidence mix is a separate axis from hit rate: a community can have a high hit rate and still be low-confidence, which is exactly what happens with a thin pull.
      </div>
    </div>
  );
}
