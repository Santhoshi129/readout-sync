"use client";
import { useMemo, useState } from "react";
import { StatTiles } from "@/components/Charts";
import { CommunitySelector } from "@/components/CommunitySelector";
import { PainPointStackedBars } from "@/components/PainPointStackedBars";
import { SeverityBars } from "@/components/SeverityBars";
import { AppRelevanceDonut } from "@/components/AppRelevanceDonut";
import { SolutionBars } from "@/components/SolutionBars";
import { PerspectiveBars } from "@/components/PerspectiveBars";
import { PriorityMatrixTable } from "@/components/PriorityMatrixTable";
import { OpportunityMap } from "@/components/OpportunityMap";
import { TimelineChart } from "@/components/TimelineChart";
import { FindingsTable, TableFilters } from "@/components/FindingsTable";
import { KeyTakeaways } from "@/components/KeyTakeaways";
import { RetentionGlossary } from "@/components/RetentionGlossary";
import { SectionInsight } from "@/components/SectionInsight";
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
  perspectiveBreakdown,
  priorityMatrix,
  executiveSummary,
  keyTakeaways,
  soWhatPainPoints,
  soWhatSeverity,
  soWhatAppRelevance,
  soWhatSolutions,
  soWhatTimeline,
  soWhatPerspective,
  soWhatPriority,
  priorityHeadline,
  painPointLabel,
  solutionCategoryLabel,
  perspectiveLabel,
  APP_RELEVANCE_LABEL,
} from "@/lib/retention-research";

const EMPTY_FILTERS: TableFilters = { painPoint: "All", tier: "All", relevance: "All", solutionCategory: "All", severity: "All", perspective: "All" };


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
  const perspective = useMemo(() => perspectiveBreakdown(findings), [findings]);
  const priority = useMemo(() => priorityMatrix(findings), [findings]);
  const headline = useMemo(() => priorityHeadline(priority), [priority]);
  const solutionsMentioned = findings.filter((f) => f.solution).length;

  const select = (key: keyof TableFilters, value: string | number) => {
    setFilters((prev) => (prev[key] === value ? { ...prev, [key]: "All" } : { ...prev, [key]: value }));
  };
  const clear = (key: keyof TableFilters) => setFilters((prev) => ({ ...prev, [key]: "All" }));

  const painPointMatches = filters.painPoint === "All" ? null : findings.filter((f) => f.pain_point === filters.painPoint);
  const severityMatches = filters.severity === "All" ? null : findings.filter((f) => f.pain_severity === filters.severity);
  const relevanceMatches = filters.relevance === "All" ? null : findings.filter((f) => f.app_relevance === filters.relevance);
  const solutionMatches = filters.solutionCategory === "All" ? null : findings.filter((f) => f.solution_category === filters.solutionCategory);
  const perspectiveMatches = filters.perspective === "All" ? null : findings.filter((f) => (f.perspective || "unclear") === filters.perspective);

  const priorityActivePainPoint = filters.painPoint !== "All" && filters.relevance === "core_fit" ? filters.painPoint : null;
  const priorityMatches = priorityActivePainPoint
    ? findings.filter((f) => f.pain_point === priorityActivePainPoint && f.app_relevance === "core_fit")
    : null;
  const selectPriority = (pp: string) => {
    setFilters((prev) =>
      prev.painPoint === pp && prev.relevance === "core_fit"
        ? { ...prev, painPoint: "All", relevance: "All" }
        : { ...prev, painPoint: pp, relevance: "core_fit" }
    );
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

      <div className="card" style={{ padding: 28, marginBottom: 24 }}>
        <div className="section-head" style={{ marginBottom: 0 }}>
          <div className="section-title">
            Build-first priority matrix
            <InfoTip text="The map plots every pain point by severity and how solvable it is with TWU's actual product, bubble size is volume, color is how unsolved it still is. The table below ranks the same data and expands per row for a confidence breakdown, the most-tried fix, and a recommendation." />
          </div>
          <div className="eyebrow muted">pain point x app fit x severity, excludes the catch-all "other" bucket</div>
        </div>
        {priority.length > 0 ? (
          <>
            {headline.pain_point && (
              <div
                style={{
                  marginTop: 20,
                  padding: "18px 22px",
                  borderRadius: 12,
                  background: "linear-gradient(135deg, rgba(201,168,76,0.14), rgba(201,168,76,0.03))",
                  border: "1px solid var(--amber-deep)",
                }}
              >
                <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em", color: "var(--amber)", marginBottom: 8 }}>
                  BOTTOM LINE
                </div>
                <div style={{ fontFamily: "var(--font-head)", fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 6 }}>
                  Build for {painPointLabel(headline.pain_point)} first.
                </div>
                <div style={{ color: "var(--ink-dim)", fontSize: 14 }}>{headline.sentence}</div>
              </div>
            )}
            <div style={{ marginTop: 22, fontSize: 13, color: "var(--ink-faint)" }}>
              The chart and table below show the full reasoning. Click any bubble or row to see the real quotes behind it.
            </div>
            <div style={{ marginTop: 14 }}>
              <OpportunityMap rows={priority} active={priorityActivePainPoint} onSelect={selectPriority} />
            </div>
            <div style={{ marginTop: 26, paddingTop: 22, borderTop: "1px solid var(--border-soft)" }}>
              <PriorityMatrixTable rows={priority} activePainPoint={priorityActivePainPoint} onSelect={selectPriority} />
            </div>
            <SectionInsight
              totalInView={findings.length}
              matches={priorityMatches}
              selectionLabel={priorityActivePainPoint ? `${painPointLabel(priorityActivePainPoint)}, core-fit only` : null}
              generalText={soWhatPriority(priority)}
              onClear={() => setFilters((prev) => ({ ...prev, painPoint: "All", relevance: "All" }))}
            />
          </>
        ) : (
          <div style={{ color: "var(--ink-faint)", marginTop: 16 }}>No findings yet.</div>
        )}
      </div>

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

      <section style={{ marginBottom: 24 }}>
        <StatTiles
          tiles={[
            { label: "Posts/comments analyzed", value: ds.total_analyzed, tone: "muted" },
            { label: "Relevant findings", value: ds.relevant_count, tone: "amber" },
            { label: "Strong confidence", value: tiers.strong, tone: "hot", note: `${tiers.moderate} moderate, ${tiers.weak} weak` },
          ]}
        />
      </section>

      <div className="card" style={{ padding: 28, marginBottom: 24 }}>
        <div className="section-head" style={{ marginBottom: 0 }}>
          <div className="section-title">
            Pain point frequency
            <InfoTip text="How many relevant findings fall into each pain point category, split by how confident the classifier is in each one. The 'Other' bar is a catch-all for findings that didn't fit a specific category, it's shown here for completeness but excluded from every ranking and recommendation elsewhere on this page." />
          </div>
          <div className="eyebrow muted">
            by confidence tier
            <InfoTip text="Strong means high trust the finding is real and on topic. Moderate means plausible. Weak means worth watching, not yet a settled fact." />
          </div>
        </div>
        {painPoints.length > 0 ? (
          <>
            <div style={{ marginTop: 22 }}>
              <PainPointStackedBars
                rows={painPoints}
                active={filters.painPoint === "All" ? null : filters.painPoint}
                onSelect={(pp) => select("painPoint", pp)}
              />
            </div>
            <SectionInsight
              totalInView={findings.length}
              matches={painPointMatches}
              selectionLabel={filters.painPoint === "All" ? null : painPointLabel(filters.painPoint)}
              generalText={soWhatPainPoints(painPoints, findings.length)}
              onClear={() => clear("painPoint")}
            />
          </>
        ) : (
          <div style={{ color: "var(--ink-faint)", marginTop: 16 }}>No findings yet.</div>
        )}
      </div>

      <div className="grid grid-2" style={{ gap: 24, marginBottom: 24 }}>
        <div className="card" style={{ padding: 28 }}>
          <div className="section-head" style={{ marginBottom: 0 }}>
            <div className="section-title">
              Severity distribution
              <InfoTip text="How serious the member or owner made the problem sound. 1 is a passing annoyance, 5 is a stated reason someone left or nearly left." />
            </div>
          </div>
          <div style={{ marginTop: 22 }}>
            <SeverityBars
              rows={severity}
              active={filters.severity === "All" ? null : filters.severity}
              onSelect={(s) => select("severity", s)}
            />
          </div>
          <SectionInsight
            totalInView={findings.length}
            matches={severityMatches}
            selectionLabel={filters.severity === "All" ? null : `Severity ${filters.severity}/5`}
            generalText={soWhatSeverity(severity, findings.length)}
            onClear={() => clear("severity")}
          />
        </div>

        <div className="card" style={{ padding: 28 }}>
          <div className="section-head" style={{ marginBottom: 0 }}>
            <div className="section-title">
              Can software fix it?
              <InfoTip text="Core fit means it's solvable by what TWU actually is, a community and connection layer (events, partner matching, chat, profiles), not booking or admin software. Partial fit means it can help around the edges. Not addressable means a staffing, coaching, pricing, or facility problem no connection layer touches." />
            </div>
          </div>
          <div style={{ marginTop: 22 }}>
            <AppRelevanceDonut
              segments={appRel.map((a) => ({ key: a.key as AppRelevance, label: a.label, count: a.count, tone: a.key === "core_fit" ? "hot" : a.key === "partial_fit" ? "amber" : "muted" }))}
              active={filters.relevance === "All" ? null : (filters.relevance as AppRelevance)}
              onSelect={(k) => select("relevance", k)}
            />
          </div>
          <SectionInsight
            totalInView={findings.length}
            matches={relevanceMatches}
            selectionLabel={filters.relevance === "All" ? null : APP_RELEVANCE_LABEL[filters.relevance as AppRelevance]}
            generalText={soWhatAppRelevance(appRel, findings.length)}
            onClear={() => clear("relevance")}
          />
        </div>
      </div>

      <div className="card" style={{ padding: 28, marginBottom: 24 }}>
        <div className="section-head" style={{ marginBottom: 0 }}>
          <div className="section-title">
            Who is actually talking
            <InfoTip text="Whether the finding comes from a gym owner describing what they observe, a member describing their own experience, a vendor, coach, or employee. Owner and member accounts carry very different evidentiary weight." />
          </div>
          <div className="eyebrow muted">voice behind each finding</div>
        </div>
        <div style={{ marginTop: 22 }}>
          <PerspectiveBars
            rows={perspective}
            active={filters.perspective === "All" ? null : filters.perspective}
            onSelect={(p) => select("perspective", p)}
          />
        </div>
        <SectionInsight
          totalInView={findings.length}
          matches={perspectiveMatches}
          selectionLabel={filters.perspective === "All" ? null : perspectiveLabel(filters.perspective)}
          generalText={soWhatPerspective(perspective, findings.length)}
          onClear={() => clear("perspective")}
        />
      </div>

      <div className="card" style={{ padding: 28, marginBottom: 24 }}>
        <div className="section-head" style={{ marginBottom: 0 }}>
          <div className="section-title">Solutions mentioned</div>
          <div className="eyebrow muted">{solutionsMentioned} of {findings.length} findings name one</div>
        </div>
        {solutions.length > 0 ? (
          <>
            <div style={{ marginTop: 22 }}>
              <SolutionBars
                rows={solutions}
                active={filters.solutionCategory === "All" ? null : filters.solutionCategory}
                onSelect={(s) => select("solutionCategory", s)}
              />
            </div>
            <SectionInsight
              totalInView={findings.length}
              matches={solutionMatches}
              selectionLabel={filters.solutionCategory === "All" ? null : solutionCategoryLabel(filters.solutionCategory)}
              generalText={soWhatSolutions(solutions, solutionsMentioned, findings.length)}
              onClear={() => clear("solutionCategory")}
            />
          </>
        ) : (
          <div style={{ color: "var(--ink-faint)", marginTop: 16 }}>No solutions surfaced yet.</div>
        )}
      </div>

      <div className="card" style={{ padding: 28, marginBottom: 24 }}>
        <div className="section-head" style={{ marginBottom: 0 }}>
          <div className="section-title">Timeline</div>
          <div className="eyebrow muted">findings by quarter, 2014 to 2026</div>
        </div>
        <div style={{ marginTop: 22 }}>
          <TimelineChart rows={timeline} />
        </div>
        <SectionInsight
          totalInView={findings.length}
          matches={null}
          selectionLabel={null}
          generalText={soWhatTimeline(timeline)}
          onClear={() => {}}
        />
      </div>

      <section className="section">
        <div className="section-head">
          <div className="section-title">Top findings</div>
          <div className="eyebrow muted">pain point to solution tried to outcome. click any chart above to filter this</div>
        </div>
        <FindingsTable findings={findings} filters={filters} onFiltersChange={setFilters} />
      </section>

      <div className="foot">
        Retention Research. classified from public Reddit discussions. static build, not live-syncing.
      </div>
    </div>
  );
}
