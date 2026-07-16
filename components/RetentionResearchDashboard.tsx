"use client";
import { useMemo, useState } from "react";
import { Bars, Donut, StatTiles } from "@/components/Charts";
import { CommunitySelector } from "@/components/CommunitySelector";
import { PainPointStackedBars } from "@/components/PainPointStackedBars";
import { TimelineChart } from "@/components/TimelineChart";
import { FindingsTable } from "@/components/FindingsTable";
import {
  CommunityDataset,
  painPointBreakdown,
  severityHistogram,
  appRelevanceBreakdown,
  solutionCategoryBreakdown,
  timelineBreakdown,
  confidenceTierBreakdown,
  executiveSummary,
  solutionCategoryLabel,
} from "@/lib/retention-research";

const SEVERITY_TONE = ["muted", "muted", "amber", "amber", "bad"];

export function RetentionResearchDashboard({
  communities,
  combined,
}: {
  communities: CommunityDataset[];
  combined: CommunityDataset;
}) {
  const options = [
    { id: "all", label: "All communities combined", count: combined.relevant_count },
    ...communities.map((c) => ({ id: c.subreddit, label: c.label, count: c.relevant_count })),
  ];
  const [active, setActive] = useState("all");

  const ds = useMemo(() => {
    if (active === "all") return combined;
    return communities.find((c) => c.subreddit === active) ?? combined;
  }, [active, communities, combined]);

  const findings = ds.findings;
  const summary = useMemo(() => executiveSummary(ds), [ds]);
  const painPoints = useMemo(() => painPointBreakdown(findings), [findings]);
  const severity = useMemo(() => severityHistogram(findings), [findings]);
  const appRel = useMemo(() => appRelevanceBreakdown(findings), [findings]);
  const solutions = useMemo(() => solutionCategoryBreakdown(findings), [findings]);
  const timeline = useMemo(() => timelineBreakdown(findings), [findings]);
  const tiers = useMemo(() => confidenceTierBreakdown(findings), [findings]);
  const solutionsMentioned = findings.filter((f) => f.solution).length;

  return (
    <div className="wrap">
      <section style={{ padding: "48px 0 20px" }}>
        <div className="eyebrow" style={{ marginBottom: 14 }}>Retention Research</div>
        <div className="hero-sub">Where gym members are actually walking out the door.</div>
        <div style={{ marginTop: 24 }}>
          <CommunitySelector options={options} active={active} onChange={setActive} />
        </div>
      </section>

      <div className="briefing">
        {summary.map((s, i) => (
          <div key={i} className={i === 0 ? "briefing-lead" : "briefing-sub"}>
            {s}
          </div>
        ))}
      </div>

      <section className="section" style={{ borderTop: "none", paddingTop: 0 }}>
        <StatTiles
          tiles={[
            { label: "Posts/comments analyzed", value: ds.total_analyzed, tone: "muted" },
            { label: "Relevant findings", value: ds.relevant_count, tone: "amber" },
            { label: "Strong confidence", value: tiers.strong, tone: "hot", note: `${tiers.moderate} moderate · ${tiers.weak} weak` },
          ]}
        />
      </section>

      <section className="section">
        <div className="section-head">
          <div className="section-title">Pain point frequency</div>
          <div className="eyebrow muted">by confidence tier</div>
        </div>
        {painPoints.length > 0 ? (
          <PainPointStackedBars rows={painPoints} />
        ) : (
          <div style={{ color: "var(--ink-faint)" }}>No findings yet.</div>
        )}
      </section>

      <div className="grid grid-2" style={{ gap: 24 }}>
        <section className="section">
          <div className="section-head">
            <div className="section-title">Severity distribution</div>
          </div>
          <Bars rows={severity.map((s) => ({ label: `${s.severity} / 5`, value: s.count, tone: SEVERITY_TONE[s.severity - 1] }))} />
        </section>

        <section className="section">
          <div className="section-head">
            <div className="section-title">Can software fix it?</div>
          </div>
          <Donut
            segments={appRel.map((a) => ({ label: a.label, value: a.count, tone: a.key === "core_fit" ? "hot" : a.key === "partial_fit" ? "amber" : "muted" }))}
            centerLabel="findings"
          />
        </section>
      </div>

      <section className="section">
        <div className="section-head">
          <div className="section-title">Solutions mentioned</div>
          <div className="eyebrow muted">{solutionsMentioned} of {findings.length} findings name one</div>
        </div>
        {solutions.length > 0 ? (
          <Bars rows={solutions.map(([s, c]) => ({ label: solutionCategoryLabel(s), value: c, tone: "amber" }))} />
        ) : (
          <div style={{ color: "var(--ink-faint)" }}>No solutions surfaced yet.</div>
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <div className="section-title">Timeline</div>
          <div className="eyebrow muted">findings by quarter, 2014–2026</div>
        </div>
        <TimelineChart rows={timeline} />
      </section>

      <section className="section">
        <div className="section-head">
          <div className="section-title">Top findings</div>
          <div className="eyebrow muted">pain point → solution tried → outcome</div>
        </div>
        <FindingsTable findings={findings} />
      </section>

      <div className="foot">
        Retention Research · classified from public Reddit discussions · static build, not live-syncing.
      </div>
    </div>
  );
}
