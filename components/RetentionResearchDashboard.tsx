"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { StatTiles } from "@/components/Charts";
import { CommunitySelector } from "@/components/CommunitySelector";
import { PainPointStackedBars } from "@/components/PainPointStackedBars";
import { SeverityBars } from "@/components/SeverityBars";
import { AppRelevanceDonut } from "@/components/AppRelevanceDonut";
import { SolutionBars } from "@/components/SolutionBars";
import { PerspectiveBars } from "@/components/PerspectiveBars";
import { PriorityLeaderboard } from "@/components/PriorityLeaderboard";
import { PriorityMatrixTable } from "@/components/PriorityMatrixTable";
import { QuickWinsMatrix } from "@/components/QuickWinsMatrix";
import { OpportunityMap } from "@/components/OpportunityMap";
import { TimelineChart } from "@/components/TimelineChart";
import { FindingsTable, TableFilters } from "@/components/FindingsTable";
import { KeyTakeaways } from "@/components/KeyTakeaways";
import { RetentionGlossary } from "@/components/RetentionGlossary";
import { SectionInsight } from "@/components/SectionInsight";
import { InfoTip } from "@/components/InfoTip";
import { GapBarChart } from "@/components/GapBarChart";
import { CrossCommunityTable } from "@/components/CrossCommunityTable";
import { PainPointHeatmap } from "@/components/PainPointHeatmap";
import { DataCoverageTable } from "@/components/DataCoverageTable";
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
  combinedTakeaways,
} from "@/lib/combined-analysis";
import {
  CommunityDataset,
  AppRelevance,
  painPointBreakdown,
  painPointExamples,
  severityHistogram,
  appRelevanceBreakdown,
  solutionCategoryBreakdown,
  solutionExamples,
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
  solutionQuadrant,
  soWhatQuickWins,
  painPointLabel,
  solutionCategoryLabel,
  perspectiveLabel,
  APP_RELEVANCE_LABEL,
  communityCountNote,
  analyzedNote,
  relevantNote,
  NO_SOLUTION_KEY,
  PAIN_POINT_MEANING,
  latestQuarterIndex,
  isRecentFinding,
} from "@/lib/retention-research";

const EMPTY_FILTERS: TableFilters = { painPoint: "All", tier: "All", relevance: "All", solutionCategory: "All", severity: "All", perspective: "All", community: "All", recency: "All" };

export function RetentionResearchDashboard({
  communities,
  combined,
}: {
  communities: CommunityDataset[];
  combined: CommunityDataset;
}) {
  const options = [
    { id: "all", label: "All communities combined", count: combined.relevant_count, note: communityCountNote(combined) },
    ...communities.map((c) => ({ id: c.subreddit, label: c.label, count: c.relevant_count, note: communityCountNote(c) })),
  ];
  const [active, setActive] = useState("all");
  const [filters, setFilters] = useState<TableFilters>(EMPTY_FILTERS);
  const evidencePanelRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  const [scrollTrigger, setScrollTrigger] = useState(0);
  const [evidenceFromChart, setEvidenceFromChart] = useState(false);
  const [expandedEvidenceQuote, setExpandedEvidenceQuote] = useState<string | null>(null);
  const [showDeepDive, setShowDeepDive] = useState(false);
  const mapRef = useRef<HTMLDivElement | null>(null);

  const ds = useMemo(() => {
    if (active === "all") return combined;
    return communities.find((c) => c.subreddit === active) ?? combined;
  }, [active, communities, combined]);

  const findings = ds.findings;

  // "Last 12 months" scoping. filters.recency already exists to drive the
  // FindingsTable toggle; the cutoff itself needs to be one fixed point in
  // time shared by every tab and every chart, not recomputed per-view -
  // otherwise switching tabs could silently shift what "recent" means. The
  // full combined dataset (every community, not just whichever tab is
  // active) is the one thing guaranteed to contain the true latest quarter,
  // so it's the anchor regardless of which tab you're looking at.
  const globalLatestQuarter = useMemo(() => latestQuarterIndex(combined.findings), [combined]);
  const isRecencyScoped = filters.recency === "recent";
  const scopedFindings = useMemo(
    () => (isRecencyScoped ? findings.filter((f) => isRecentFinding(f, globalLatestQuarter)) : findings),
    [findings, isRecencyScoped, globalLatestQuarter]
  );
  // Same scoping applied per-community, for everything downstream that
  // reads communities[].findings directly (the cross-community table, the
  // gap chart, the community × pain-point map) rather than the single
  // active dataset - a chart built from communities has to see the same
  // trailing window as one built from scopedFindings, or "last 12 months"
  // would mean two different things on the same page.
  const scopedCommunities = useMemo(
    () =>
      isRecencyScoped
        ? communities.map((c) => ({ ...c, findings: c.findings.filter((f) => isRecentFinding(f, globalLatestQuarter)) }))
        : communities,
    [communities, isRecencyScoped, globalLatestQuarter]
  );

  const takeaways = useMemo(() => keyTakeaways({ ...ds, findings: scopedFindings }), [ds, scopedFindings]);
  const summary = useMemo(() => executiveSummary({ ...ds, findings: scopedFindings }), [ds, scopedFindings]);
  const painPoints = useMemo(() => painPointBreakdown(scopedFindings), [scopedFindings]);
  const painPointRefs = useMemo(() => painPointExamples(scopedFindings), [scopedFindings]);
  const severity = useMemo(() => severityHistogram(scopedFindings), [scopedFindings]);
  const appRel = useMemo(() => appRelevanceBreakdown(scopedFindings), [scopedFindings]);
  const solutions = useMemo(() => solutionCategoryBreakdown(scopedFindings), [scopedFindings]);
  const solutionRefs = useMemo(() => solutionExamples(scopedFindings), [scopedFindings]);
  const timeline = useMemo(() => timelineBreakdown(scopedFindings), [scopedFindings]);
  const tiers = useMemo(() => confidenceTierBreakdown(scopedFindings), [scopedFindings]);
  const perspective = useMemo(() => perspectiveBreakdown(scopedFindings), [scopedFindings]);
  const priority = useMemo(() => priorityMatrix(scopedFindings), [scopedFindings]);
  const headline = useMemo(() => priorityHeadline(priority), [priority]);
  const solutionsMentioned = scopedFindings.filter((f) => f.solution).length;
  const quickWins = useMemo(() => solutionQuadrant(scopedFindings), [scopedFindings]);
  const scoredSolutionsCount = scopedFindings.filter((f) => f.solution_category && f.solution_category !== "other" && f.difficulty != null && f.effectiveness != null).length;


  // Combined-tab-only comparison data. Computed unconditionally (hooks
  // can't be conditional) but only rendered when active === "all" - cheap
  // enough on this dataset size that gating the computation itself isn't
  // worth the complexity.
  const memberFindingsForRadar = useMemo(() => lensFindings(scopedCommunities, MEMBER_SUBREDDITS), [scopedCommunities]);
  const ownerFindingsForRadar = useMemo(() => lensFindings(scopedCommunities, OWNER_SUBREDDITS), [scopedCommunities]);
  const radarAxesData = useMemo(() => radarAxes(memberFindingsForRadar, ownerFindingsForRadar), [memberFindingsForRadar, ownerFindingsForRadar]);
  const radarNarrative = useMemo(
    () => radarSoWhat(radarAxesData, memberFindingsForRadar.length, ownerFindingsForRadar.length),
    [radarAxesData, memberFindingsForRadar.length, ownerFindingsForRadar.length]
  );
  const coverageRows = useMemo(() => crossCommunityPainPoints(scopedCommunities), [scopedCommunities]);
  const universalCount = coverageRows.filter((r) => r.universal).length;
  const coverageNarrative = useMemo(() => soWhatCoverage(coverageRows, communities.length), [coverageRows, communities.length]);
  const longTail = useMemo(() => longTailStats(scopedCommunities), [scopedCommunities]);
  const combinedNotes = useMemo(() => combinedTakeaways(radarAxesData, coverageRows, communities.length), [radarAxesData, coverageRows, communities.length]);
  const memberExamples = useMemo(() => painPointExamples(memberFindingsForRadar, 2), [memberFindingsForRadar]);
  const ownerExamples = useMemo(() => painPointExamples(ownerFindingsForRadar, 2), [ownerFindingsForRadar]);
  const activePainPointLabel = filters.painPoint !== "All" ? painPointLabel(filters.painPoint) : null;
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (activePainPointLabel && evidencePanelRef.current) {
      evidencePanelRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [scrollTrigger]);
  const selectCombinedPainPoint = (pp: string) => {
    setEvidenceFromChart(false);
    select("painPoint", pp);
  };
  // Only GapBarChart selections open the shared evidence panel and
  // page-jump to it. Cross-community pain points, Feature development,
  // and the heatmap all render their own evidence inline now (below or
  // near whatever you clicked), so opening the shared panel too would
  // show the exact same quotes twice on screen at once.
  const selectCombinedAxis = (label: string) => {
    const axis = radarAxesData.find((a) => a.label === label);
    if (axis) {
      setEvidenceFromChart(true);
      select("painPoint", axis.key);
      setScrollTrigger((t) => t + 1);
    }
  };
  // Community pill click sets both filters explicitly (not a toggle like
  // select()) - clicking r/f45 on the coaching-quality row should always
  // land on "coaching quality, r/f45", not sometimes clear it depending on
  // what was already selected.
  const selectCommunityAndPainPoint = (subreddit: string, pp: string) => {
    setEvidenceFromChart(false);
    setFilters((prev) => ({ ...prev, painPoint: pp, community: `r/${subreddit}` }));
  };
  const allCombinedFindings = useMemo(() => scopedCommunities.flatMap((c) => c.findings), [scopedCommunities]);
  const selectedCombinedRow = filters.painPoint !== "All" ? coverageRows.find((r) => r.pain_point === filters.painPoint) : null;
  const selectedCombinedFindings = useMemo(
    () => (filters.painPoint !== "All" ? allCombinedFindings.filter((f) => f.pain_point === filters.painPoint) : []),
    [allCombinedFindings, filters.painPoint]
  );
  const selectedRelevanceBreakdown = useMemo(() => appRelevanceBreakdown(selectedCombinedFindings), [selectedCombinedFindings]);
  const selectedTimeline = useMemo(() => timelineBreakdown(selectedCombinedFindings), [selectedCombinedFindings]);
  const memberCommunities = communities.filter((c) => MEMBER_SUBREDDITS.includes(c.subreddit));
  const ownerCommunities = communities.filter((c) => OWNER_SUBREDDITS.includes(c.subreddit));
  const topBuildable = [...coverageRows].sort((a, b) => b.buildableCount - a.buildableCount).slice(0, 6);
  const maxBuildable = Math.max(1, ...topBuildable.map((r) => r.buildableCount));
  const showCombinedExtras = ds.subreddit === "all" && communities.length > 1;
  const priorityCommunityBreakdown = useMemo(() => {
    if (!showCombinedExtras) return undefined;
    const map: Record<string, { subreddit: string; label: string; count: number }[]> = {};
    priority.forEach((p) => {
      map[p.pain_point] = scopedCommunities.map((c) => ({
        subreddit: c.subreddit,
        label: c.label,
        count: c.findings.filter((f) => f.pain_point === p.pain_point && f.app_relevance === "core_fit").length,
      }));
    });
    return map;
  }, [priority, scopedCommunities, showCombinedExtras]);

  const select = (key: keyof TableFilters, value: string | number) => {
    setFilters((prev) => (prev[key] === value ? { ...prev, [key]: "All" } : { ...prev, [key]: value }));
  };
  const clear = (key: keyof TableFilters) => setFilters((prev) => ({ ...prev, [key]: "All" }));

  const painPointMatches = filters.painPoint === "All" ? null : scopedFindings.filter((f) => f.pain_point === filters.painPoint);
  const severityMatches = filters.severity === "All" ? null : scopedFindings.filter((f) => f.pain_severity === filters.severity);
  const relevanceMatches = filters.relevance === "All" ? null : scopedFindings.filter((f) => f.app_relevance === filters.relevance);
  const solutionMatches =
    filters.solutionCategory === "All"
      ? null
      : filters.solutionCategory === NO_SOLUTION_KEY
      // "No Solution Mentioned" is a synthetic bucket computed from the
      // solution field being empty, not a real solution_category value in
      // the data - filtering by plain equality against it never matched
      // anything, which is why clicking that bar always came back empty.
      ? scopedFindings.filter((f) => !f.solution)
      : scopedFindings.filter((f) => f.solution_category === filters.solutionCategory);
  const perspectiveMatches = filters.perspective === "All" ? null : scopedFindings.filter((f) => (f.perspective || "unclear") === filters.perspective);

  const priorityActivePainPoint = filters.painPoint !== "All" && filters.relevance === "core_fit" ? filters.painPoint : null;
  const priorityMatches = priorityActivePainPoint
    ? scopedFindings.filter((f) => f.pain_point === priorityActivePainPoint && f.app_relevance === "core_fit")
    : null;
  const selectPriority = (pp: string) => {
    const isDeselecting = filters.painPoint === pp && filters.relevance === "core_fit";
    setFilters((prev) =>
      prev.painPoint === pp && prev.relevance === "core_fit"
        ? { ...prev, painPoint: "All", relevance: "All" }
        : { ...prev, painPoint: pp, relevance: "core_fit" }
    );
    setShowDeepDive(true);
    // "see evidence" is supposed to make the scatter plot mean something -
    // without this, picking a pain point from the leaderboard/table just
    // flips a "selected" label with the actual highlighted bubble sitting
    // off-screen above it. Double rAF waits for showDeepDive's re-render
    // (the map isn't even mounted yet on the first click) before scrolling.
    // Skipped when clearing a selection - nothing new to look at then.
    if (!isDeselecting) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          mapRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
      });
    }
  };

  return (
    <div className="wrap">
      <section style={{ padding: "48px 0 20px" }}>
        <div className="eyebrow" style={{ marginBottom: 14 }}>Retention Research</div>
        <div className="hero-sub">Why gym members actually leave, in their own words.</div>
        <div style={{ marginTop: 18, maxWidth: 640, color: "var(--ink-dim)", fontSize: 15, lineHeight: 1.6 }}>
          I went through every post and comment in {communities.length === 1 ? communities[0].label : `${communities.length} gym-and-fitness communities (${communities.map((c) => c.label).join(", ")})`} and pulled out the ones where someone actually says why a member walked, not general chatter, the specific complaints. Each community gets its own read, since they don't talk about retention the same way, plus a combined view. I'll flag where TWU's product can actually move the needle, and where it can't, separately, so those two things don't get mixed up.
        </div>
        <div style={{ marginTop: 24 }}>
          <CommunitySelector options={options} active={active} onChange={setActive} />
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: "var(--ink-dim)" }}>
          {communities.length === 1
            ? `"All communities combined" and "${communities[0].label}" are the same numbers right now, ${communities[0].label} is the only one I've classified so far. The selector's built to take more without a rebuild.`
            : "Switch between individual communities or the combined view above. Each community keeps its own native pain-point categories rather than being forced into another community's list, the combined view is a union of all of them, not a merge."}
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

      <section style={{ marginBottom: 24 }}>
        <StatTiles
          tiles={[
            { label: "Posts/comments analyzed", value: ds.total_analyzed, tone: "muted", note: analyzedNote(ds) },
            {
              label: isRecencyScoped ? "Relevant findings (last 12mo)" : "Relevant findings",
              value: isRecencyScoped ? scopedFindings.length : ds.relevant_count,
              tone: "amber",
              note: isRecencyScoped
                ? `${scopedFindings.length} of ${ds.relevant_count} total relevant findings fall in the trailing 12 months. Every chart, ranking, and stat below reflects this scoped count, not the full-history total.`
                : relevantNote(ds),
            },
            { label: "Strong confidence", value: tiers.strong, tone: "hot", note: `${tiers.moderate} moderate, ${tiers.weak} weak${isRecencyScoped ? ", within the scoped last-12-months set" : ""}. Strong/moderate/weak reflects how confident the reasoning is, not how severe the pain point is.` },
          ]}
        />
      </section>

      {!showCombinedExtras && (
        <>
          <div style={{ marginBottom: 16, fontSize: 14, color: "var(--ink-dim)", fontStyle: "italic" }}>
            Here's the retention picture on its own, no product angle yet, just what's actually driving people out.
          </div>
          {isRecencyScoped && (
            <div
              style={{
                marginBottom: 24,
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid var(--amber-deep)",
                background: "rgba(201,168,76,0.06)",
                fontSize: 12.5,
                color: "var(--amber)",
              }}
            >
              Scoped to the last 12 months: every chart below is computed from {scopedFindings.length} of {findings.length} total findings for {ds.label}. Clear "Last 12 months" in the findings table further down to see the full-history picture again.
            </div>
          )}

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
                examples={painPointRefs}
              />
            </div>
            <SectionInsight
              totalInView={scopedFindings.length}
              matches={painPointMatches}
              selectionLabel={filters.painPoint === "All" ? null : painPointLabel(filters.painPoint)}
              generalText={soWhatPainPoints(painPoints, scopedFindings.length)}
              onClear={() => clear("painPoint")}
            />
          </>
        ) : (
          <div style={{ color: "var(--ink-faint)", marginTop: 16 }}>No findings yet.</div>
        )}
      </div>

      <div className="card" style={{ padding: 28, marginBottom: 24 }}>
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
          totalInView={scopedFindings.length}
          matches={severityMatches}
          selectionLabel={filters.severity === "All" ? null : `Severity ${filters.severity}/5`}
          generalText={soWhatSeverity(severity, scopedFindings.length)}
          onClear={() => clear("severity")}
        />
      </div>

      <div style={{ margin: "28px 0 16px", fontSize: 14, color: "var(--ink-dim)", fontStyle: "italic" }}>
        Before you weight any of that too heavily, here's whose voice is actually behind it.
      </div>

      <div className="card" style={{ padding: 28, marginBottom: 24 }}>
        <div className="section-head" style={{ marginBottom: 0 }}>
          <div className="section-title">
            Who is actually talking
            <InfoTip text="Whether this finding comes from a gym owner describing what they observe, a member describing their own experience, a vendor, a coach, or an employee. Owner and member accounts carry different evidentiary weight, since owners are often reporting on member behavior secondhand." />
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
          totalInView={scopedFindings.length}
          matches={perspectiveMatches}
          selectionLabel={filters.perspective === "All" ? null : perspectiveLabel(filters.perspective)}
          generalText={soWhatPerspective(perspective, scopedFindings.length)}
          onClear={() => clear("perspective")}
        />
      </div>

      <div style={{ margin: "28px 0 16px", fontSize: 14, color: "var(--ink-dim)", fontStyle: "italic" }}>
        Given all that, here's what's actually been tried, by owners and members alike.
      </div>

      <div className="card" style={{ padding: 28, marginBottom: 24 }}>
        <div className="section-head" style={{ marginBottom: 0 }}>
          <div className="section-title">Solutions mentioned</div>
          <div className="eyebrow muted">{solutionsMentioned} of {scopedFindings.length} findings name one</div>
        </div>
        {solutions.length > 0 ? (
          <>
            <div style={{ marginTop: 22 }}>
              <SolutionBars
                rows={solutions}
                active={filters.solutionCategory === "All" ? null : filters.solutionCategory}
                onSelect={(s) => select("solutionCategory", s)}
                examples={solutionRefs}
              />
            </div>
            <SectionInsight
              totalInView={scopedFindings.length}
              matches={solutionMatches}
              selectionLabel={filters.solutionCategory === "All" ? null : solutionCategoryLabel(filters.solutionCategory)}
              generalText={soWhatSolutions(solutions, solutionsMentioned, scopedFindings.length)}
              onClear={() => clear("solutionCategory")}
            />
          </>
        ) : (
          <div style={{ color: "var(--ink-faint)", marginTop: 16 }}>No solutions surfaced yet.</div>
        )}
      </div>

      <div className="card" style={{ padding: 28, marginBottom: 24 }}>
        <div className="section-head" style={{ marginBottom: 0 }}>
          <div className="section-title">
            Quick wins
            <InfoTip text="Difficulty and effectiveness as reported in the source post, for solutions where both were mentioned. A different question than the priority matrix further down: not which pain point to target, but which specific fixes are cheap and actually worked." />
          </div>
          <div className="eyebrow muted">{scoredSolutionsCount} of {scopedFindings.length} findings score both</div>
        </div>
        <div style={{ marginTop: 10, fontSize: 12.5, color: "var(--ink-dim)" }}>
          Different question than the priority ranking further down: that one ranks which pain point to target, this one ranks which specific fixes are cheap to build and reportedly worked.
        </div>
        <div style={{ marginTop: 12 }}>
          <QuickWinsMatrix rows={quickWins} />
        </div>
        <div style={{ marginTop: 18, color: "var(--ink-dim)", fontSize: 13.5, lineHeight: 1.6 }}>
          <span style={{ color: "var(--ink-faint)", fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.06em", marginRight: 8 }}>
            MY READ:
          </span>
          {soWhatQuickWins(quickWins, scoredSolutionsCount, scopedFindings.length)}
        </div>
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
          totalInView={scopedFindings.length}
          matches={null}
          selectionLabel={null}
          generalText={soWhatTimeline(timeline)}
          onClear={() => {}}
        />
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Everything above is the retention picture on its own. Everything */}
      {/* below is me applying TWU's actual product to it, a separate,     */}
      {/* clearly-marked lens on the same data.                            */}
      {/* ---------------------------------------------------------------- */}
      <div
        style={{
          margin: "40px 0 28px",
          paddingTop: 28,
          borderTop: "1px solid var(--border)",
        }}
      >
        <div className="eyebrow" style={{ marginBottom: 10 }}>Now, the product angle</div>
        <div style={{ fontFamily: "var(--font-head)", fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
          That's retention on its own. Here's what TWU can actually do about it.
        </div>
        <div style={{ color: "var(--ink-dim)", fontSize: 14.5, lineHeight: 1.6, maxWidth: 660 }}>
          Everything above is the problem, independent of any product. From here on I'm applying one specific lens: what TWU (a community and connection layer, not booking or admin software) can actually fix, versus what's a staffing, coaching, or facility call no app touches.
        </div>
      </div>

      <div className="card" style={{ padding: 28, marginBottom: 24 }}>
        <div className="section-head" style={{ marginBottom: 0 }}>
          <div className="section-title">
            Can TWU actually fix it?
            <InfoTip text="I call it core fit when it's solvable by what TWU actually is, a community and connection layer (events, partner matching, chat, profiles), not booking or admin software. Partial fit means it can help around the edges. Not addressable means a staffing, coaching, pricing, or facility problem no connection layer touches. This judges fit against TWU's stated purpose, not against a verified list of what TWU has already built. A core fit finding may already be solved." />
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
          totalInView={scopedFindings.length}
          matches={relevanceMatches}
          selectionLabel={filters.relevance === "All" ? null : APP_RELEVANCE_LABEL[filters.relevance as AppRelevance]}
          generalText={soWhatAppRelevance(appRel, scopedFindings.length)}
          onClear={() => clear("relevance")}
          showReasoning
        />
      </div>

      <div className="card" style={{ padding: 28, marginBottom: 24 }}>
        <div className="section-head" style={{ marginBottom: 0 }}>
          <div className="section-title">
            Priority ranking
            <InfoTip text="Ranked by how many findings TWU can directly fix, weighted by how severe the problem is. High severity, directly buildable, mostly unsolved ranks at the top. Excludes the catch-all 'other' bucket." />
          </div>
        </div>
        <div style={{ marginTop: 10, fontSize: 12.5, color: "var(--ink-dim)" }}>
          According to {ds.subreddit === "all" ? "this combined" : `this ${ds.label}`} research analysis, this is how pain points rank by unresolved severity and how much TWU can address. This judges fit against TWU's stated purpose (community and connection), not against TWU's actual current feature set, which this research hasn't been checked against. A "core fit" finding may already be built. Read this as "worth checking against what TWU has today," not as a confirmed gap.
        </div>
        <div style={{ marginTop: 6, fontSize: 12.5, color: "var(--ink-dim)" }}>
          One thing we do know for certain (from TWU's own engagement API): chat/channels, events, member connections, and profiles are live features today. What we don't know is whether they already cover the specific pattern a given finding describes.
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
                  {painPointLabel(headline.pain_point)} ranks highest in this data.
                </div>
                <div style={{ color: "var(--ink-dim)", fontSize: 14 }}>{headline.sentence}</div>
              </div>
            )}

            <div style={{ marginTop: 22 }}>
              <PriorityLeaderboard rows={priority} active={priorityActivePainPoint} onSelect={selectPriority} />
            </div>

            <SectionInsight
              totalInView={scopedFindings.length}
              matches={priorityMatches}
              selectionLabel={priorityActivePainPoint ? `${painPointLabel(priorityActivePainPoint)}, core-fit only` : null}
              generalText={soWhatPriority(priority)}
              onClear={() => setFilters((prev) => ({ ...prev, painPoint: "All", relevance: "All" }))}
            />

            <button
              onClick={() => setShowDeepDive((v) => !v)}
              className="diagnostics-toggle"
              data-open={showDeepDive}
              style={{ marginTop: 22 }}
            >
              <span>{showDeepDive ? "Hide the full math" : "Show the full math, the scatter plot and sortable table behind this ranking"}</span>
              <span className="chev">&#9656;</span>
            </button>

            {showDeepDive && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 12.5, color: "var(--ink-dim)", marginBottom: 16 }}>
                  Same data as the leaderboard above, plotted so you can see how close the calls actually are, plus a sortable table with a confidence breakdown per pain point.
                </div>
                <div ref={mapRef}>
                  <OpportunityMap rows={priority} active={priorityActivePainPoint} onSelect={selectPriority} />
                </div>
                <div style={{ marginTop: 26, paddingTop: 22, borderTop: "1px solid var(--border-soft)" }}>
                  <PriorityMatrixTable rows={priority} activePainPoint={priorityActivePainPoint} onSelect={selectPriority} />
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ color: "var(--ink-faint)", marginTop: 16 }}>No findings yet.</div>
        )}
      </div>
        </>
      )}

      {showCombinedExtras && (
        <>
          <div
            style={{
              margin: "40px 0 28px",
              paddingTop: 28,
              borderTop: "1px solid var(--border)",
            }}
          >
            <div className="eyebrow" style={{ marginBottom: 10 }}>Member voice vs owner voice</div>
            <div style={{ fontFamily: "var(--font-head)", fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
              Two audiences, one product decision.
            </div>
            <div style={{ color: "var(--ink-dim)", fontSize: 14.5, lineHeight: 1.6, maxWidth: 700 }}>
              Everyone above gets pooled together, but they're not the same voice: f45, orangetheory, crossfit, and hyrox are overwhelmingly members describing their own experience ({memberFindingsForRadar.length} findings); gymowner is overwhelmingly owners describing their business ({ownerFindingsForRadar.length} findings). Here's those two lenses compared directly, plus what's universal versus community-specific across all {communities.length} communities.
            </div>
            <div style={{ marginTop: 14, maxWidth: 700, color: "var(--ink-faint)", fontSize: 12.5, lineHeight: 1.6 }}>
              Restricted to the 11 pain-point categories used consistently across communities. The raw data carries {longTail.totalLabels} distinct pain_point labels; {longTail.excludedLabels} of them ({longTail.excludedFindings} findings, {Math.round((longTail.excludedFindings / longTail.totalFindings) * 100)}% of the total) are one-off labels a single community's classification pass invented instead of reusing the shared taxonomy - mostly used once or twice each. Real findings, just not comparable across communities, so they're left out of this comparison specifically; each community's own tab above still shows them.
            </div>
            {isRecencyScoped && (
              <div
                style={{
                  marginTop: 16,
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid var(--amber-deep)",
                  background: "rgba(201,168,76,0.06)",
                  fontSize: 12.5,
                  color: "var(--amber)",
                  maxWidth: 700,
                }}
              >
                Scoped to the last 12 months: every chart, ranking, and table below this point is computed from {scopedFindings.length} of {findings.length} total findings. Clear "Last 12 months" in the findings table below to see the full-history picture again.
              </div>
            )}
          </div>

          <div className="card" style={{ padding: 28, marginBottom: 24 }}>
            <div className="section-head" style={{ marginBottom: 0 }}>
              <div className="section-title">
                Retention mentions over time
                <InfoTip text="Combined-tab timeline, pooled across every community - same underlying data as each community's own Timeline chart, just summed together. Toggle 'Last 12 months' in the findings table below to scope this (and every chart above the receipts) to the trailing year instead of the full history." />
              </div>
              <div className="eyebrow muted">findings by quarter, all communities pooled{isRecencyScoped ? " · scoped to last 12 months" : ""}</div>
            </div>
            <div style={{ marginTop: 22 }}>
              <TimelineChart rows={timeline} />
            </div>
            <div style={{ marginTop: 14, fontSize: 12, color: "var(--ink-faint)" }}>
              {soWhatTimeline(timeline)}
            </div>
          </div>

          <section style={{ marginBottom: 24 }}>
            <KeyTakeaways points={combinedNotes} title="Member vs. owner, before the radar" />
          </section>

          {(() => {
            const byGap = [...radarAxesData].sort((a, b) => Math.abs(b.memberPct - b.ownerPct) - Math.abs(a.memberPct - a.ownerPct));
            const memberLean = [...radarAxesData].sort((a, b) => (b.memberPct - b.ownerPct) - (a.memberPct - a.ownerPct))[0];
            const ownerLean = [...radarAxesData].sort((a, b) => (a.memberPct - a.ownerPct) - (b.memberPct - b.ownerPct))[0];
            return (
              <div className="card" style={{ padding: 28, marginBottom: 24 }}>
                <div className="section-head" style={{ marginBottom: 0 }}>
                  <div className="section-title">
                    Who talks about what: members vs owners
                    <InfoTip text="Each row is a pain-point category. Bar length is that category's share of the lens's own findings (not a raw count), so a small group and a large group are still comparable side by side. Sorted by the size of the gap between the two, biggest gap first." />
                  </div>
                  <div className="eyebrow muted">click a row for the evidence</div>
                </div>
                {byGap.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 20, marginBottom: 4 }}>
                    {memberLean && (
                      <div
                        onClick={() => selectCombinedAxis(memberLean.label)}
                        style={{ cursor: "pointer", padding: "16px 18px", borderRadius: 12, background: "linear-gradient(135deg, rgba(230,199,102,0.14), rgba(230,199,102,0.02))", border: "1px solid var(--series-a)" }}
                      >
                        <div style={{ fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: "0.08em", color: "var(--series-a)", marginBottom: 6 }}>MEMBERS SAY IT MOST</div>
                        <div style={{ fontFamily: "var(--font-head)", fontSize: 17, fontWeight: 700 }}>{memberLean.label}</div>
                        <div style={{ fontSize: 12.5, color: "var(--ink-dim)", marginTop: 4 }}>{memberLean.memberPct}% of member findings vs {memberLean.ownerPct}% of owner findings</div>
                      </div>
                    )}
                    {ownerLean && (
                      <div
                        onClick={() => selectCombinedAxis(ownerLean.label)}
                        style={{ cursor: "pointer", padding: "16px 18px", borderRadius: 12, background: "linear-gradient(135deg, rgba(91,147,214,0.14), rgba(91,147,214,0.02))", border: "1px solid var(--series-b)" }}
                      >
                        <div style={{ fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: "0.08em", color: "var(--series-b)", marginBottom: 6 }}>OWNERS SAY IT MOST</div>
                        <div style={{ fontFamily: "var(--font-head)", fontSize: 17, fontWeight: 700 }}>{ownerLean.label}</div>
                        <div style={{ fontSize: 12.5, color: "var(--ink-dim)", marginTop: 4 }}>{ownerLean.ownerPct}% of owner findings vs {ownerLean.memberPct}% of member findings</div>
                      </div>
                    )}
                  </div>
                )}
                <div style={{ marginTop: 22 }}>
                  <GapBarChart
                    axes={radarAxesData}
                    onSelect={selectCombinedAxis}
                    active={activePainPointLabel}
                    memberLabel={`Members (${memberFindingsForRadar.length} findings)`}
                    ownerLabel={`Owners (${ownerFindingsForRadar.length} findings)`}
                  />
                </div>
                <div style={{ marginTop: 18, fontSize: 14, lineHeight: 1.6, color: "var(--ink-dim)", maxWidth: 760 }}>{radarNarrative}</div>

                {activePainPointLabel && evidenceFromChart && (
                  <div ref={evidencePanelRef} style={{ marginTop: 24, paddingTop: 24, borderTop: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
                      <div className="eyebrow" style={{ color: "var(--amber)" }}>Evidence for: {activePainPointLabel}</div>
                      <button
                        onClick={() => clear("painPoint")}
                        style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 999, color: "var(--ink-dim)", fontFamily: "var(--mono)", fontSize: 10.5, padding: "4px 10px", cursor: "pointer" }}
                      >
                        CLEAR
                      </button>
                    </div>
                    {PAIN_POINT_MEANING[filters.painPoint] && (
                      <div style={{ fontSize: 14, color: "var(--ink)", lineHeight: 1.55, marginBottom: 18, maxWidth: 760 }}>
                        {PAIN_POINT_MEANING[filters.painPoint]}
                      </div>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                      <div style={{ padding: 16, borderRadius: 10, background: "var(--card-raised)", border: "1px solid var(--border-soft)" }}>
                        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-faint)", letterSpacing: "0.05em", marginBottom: 10 }}>SOURCE COMMUNITIES</div>
                        {selectedCombinedRow ? (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {selectedCombinedRow.communities.map((c) => (
                              <span
                                key={c.subreddit}
                                onClick={() => c.count > 0 && selectCommunityAndPainPoint(c.subreddit, filters.painPoint as string)}
                                style={{
                                  fontSize: 11.5,
                                  fontFamily: "var(--mono)",
                                  padding: "4px 10px",
                                  borderRadius: 999,
                                  border: `1px solid ${filters.community === `r/${c.subreddit}` ? "var(--amber)" : c.count > 0 ? "var(--border)" : "var(--border-soft)"}`,
                                  color: c.count > 0 ? "var(--ink)" : "var(--ink-faint)",
                                  background: filters.community === `r/${c.subreddit}` ? "rgba(201,168,76,0.12)" : c.count > 0 ? "var(--card)" : "transparent",
                                  cursor: c.count > 0 ? "pointer" : "default",
                                }}
                              >
                                {c.label}: {c.count}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <div style={{ padding: 16, borderRadius: 10, background: "var(--card-raised)", border: "1px solid var(--border-soft)" }}>
                        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-faint)", letterSpacing: "0.05em", marginBottom: 10 }}>CAN TWU FIX THIS?</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {selectedRelevanceBreakdown.map((a) => (
                            <div key={a.key} style={{ fontSize: 12.5, display: "flex", alignItems: "baseline", gap: 8 }}>
                              <span style={{ fontWeight: 700, fontSize: 16, color: a.key === "core_fit" ? "var(--hot)" : a.key === "partial_fit" ? "var(--amber)" : "var(--ink-faint)", minWidth: 24 }}>{a.count}</span>
                              <span style={{ color: "var(--ink-dim)" }}>
                                {a.key === "core_fit" && `findings TWU's product could directly address`}
                                {a.key === "partial_fit" && `findings TWU could help with around the edges, not solve outright`}
                                {a.key === "not_addressable" && `findings outside what a connection layer can fix (staffing, pricing, facility, etc.)`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div style={{ padding: 16, borderRadius: 10, background: "var(--card-raised)", border: "1px solid var(--border-soft)", marginBottom: 14 }}>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-faint)", letterSpacing: "0.05em", marginBottom: 10 }}>OVER TIME</div>
                      <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 44 }}>
                        {selectedTimeline.map(([q, count]) => {
                          const maxT = Math.max(1, ...selectedTimeline.map((t) => t[1]));
                          return (
                            <div key={q} title={`${q}: ${count}`} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
                              <div style={{ width: "100%", maxWidth: 14, background: "var(--series-a)", borderRadius: 2, height: `${Math.max(3, (count / maxT) * 100)}%` }} />
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 6 }}>
                        {selectedTimeline.length > 0 ? `${selectedTimeline[0][0]} through ${selectedTimeline[selectedTimeline.length - 1][0]}, ${selectedTimeline.reduce((s, t) => s + t[1], 0)} findings total` : "No dated findings"}
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                      <div style={{ padding: 16, borderRadius: 10, background: "var(--card-raised)", border: "1px solid var(--series-a)" }}>
                        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--series-a)", letterSpacing: "0.05em", marginBottom: 10 }}>WHAT MEMBERS SAY</div>
                        {memberExamples[filters.painPoint]?.length ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {memberExamples[filters.painPoint].map((ex, i) => {
                              const qKey = `member::${i}`;
                              const isQOpen = expandedEvidenceQuote === qKey;
                              return (
                                <div
                                  key={i}
                                  onClick={() => setExpandedEvidenceQuote((k) => (k === qKey ? null : qKey))}
                                  style={{ fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.55, padding: "8px 10px", borderRadius: 6, borderLeft: "2px solid var(--series-a)", background: isQOpen ? "var(--card)" : "transparent", cursor: "pointer" }}
                                >
                                  {isQOpen ? ex.reasoning : ex.short}
                                  {ex.evidence && (
                                    <div style={{ marginTop: 4, color: "var(--ink-faint)", fontStyle: "italic" }}>
                                      "{isQOpen || ex.evidence.length <= 140 ? ex.evidence : ex.evidence.slice(0, 140) + "…"}"
                                    </div>
                                  )}
                                  <div style={{ marginTop: 4, fontSize: 10.5, fontFamily: "var(--mono)", color: "var(--ink-faint)" }}>{isQOpen ? "tap to collapse" : "tap to read full"}</div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>No member findings in this category.</div>
                        )}
                      </div>
                      <div style={{ padding: 16, borderRadius: 10, background: "var(--card-raised)", border: "1px solid var(--series-b)" }}>
                        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--series-b)", letterSpacing: "0.05em", marginBottom: 10 }}>WHAT OWNERS SAY</div>
                        {ownerExamples[filters.painPoint]?.length ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {ownerExamples[filters.painPoint].map((ex, i) => {
                              const qKey = `owner::${i}`;
                              const isQOpen = expandedEvidenceQuote === qKey;
                              return (
                                <div
                                  key={i}
                                  onClick={() => setExpandedEvidenceQuote((k) => (k === qKey ? null : qKey))}
                                  style={{ fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.55, padding: "8px 10px", borderRadius: 6, borderLeft: "2px solid var(--series-b)", background: isQOpen ? "var(--card)" : "transparent", cursor: "pointer" }}
                                >
                                  {isQOpen ? ex.reasoning : ex.short}
                                  {ex.evidence && (
                                    <div style={{ marginTop: 4, color: "var(--ink-faint)", fontStyle: "italic" }}>
                                      "{isQOpen || ex.evidence.length <= 140 ? ex.evidence : ex.evidence.slice(0, 140) + "…"}"
                                    </div>
                                  )}
                                  <div style={{ marginTop: 4, fontSize: 10.5, fontFamily: "var(--mono)", color: "var(--ink-faint)" }}>{isQOpen ? "tap to collapse" : "tap to read full"}</div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>No owner findings in this category.</div>
                        )}
                      </div>
                    </div>
                    <div style={{ marginTop: 14, fontSize: 12, color: "var(--ink-faint)" }}>
                      {filters.community !== "All" ? `Filtered to ${filters.community}. ` : ""}Scroll down to "The receipts" for every individual finding, filtered automatically.
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          <div className="card" style={{ padding: 28, marginBottom: 24 }}>
            <div className="section-head" style={{ marginBottom: 0 }}>
              <div className="section-title">
                Cross-community pain points
                <InfoTip text="Every canonical pain-point category, and which of the live communities actually surface it. 'Universal' means it shows up in every single community, not just the biggest ones. For the buildable-volume ranking of the same categories, see Feature development ranking below - a distinct chart, not a re-sort of this one." />
              </div>
              <div className="eyebrow muted">tap a community pill to preview</div>
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: "var(--ink-dim)" }}>
              {universalCount} of {coverageRows.length} categories show up in every one of the {communities.length} communities.
            </div>
            <div style={{ marginTop: 22 }}>
              <CrossCommunityTable rows={coverageRows} communityCount={communities.length} sortBy="coverage" active={filters.painPoint === "All" ? null : (filters.painPoint as string)} onSelect={selectCombinedPainPoint} onSelectCommunity={selectCommunityAndPainPoint} communities={scopedCommunities} />
            </div>
            <div style={{ marginTop: 18, fontSize: 14, lineHeight: 1.6, color: "var(--ink-dim)", maxWidth: 760 }}>
              {coverageNarrative}
            </div>
          </div>

          <div className="card" style={{ padding: 28, marginBottom: 24 }}>
            <div className="section-head" style={{ marginBottom: 0 }}>
              <div className="section-title">
                Pain point × community map
                <InfoTip text="Every pain point against every live community, at once. This is the one view on this page that only exists because the data is pooled - no single community's own tab has anything to cross-reference against. Color is normalized per row so a smaller community's real signal doesn't just wash out next to a bigger one." />
              </div>
              <div className="eyebrow muted">click a lit cell to jump there</div>
            </div>
            <div style={{ marginTop: 22 }}>
              <PainPointHeatmap
                rows={coverageRows}
                communities={scopedCommunities}
                onSelectCell={selectCommunityAndPainPoint}
                activePainPoint={filters.painPoint === "All" ? null : (filters.painPoint as string)}
              />
            </div>
          </div>

          <div className="card" style={{ padding: 28, marginBottom: 24 }}>
            <div className="section-head" style={{ marginBottom: 0 }}>
              <div className="section-title">
                Feature development ranking
                <InfoTip text="Ranked purely by volume: how many buildable findings each pain point has, unweighted by severity or confidence. This answers 'what comes up the most.' Priority ranking further down answers a different question - 'what's worth building first' - by weighting the same buildable findings against how severe they are. The two lists can and do land in a different order; that's the point of having both." />
              </div>
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.6 }}>
              <strong>How this number is calculated:</strong> for each pain point, I count every finding across all {communities.length} communities where a classifier marked app_relevance as core_fit or partial_fit, then sum them. It is not weighted by severity or confidence tier - it's a raw count of "TWU could plausibly act on this." That's the one thing this ranking does that <strong>Priority ranking</strong> further down deliberately doesn't: Priority ranking takes this same buildable pool and re-sorts it by severity-weighted score instead of raw volume, so a smaller but nastier pain point can outrank a bigger but milder one there. Read this one for "what's talked about most," read Priority ranking for "what's worth building first." Click a row here to see exactly which solutions people tried for it and how well they reportedly worked.
            </div>
            <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 10 }}>
              {topBuildable.map((r, idx) => {
                const isActive = activePainPointLabel === r.label;
                const barColor = r.avgSeverityBuildable >= 3.5 ? "var(--bad)" : r.avgSeverityBuildable >= 2.5 ? "var(--amber)" : "var(--hot)";
                const matchingPriorityRow = priority.find((p) => p.pain_point === r.pain_point);
                const solutions = matchingPriorityRow?.solutions ?? [];
                const scored = solutions.filter((s) => s.avgEffectiveness != null && s.avgDifficulty != null);
                const totalMentions = scored.reduce((s, sol) => s + sol.count, 0);
                const avgEff = totalMentions > 0 ? scored.reduce((s, sol) => s + (sol.avgEffectiveness ?? 0) * sol.count, 0) / totalMentions : null;
                const avgDiff = totalMentions > 0 ? scored.reduce((s, sol) => s + (sol.avgDifficulty ?? 0) * sol.count, 0) / totalMentions : null;
                return (
                  <div
                    key={r.pain_point}
                    onClick={() => selectCombinedPainPoint(r.pain_point)}
                    title={`${r.label}: ${r.buildableCount} buildable findings across ${r.communities.filter((c) => c.count > 0).length} communities, avg severity ${r.avgSeverityBuildable.toFixed(1)}/5`}
                    style={{
                      cursor: "pointer",
                      padding: "16px 18px",
                      borderRadius: 12,
                      border: `1px solid ${isActive ? "var(--amber)" : "var(--border-soft)"}`,
                      background: isActive ? "rgba(201,168,76,0.06)" : "var(--card-raised)",
                    }}
                  >
                    <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                      <span
                        style={{
                          flexShrink: 0,
                          width: 26,
                          height: 26,
                          borderRadius: "50%",
                          background: "var(--muted)",
                          color: "var(--ink-dim)",
                          fontFamily: "var(--mono)",
                          fontSize: 12,
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {idx + 1}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{r.label}</span>
                          <span style={{ fontSize: 18, fontWeight: 800, color: barColor, fontFamily: "var(--font-head)", flexShrink: 0 }}>{r.buildableCount}</span>
                        </div>
                        <div style={{ height: 8, borderRadius: 4, background: "var(--muted)", overflow: "hidden" }}>
                          <div style={{ width: `${(r.buildableCount / maxBuildable) * 100}%`, height: "100%", background: barColor }} />
                        </div>
                        <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-faint)" }}>
                            avg severity <span style={{ color: barColor, fontWeight: 700 }}>{r.avgSeverityBuildable.toFixed(1)}/5</span>
                          </span>
                          {avgEff != null && (
                            <span style={{ fontSize: 11, fontFamily: "var(--mono)", padding: "2px 8px", borderRadius: 999, background: "rgba(127,201,138,0.12)", color: "var(--hot)" }}>
                              effectiveness {avgEff.toFixed(1)}/5
                            </span>
                          )}
                          {avgDiff != null && (
                            <span style={{ fontSize: 11, fontFamily: "var(--mono)", padding: "2px 8px", borderRadius: 999, background: "rgba(79,122,166,0.14)", color: "var(--cold)" }}>
                              difficulty {avgDiff.toFixed(1)}/5
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {isActive && matchingPriorityRow && matchingPriorityRow.solutions.length > 0 && (
                      <div style={{ marginTop: 14, marginLeft: 40, paddingLeft: 14, borderLeft: "2px solid var(--border)" }}>
                        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-faint)", letterSpacing: "0.05em", marginBottom: 8 }}>
                          SOLUTIONS TRIED FOR THIS, RANKED BY MENTIONS
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                          {matchingPriorityRow.solutions.slice(0, 4).map((s) => (
                            <div key={s.category} style={{ display: "flex", gap: 12, alignItems: "baseline", fontSize: 12.5, flexWrap: "wrap" }}>
                              <span style={{ color: "var(--ink)", fontWeight: 600, minWidth: 150 }}>{solutionCategoryLabel(s.category)}</span>
                              <span style={{ color: "var(--ink-dim)" }}>{s.count} mention{s.count === 1 ? "" : "s"}</span>
                              {s.avgEffectiveness != null ? (
                                <span style={{ color: "var(--hot)" }}>{s.avgEffectiveness.toFixed(1)}/5 effective</span>
                              ) : (
                                <span style={{ color: "var(--ink-faint)" }}>not yet scored</span>
                              )}
                              {s.avgDifficulty != null && <span style={{ color: "var(--cold)" }}>{s.avgDifficulty.toFixed(1)}/5 difficulty</span>}
                            </div>
                          ))}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                          <div>
                            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--series-a)", letterSpacing: "0.05em", marginBottom: 8 }}>WHAT MEMBERS SAY</div>
                            {memberExamples[r.pain_point]?.length ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {memberExamples[r.pain_point].slice(0, 3).map((ex, i) => (
                                  <EvidenceQuote key={i} ex={ex} color="var(--series-a)" />
                                ))}
                              </div>
                            ) : (
                              <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>No member findings in this category.</div>
                            )}
                          </div>
                          <div>
                            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--series-b)", letterSpacing: "0.05em", marginBottom: 8 }}>WHAT OWNERS SAY</div>
                            {ownerExamples[r.pain_point]?.length ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {ownerExamples[r.pain_point].slice(0, 3).map((ex, i) => (
                                  <EvidenceQuote key={i} ex={ex} color="var(--series-b)" />
                                ))}
                              </div>
                            ) : (
                              <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>No owner findings in this category.</div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 14, fontSize: 12, color: "var(--ink-faint)" }}>
              Ranked by buildable volume, bar color is average severity (<span style={{ color: "var(--hot)" }}>green under 2.5</span>, <span style={{ color: "var(--amber)" }}>amber 2.5-3.5</span>, <span style={{ color: "var(--bad)" }}>red 3.5+</span>). The effectiveness/difficulty badges are a weighted average across every solution people tried for that pain point, both on a 1-5 scale. Click any row to expand its solutions and pull up full evidence above.
            </div>
          </div>

          <div className="card" style={{ padding: 28, marginBottom: 24 }}>
            <div className="section-head" style={{ marginBottom: 0 }}>
              <div className="section-title">
                Priority ranking
                <InfoTip text="Ranked by how many findings TWU can directly fix, weighted by how severe the problem is, computed across every community's findings pooled together. High severity, directly buildable, mostly unsolved ranks at the top. Excludes the catch-all 'other' bucket and the long-tail non-canonical labels noted above. Different question from Feature development ranking above: that one sorts by raw buildable volume, this one sorts by volume × severity - a smaller but nastier problem can rank higher here than it did there." />
              </div>
            </div>
            <div style={{ marginTop: 10, fontSize: 12.5, color: "var(--ink-dim)" }}>
              This judges fit against TWU's stated purpose (community and connection), not against TWU's actual current feature set, which this research hasn't been checked against. A "core fit" finding may already be built. Read this as "worth checking against what TWU has today," not as a confirmed gap. If this ranking and Feature development ranking above disagree on the top pick, that's not an error - one's ranking by loudness, this one's ranking by loudness weighted by how much it hurts.
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
                      {painPointLabel(headline.pain_point)} ranks highest in this data.
                    </div>
                    <div style={{ color: "var(--ink-dim)", fontSize: 14 }}>{headline.sentence}</div>
                  </div>
                )}
                <div style={{ marginTop: 22 }}>
                  <PriorityLeaderboard rows={priority} active={priorityActivePainPoint} onSelect={selectPriority} communityBreakdown={priorityCommunityBreakdown} />
                </div>
                <SectionInsight
                  totalInView={scopedFindings.length}
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
        </>
      )}

      <section id="receipts" className="section">
        <div className="section-head">
          <div className="section-title">The receipts</div>
          <div className="eyebrow muted">every finding above, individually. pain point to solution tried to outcome, check my work</div>
        </div>
        <div style={{ marginTop: -10, marginBottom: 18, fontSize: 13.5, color: "var(--ink-dim)" }}>
          Every finding I used above, in raw form: searchable, filterable, and linked back to the original Reddit post so you can check any of it yourself.
        </div>
        <FindingsTable findings={findings} filters={filters} onFiltersChange={setFilters} latestQuarterOverride={globalLatestQuarter} />
      </section>

      <div className="foot">
        Retention Research, I classified this from public Reddit discussions. Static build, not live-syncing, I'll refresh it when the next batch of communities is done.
      </div>
    </div>
  );
}

// Small self-contained click-to-expand quote row, reused wherever a
// truncated "what X say" summary needs to reveal its full text without
// needing parent-level state for every single quote on the page.
function EvidenceQuote({ ex, color }: { ex: { reasoning: string; short: string; evidence: string | null }; color: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      onClick={() => setOpen((o) => !o)}
      style={{ fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.5, padding: "6px 8px", margin: "-6px -8px", borderRadius: 6, borderLeft: `2px solid ${color}`, background: open ? "var(--card)" : "transparent", cursor: "pointer" }}
    >
      {open ? ex.reasoning : ex.short}
      {ex.evidence && (
        <div style={{ marginTop: 3, color: "var(--ink-faint)", fontStyle: "italic" }}>
          "{open || ex.evidence.length <= 140 ? ex.evidence : ex.evidence.slice(0, 140) + "…"}"
        </div>
      )}
      <div style={{ marginTop: 3, fontSize: 10, fontFamily: "var(--mono)", color: "var(--ink-faint)" }}>{open ? "tap to collapse" : "tap to read full"}</div>
    </div>
  );
}
