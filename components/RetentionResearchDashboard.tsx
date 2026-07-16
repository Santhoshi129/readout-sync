"use client";
import { useMemo, useState } from "react";
import { StatTiles } from "@/components/Charts";
import { CommunitySelector } from "@/components/CommunitySelector";
import { PainPointStackedBars } from "@/components/PainPointStackedBars";
import { SeverityBars } from "@/components/SeverityBars";
import { AppRelevanceDonut } from "@/components/AppRelevanceDonut";
import { SolutionBars } from "@/components/SolutionBars";
import { TimelineChart } from "@/components/TimelineChart";
import { FindingsTable, TableFilters } from "@/components/FindingsTable";
import { KeyTakeaways } from "@/components/KeyTakeaways";
import { RetentionGlossary } from "@/components/RetentionGlossary";
import { InfoTip } from "@/components/InfoTip";
import {
  CommunityDataset,
  AppRelevance,
  painPointBreakdown,
  severityHistogram,
  appRelevanceBreakdown,
  solutionCategoryBreakdown,
  timelineBreakdown,
  confidenceTierBreakdown,
  executiveSummary,
  keyTakeaways,
  soWhatPainPoints,
  soWhatSeverity,
  soWhatAppRelevance,
  soWhatSolutions,
  soWhatTimeline,
} from "@/lib/retention-research";

const EMPTY_FILTERS: TableFilters = { painPoint: "All", tier: "All", relevance: "All", solutionCategory: "All", severity: "All" };

function scrollToTable() {
  document.getElementById("findings-table")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

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
  const [filters, setFilters] = useState<TableFilters>(EMPTY_FILTERS);

  const ds = useMemo(() => {
    if (active === "all") return combined;
    return communities.find((c) => c.subreddit === active) ?? combined;
  }, [active, communities, combined]);

  const findings = ds.findings;
  const takeaways = useMemo(() => keyTakeaways(ds), [ds]);
  const summary = useMemo(() => executiveSummary(ds), [ds]);
  const painPoints = useMemo(() => painPointBreakdown(findings), [findings]);
  const severity = useMemo(() => severityHistogram(findings), [findings]);
  const appRel = useMemo(() => appRelevanceBreakdown(findings), [findings]);
  const solutions = useMemo(() => solutionCategoryBreakdown(findings), [findings]);
  const timeline = useMemo(() => timelineBreakdown(findings), [findings]);
  const tiers = useMemo(() => confidenceTierBreakdown(findings), [findings]);
  const solutionsMentioned = findings.filter((f) => f.solution).length;

  const toggle = (patch: Partial<TableFilters>, key: keyof TableFilters, value: string | number) => {
    setFilters((prev) => {
      const next = prev[key] === value ? { ...prev, [key]: "All" } : { ...prev, ...patch };
      return next;
    });
    scrollToTable();
  };

  return (
    <div className="wrap">
      <section style={{ padding: "48px 0 20px" }}>
        <div className="eyebrow" style={{ marginBottom: 14 }}>Retention Research</div>
        <div className="hero-sub">Where gym members are actually walking out the door.</div>
        <div style={{ marginTop: 24 }}>
          <CommunitySelector options={options} active={active} onChange={setActive} />
        </div>
      </section>

      <section style={{ marginBottom: 24 }}>
        <KeyTakeaways points={takeaways} />
      </section>

      <div className="briefing">
        {summary.map((s, i) => (
          <div key={i} className={i === 0 ? "briefing-lead" : "briefing-sub"}>
            {s}
          </div>
        ))}
      </div>

      <section style={{ marginBottom: 32 }}>
        <RetentionGlossary />
      </section>

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
          <div className="section-title">
            Pain point frequency
            <InfoTip text="How many relevant findings fall into each pain-point category, split by how confident the classifier is in each one." />
          </div>
          <div className="eyebrow muted">
            by confidence tier <InfoTip text="Strong = high trust the finding is real and on-topic. Moderate = plausible. Weak = worth watching, not yet a settled fact." />
          </div>
        </div>
        {painPoints.length > 0 ? (
          <>
            <PainPointStackedBars
              rows={painPoints}
              active={filters.painPoint === "All" ? null : filters.painPoint}
              onSelect={(pp) => toggle({ painPoint: pp }, "painPoint", pp)}
            />
            <div style={{ marginTop: 18, color: "var(--ink-dim)", fontSize: 13.5, lineHeight: 1.6, fontStyle: "italic" }}>
              {soWhatPainPoints(painPoints, findings.length)}
            </div>
          </>
        ) : (
          <div style={{ color: "var(--ink-faint)" }}>No findings yet.</div>
        )}
      </section>

      <div className="grid grid-2" style={{ gap: 24 }}>
        <section className="section">
          <div className="section-head">
            <div className="section-title">
              Severity distribution
              <InfoTip text="How serious the member/owner made the problem sound — 1 is a passing annoyance, 5 is a stated reason someone left or nearly left." />
            </div>
          </div>
          <SeverityBars
            rows={severity}
            active={filters.severity === "All" ? null : filters.severity}
            onSelect={(s) => toggle({ severity: s }, "severity", s)}
          />
          <div style={{ marginTop: 18, color: "var(--ink-dim)", fontSize: 13, lineHeight: 1.6, fontStyle: "italic" }}>
            {soWhatSeverity(severity, findings.length)}
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <div className="section-title">
              Can software fix it?
              <InfoTip text="Core fit = TWU's app can address this directly. Partial fit = it can help around the edges. Not addressable = a staffing, coaching, or facility problem software can't touch." />
            </div>
          </div>
          <AppRelevanceDonut
            segments={appRel.map((a) => ({ key: a.key as AppRelevance, label: a.label, count: a.count, tone: a.key === "core_fit" ? "hot" : a.key === "partial_fit" ? "amber" : "muted" }))}
            active={filters.relevance === "All" ? null : (filters.relevance as AppRelevance)}
            onSelect={(k) => toggle({ relevance: k }, "relevance", k)}
          />
          <div style={{ marginTop: 18, color: "var(--ink-dim)", fontSize: 13, lineHeight: 1.6, fontStyle: "italic" }}>
            {soWhatAppRelevance(appRel, findings.length)}
          </div>
        </section>
      </div>

      <section className="section">
        <div className="section-head">
          <div className="section-title">Solutions mentioned</div>
          <div className="eyebrow muted">{solutionsMentioned} of {findings.length} findings name one</div>
        </div>
        {solutions.length > 0 ? (
          <>
            <SolutionBars
              rows={solutions}
              active={filters.solutionCategory === "All" ? null : filters.solutionCategory}
              onSelect={(s) => toggle({ solutionCategory: s }, "solutionCategory", s)}
            />
            <div style={{ marginTop: 18, color: "var(--ink-dim)", fontSize: 13.5, lineHeight: 1.6, fontStyle: "italic" }}>
              {soWhatSolutions(solutions, solutionsMentioned, findings.length)}
            </div>
          </>
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
        <div style={{ marginTop: 18, color: "var(--ink-dim)", fontSize: 13.5, lineHeight: 1.6, fontStyle: "italic" }}>
          {soWhatTimeline(timeline)}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div className="section-title">Top findings</div>
          <div className="eyebrow muted">pain point → solution tried → outcome · click any chart above to filter this</div>
        </div>
        <FindingsTable findings={findings} filters={filters} onFiltersChange={setFilters} />
      </section>

      <div className="foot">
        Retention Research · classified from public Reddit discussions · static build, not live-syncing.
      </div>
    </div>
  );
}
