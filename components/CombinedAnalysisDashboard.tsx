"use client";
import { useMemo, useState } from "react";
import { StatTiles } from "@/components/Charts";
import { RadarChart, RadarSeries } from "@/components/RadarChart";
import { CrossCommunityTable } from "@/components/CrossCommunityTable";
import { DataCoverageTable } from "@/components/DataCoverageTable";
import { PriorityLeaderboard } from "@/components/PriorityLeaderboard";
import { KeyTakeaways } from "@/components/KeyTakeaways";
import { InfoTip } from "@/components/InfoTip";
import { CommunityDataset, priorityMatrix } from "@/lib/retention-research";
import {
  MEMBER_SUBREDDITS,
  OWNER_SUBREDDITS,
  lensFindings,
  radarAxes,
  radarSoWhat,
  crossCommunityPainPoints,
  soWhatCoverage,
  soWhatFeatureRanking,
  longTailStats,
} from "@/lib/combined-analysis";

export function CombinedAnalysisDashboard({ communities }: { communities: CommunityDataset[] }) {
  const [tableSort, setTableSort] = useState<"coverage" | "buildable">("buildable");
  const [hoverAxis, setHoverAxis] = useState<string | null>(null);

  const memberFindings = useMemo(() => lensFindings(communities, MEMBER_SUBREDDITS), [communities]);
  const ownerFindings = useMemo(() => lensFindings(communities, OWNER_SUBREDDITS), [communities]);
  const memberCommunities = communities.filter((c) => MEMBER_SUBREDDITS.includes(c.subreddit));
  const ownerCommunities = communities.filter((c) => OWNER_SUBREDDITS.includes(c.subreddit));

  const axes = useMemo(() => radarAxes(memberFindings, ownerFindings), [memberFindings, ownerFindings]);
  const radarNarrative = useMemo(
    () => radarSoWhat(axes, memberFindings.length, ownerFindings.length),
    [axes, memberFindings.length, ownerFindings.length]
  );

  const coverageRows = useMemo(() => crossCommunityPainPoints(communities), [communities]);
  const longTail = useMemo(() => longTailStats(communities), [communities]);
  const universalCount = coverageRows.filter((r) => r.universal).length;
  const coverageNarrative = useMemo(() => soWhatCoverage(coverageRows, communities.length), [coverageRows, communities.length]);
  const featureNarrative = useMemo(() => soWhatFeatureRanking(coverageRows), [coverageRows]);

  const allFindings = useMemo(() => communities.flatMap((c) => c.findings), [communities]);
  const mergedPriority = useMemo(() => priorityMatrix(allFindings), [allFindings]);
  const [prioritySelect, setPrioritySelect] = useState<string | null>(null);

  const series: RadarSeries[] = [
    { key: "member", label: `Members (${memberFindings.length} findings, ${memberCommunities.map((c) => c.label).join(", ")})`, color: "var(--series-a)", values: axes.map((a) => a.memberPct) },
    { key: "owner", label: `Owners (${ownerFindings.length} findings, ${ownerCommunities.map((c) => c.label).join(", ")})`, color: "var(--series-b)", values: axes.map((a) => a.ownerPct) },
  ];

  const topBuildable = [...coverageRows].sort((a, b) => b.buildableCount - a.buildableCount).slice(0, 6);
  const totalBuildable = coverageRows.reduce((s, r) => s + r.buildableCount, 0);
  const maxBuildable = Math.max(1, ...topBuildable.map((r) => r.buildableCount));

  return (
    <div className="wrap">
      <section style={{ padding: "48px 0 20px" }}>
        <div className="eyebrow" style={{ marginBottom: 14 }}>Retention Research · Combined Analysis</div>
        <div className="hero-sub">Two audiences, one product decision.</div>
        <div style={{ marginTop: 18, maxWidth: 700, color: "var(--ink-dim)", fontSize: 15, lineHeight: 1.6 }}>
          Every community I've classified talks about retention from one of two seats: someone paying to train (f45, orangetheory, crossfit, hyrox - {memberFindings.length} findings) or someone running the business (gymowner - {ownerFindings.length} findings). This page puts those two voices side by side, then looks across all {communities.length} communities together to find what's universal, what's buildable, and what to prioritize first.
        </div>
        <div style={{ marginTop: 14, maxWidth: 700, color: "var(--ink-faint)", fontSize: 12.5, lineHeight: 1.6 }}>
          The radar, coverage, and feature-ranking sections below are restricted to the 11 pain-point categories used consistently across communities. The raw data actually carries {longTail.totalLabels} distinct pain_point labels; {longTail.excludedLabels} of them ({longTail.excludedFindings} findings, {Math.round((longTail.excludedFindings / longTail.totalFindings) * 100)}% of the total) are one-off labels a single community's classification pass invented instead of reusing the shared taxonomy - mostly used once or twice each. Real findings, just not comparable across communities, so I've left them out of this page specifically (each community's own tab still shows them).
        </div>
      </section>

      <section style={{ marginBottom: 24 }}>
        <StatTiles
          tiles={[
            { label: "Member findings", value: memberFindings.length, tone: "muted", note: `Across ${memberCommunities.map((c) => c.label).join(", ")}` },
            { label: "Owner findings", value: ownerFindings.length, tone: "amber", note: "From gymowner" },
            { label: "Universal pain points", value: universalCount, tone: "hot", note: `Out of ${coverageRows.length} distinct categories, present in all ${communities.length} communities` },
          ]}
        />
      </section>

      <div className="card" style={{ padding: 28, marginBottom: 24 }}>
        <div className="section-head" style={{ marginBottom: 0 }}>
          <div className="section-title">
            Member voice vs owner voice
            <InfoTip text="Each axis is a pain-point category. The value is that category's share of the lens's own findings (not a raw count), so the two shapes are comparable even though members and owners have different total finding counts." />
          </div>
          <div className="eyebrow muted">by share of findings</div>
        </div>
        <div style={{ marginTop: 22 }}>
          <RadarChart axisLabels={axes.map((a) => a.label)} series={series} onHoverAxis={setHoverAxis} activeAxis={hoverAxis} />
        </div>
        <div style={{ marginTop: 18, fontSize: 14, lineHeight: 1.6, color: "var(--ink-dim)", maxWidth: 760 }}>{radarNarrative}</div>
      </div>

      <div className="card" style={{ padding: 28, marginBottom: 24 }}>
        <div className="section-head" style={{ marginBottom: 0 }}>
          <div className="section-title">
            Cross-community pain points
            <InfoTip text="Every distinct pain-point category, and which of the live communities actually surface it. 'Universal' means it shows up in every single community, not just the biggest ones. Toggle the sort to rank by buildable volume instead - same rows, different question." />
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              className={tableSort === "buildable" ? "lens-btn on" : "lens-btn"}
              onClick={() => setTableSort("buildable")}
              style={{
                fontFamily: "var(--mono)",
                fontSize: 10.5,
                letterSpacing: "0.05em",
                padding: "6px 12px",
                borderRadius: 999,
                border: "1px solid var(--border)",
                background: tableSort === "buildable" ? "var(--amber)" : "transparent",
                color: tableSort === "buildable" ? "#000" : "var(--ink-dim)",
                cursor: "pointer",
              }}
            >
              SORT: BUILDABLE
            </button>
            <button
              onClick={() => setTableSort("coverage")}
              style={{
                fontFamily: "var(--mono)",
                fontSize: 10.5,
                letterSpacing: "0.05em",
                padding: "6px 12px",
                borderRadius: 999,
                border: "1px solid var(--border)",
                background: tableSort === "coverage" ? "var(--amber)" : "transparent",
                color: tableSort === "coverage" ? "#000" : "var(--ink-dim)",
                cursor: "pointer",
              }}
            >
              SORT: COVERAGE
            </button>
          </div>
        </div>
        <div style={{ marginTop: 22 }}>
          <CrossCommunityTable rows={coverageRows} communityCount={communities.length} sortBy={tableSort} />
        </div>
        <div style={{ marginTop: 18, fontSize: 14, lineHeight: 1.6, color: "var(--ink-dim)", maxWidth: 760 }}>
          {tableSort === "coverage" ? coverageNarrative : featureNarrative}
        </div>
      </div>

      <div className="card" style={{ padding: 28, marginBottom: 24 }}>
        <div className="section-head" style={{ marginBottom: 0 }}>
          <div className="section-title">
            Feature development ranking
            <InfoTip text="Buildable (core-fit + partial-fit) findings per pain point, ranked by volume - this is the same 'buildable' column from the table above, shown as bars so relative size is easier to read at a glance." />
          </div>
          <div className="eyebrow muted">{totalBuildable} buildable findings total</div>
        </div>
        <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 12 }}>
          {topBuildable.map((r) => (
            <div key={r.pain_point} style={{ display: "grid", gridTemplateColumns: "180px 1fr 50px", gap: 14, alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "var(--ink)" }}>{r.label}</span>
              <div style={{ height: 10, borderRadius: 5, background: "var(--muted)", overflow: "hidden" }}>
                <div style={{ width: `${(r.buildableCount / maxBuildable) * 100}%`, height: "100%", background: "var(--amber)" }} />
              </div>
              <span style={{ fontSize: 13, color: "var(--amber)", textAlign: "right" }}>{r.buildableCount}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 28, marginBottom: 24 }}>
        <div className="section-head" style={{ marginBottom: 0 }}>
          <div className="section-title">
            Merged priority ranking
            <InfoTip text="Pain points ranked by core-fit volume x average severity, computed across every community's findings pooled together - not per-lens, the single combined answer to 'what should TWU build first.'" />
          </div>
          <div className="eyebrow muted">frequency x severity, buildable only</div>
        </div>
        <div style={{ marginTop: 22 }}>
          <PriorityLeaderboard rows={mergedPriority} active={prioritySelect} onSelect={(pp) => setPrioritySelect((cur) => (cur === pp ? null : pp))} />
        </div>
      </div>

      <div className="card" style={{ padding: 28, marginBottom: 24 }}>
        <div className="section-head" style={{ marginBottom: 0 }}>
          <div className="section-title">
            Data coverage
            <InfoTip text="How much each community was actually pulled and classified, and what share of that turned into a relevant finding. This is here so a small tab (fewer findings) doesn't get mistaken for a weak finding - some communities just had a smaller or less retention-chatty raw pull." />
          </div>
        </div>
        <div style={{ marginTop: 22 }}>
          <DataCoverageTable communities={communities} />
        </div>
      </div>
    </div>
  );
}
