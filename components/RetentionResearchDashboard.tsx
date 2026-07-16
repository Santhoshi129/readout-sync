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
        <div style={{ marginTop: 18, maxWidth: 640, color: "var(--ink-dim)", fontSize: 15, lineHeight: 1.6 }}>
          I pulled every post and comment in r/gymowner, ran it through classification looking for one thing, why members actually leave, and whether TWU's product can fix it. What follows is that walkthrough: the headline first, then the reasoning behind it, then the actual quotes it's built on. Keep scrolling, each section backs up the one before it.
        </div>
        <div style={{ marginTop: 24 }}>
          <CommunitySelector options={options} active={active} onChange={setActive} />
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: "var(--ink-faint)" }}>
          {communities.length === 1
            ? `Right now "All communities combined" and "${communities[0].label}" show the same numbers, r/gymowner is the only subreddit I've classified so far. I built the selector to hold more, crossfit, f45, and hyrox are next, so this won't need rebuilding when they land.`
            : "Switch between individual communities or the combined view above."}
        </div>
      </section>

      <section style={{ marginBottom: 24 }}>
        <KeyTakeaways points={takeaways} />
      </section>

      <div className="card" style={{ padding: 28, marginBottom: 24 }}>
        <div className="section-head" style={{ marginBottom: 0 }}>
          <div className="section-title">
            Build-first priority matrix
            <InfoTip text="I plotted every pain point by severity and how solvable it is with TWU's actual product, bubble size is volume, color is how unsolved it still is. The table below ranks the same data and expands per row for a confidence breakdown, the most-tried fix, and my recommendation." />
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
              I lay out the full reasoning in the chart and table below. Click any bubble or row to see the real quotes behind it.
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

      <div style={{ margin: "28px 0", fontSize: 14, color: "var(--ink-dim)", fontStyle: "italic" }}>
        Before you take that on faith, here's the fuller picture I built it from:
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

      <div style={{ marginBottom: 16, fontSize: 14, color: "var(--ink-dim)", fontStyle: "italic" }}>
        Now the breakdown. Every pain point I found, ranked by how often it came up and how sure I am about each one:
      </div>

      <div className="card" style={{ padding: 28, marginBottom: 24 }}>
        <div className="section-head" style={{ marginBottom: 0 }}>
          <div className="section-title">
            Pain point frequency
            <InfoTip text="How many relevant findings I found in each pain point category, split by how confident I am in each one. The 'Other' bar is a catch-all for findings that didn't fit a specific category, I left it here for completeness but excluded it from every ranking and recommendation elsewhere on this page." />
          </div>
          <div className="eyebrow muted">
            by confidence tier
            <InfoTip text="Strong means I trust the finding is real and on topic. Moderate means plausible. Weak means worth watching, not yet a settled fact to me." />
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

      <div style={{ margin: "28px 0 16px", fontSize: 14, color: "var(--ink-dim)", fontStyle: "italic" }}>
        Two more angles on the same findings: how bad each complaint actually is, and how much of it TWU's product can touch.
      </div>

      <div className="grid grid-2" style={{ gap: 24, marginBottom: 24 }}>
        <div className="card" style={{ padding: 28 }}>
          <div className="section-head" style={{ marginBottom: 0 }}>
            <div className="section-title">
              Severity distribution
              <InfoTip text="How serious the member or owner made the problem sound. 1 is a passing annoyance, 5 is a stated reason someone left or nearly left, as I read it." />
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
              <InfoTip text="I call it core fit when it's solvable by what TWU actually is, a community and connection layer (events, partner matching, chat, profiles), not booking or admin software. Partial fit means it can help around the edges. Not addressable means a staffing, coaching, pricing, or facility problem no connection layer touches." />
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

      <div style={{ margin: "28px 0 16px", fontSize: 14, color: "var(--ink-dim)", fontStyle: "italic" }}>
        Before you weight any of that too heavily, here's whose voice is actually behind it.
      </div>

      <div className="card" style={{ padding: 28, marginBottom: 24 }}>
        <div className="section-head" style={{ marginBottom: 0 }}>
          <div className="section-title">
            Who is actually talking
            <InfoTip text="Whether the finding comes from a gym owner describing what they observe, a member describing their own experience, a vendor, coach, or employee. I weight owner and member accounts very differently because of that." />
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

      <div style={{ margin: "28px 0 16px", fontSize: 14, color: "var(--ink-dim)", fontStyle: "italic" }}>
        Given all that, here's what gym owners say they've actually tried.
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

      <div style={{ margin: "28px 0 16px", fontSize: 14, color: "var(--ink-dim)", fontStyle: "italic" }}>
        One more angle before the receipts: has this been getting better or worse over time?
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
          <div className="section-title">The receipts</div>
          <div className="eyebrow muted">every finding above, individually. pain point to solution tried to outcome, check my work</div>
        </div>
        <div style={{ marginTop: -10, marginBottom: 18, fontSize: 13.5, color: "var(--ink-dim)" }}>
          If you've read this far, you've already seen the analysis. This is the raw material it's built on, searchable and filterable, with a link back to the original post on every row.
        </div>
        <FindingsTable findings={findings} filters={filters} onFiltersChange={setFilters} />
      </section>

      <div className="foot">
        Retention Research, I classified this from public Reddit discussions. Static build, not live-syncing, I'll refresh it when the next batch of communities is done.
      </div>
    </div>
  );
}
