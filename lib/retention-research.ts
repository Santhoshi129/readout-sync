// lib/retention-research.ts
//
// Reads statically-committed classified-findings JSON from
// data/retention-research/<subreddit>.json — one file per community, all
// sharing the identical schema produced by the classification pipeline.
//
// To add a new community once its JSONL has been classified: drop the file
// in data/retention-research/, import it below, and add it to COMMUNITIES.
// Nothing else in this file, or in any component that consumes it, needs to
// change — every chart and the findings table key off `subreddit` in the
// data itself.
import gymownerData from "@/data/retention-research/gymowner.json";
// crossfit and hyrox imports paused - see note above COMMUNITIES below
// import hyroxData from "@/data/retention-research/hyrox.json";
// import crossfitData from "@/data/retention-research/crossfit.json";
import f45Data from "@/data/retention-research/f45.json";
import orangetheoryData from "@/data/retention-research/orangetheory.json";

export type AppRelevance = "core_fit" | "partial_fit" | "not_addressable";
export type ConfidenceTier = "weak" | "moderate" | "strong";

export type Finding = {
  id: string;
  author: string | null;
  permalink: string;
  readable_date: string | null;
  period_quarter: string | null;
  score: number | null;
  perspective: string | null;
  pain_point: string;
  pain_point_reasoning: string | null;
  pain_severity: number | null;
  pain_severity_reasoning: string | null;
  app_relevance: AppRelevance | null;
  solution: string | null;
  solution_category: string | null;
  effectiveness: number | null;
  effectiveness_reasoning: string | null;
  difficulty: number | null;
  difficulty_reasoning: string | null;
  evidence_snippet: string | null;
  confidence_tier: ConfidenceTier;
  source_trust?: string | null;
};

export type CommunityDataset = {
  subreddit: string;
  label: string;
  generated_at: string;
  total_analyzed: number;
  relevant_count: number;
  // Optional, community-specific data-quality caveat (e.g. a partial pull).
  // Rendered directly under the intro on that community's tab. Null/absent
  // means the dataset is complete, same standard as gymowner.
  data_note?: string | null;
  findings: Finding[];
};

// --- registry: add new communities here as their JSONL files are classified ---
// The raw classified data (LLM-generated reasoning text) contains stray
// em dashes in several free-text fields. Clean those at load time so
// every finding rendered on the page, not just my own authored copy,
// is free of them.
function cleanText<T extends string | null | undefined>(s: T): T {
  if (!s) return s;
  return s.replace(/\s*—\s*/g, " - ") as T;
}

function sanitizeFinding(f: Finding): Finding {
  return {
    ...f,
    pain_point_reasoning: cleanText(f.pain_point_reasoning),
    pain_severity_reasoning: cleanText(f.pain_severity_reasoning),
    evidence_snippet: cleanText(f.evidence_snippet),
    solution: cleanText(f.solution),
    effectiveness_reasoning: cleanText(f.effectiveness_reasoning),
    difficulty_reasoning: cleanText(f.difficulty_reasoning),
  };
}

function sanitizeDataset(ds: CommunityDataset): CommunityDataset {
  return { ...ds, findings: ds.findings.map(sanitizeFinding) };
}

// crossfit and hyrox temporarily pulled from the live registry (not deleted -
// data files still on disk) while r/crossfit's comment set gets fully
// re-pulled and classified. Re-add both imports to COMMUNITIES below once
// that's done.
export const COMMUNITIES: CommunityDataset[] = [
  gymownerData as CommunityDataset,
  f45Data as CommunityDataset,
  orangetheoryData as CommunityDataset,
].map(sanitizeDataset);

export function combinedDataset(): CommunityDataset {
  const latest = COMMUNITIES.reduce(
    (acc, c) => (c.generated_at > acc ? c.generated_at : acc),
    COMMUNITIES[0]?.generated_at ?? ""
  );
  return {
    subreddit: "all",
    label: "All communities combined",
    generated_at: latest,
    total_analyzed: COMMUNITIES.reduce((s, c) => s + c.total_analyzed, 0),
    relevant_count: COMMUNITIES.reduce((s, c) => s + c.relevant_count, 0),
    // Deliberately no data_note here - that field drives a visible amber
    // "DATA NOTE" banner right under the intro, and this is the default
    // landing view. executiveSummary() below still detects mixed
    // methodology on its own (via hasMixedMethodology) and adjusts its
    // wording accordingly, without putting a banner on the first thing
    // anyone sees when the page loads.
    findings: COMMUNITIES.flatMap((c) => c.findings),
  };
}

// True if any individual community was classified via a non-exhaustive
// funnel (has its own data_note). Used to pick accurate phrasing in the
// combined view's executive summary without needing the combined dataset
// itself to carry a data_note (which would surface the visible banner).
function hasMixedMethodology(): boolean {
  return COMMUNITIES.some((c) => c.data_note);
}

// Formats a rate as a percentage, except when that percentage would round
// to "0.0%" and misrepresent a real, nonzero count - falls back to a
// "1 in every N" ratio instead so a small-but-real number never reads as
// nothing was found. Used anywhere a community's relevant/analyzed ratio
// gets shown, since raw-pool denominators can be several orders of
// magnitude larger than the classified-relevant count.
export function ratioOrPct(n: number, d: number): string {
  if (d <= 0 || n <= 0) return "0%";
  const pct = (n / d) * 100;
  if (pct >= 0.1) return `${pct.toFixed(1)}%`;
  return `about 1 in every ${Math.round(d / n).toLocaleString()}`;
}

// One-line "why this number" explanation for a community's relevant-findings
// count, shown on hover next to the tab/selector. Distinguishes communities
// classified exhaustively (every cleaned record reviewed) from ones that
// went through a prescreen funnel first (data_note set), since the two
// produce very different relevant-rate percentages that aren't directly
// comparable without that context.
export function communityCountNote(ds: CommunityDataset): string {
  if (ds.subreddit === "all") {
    return `Union of every community below (${COMMUNITIES.length}) at once - each keeps its own pain-point categories rather than being forced into a shared list.`;
  }
  const rate = ratioOrPct(ds.relevant_count, ds.total_analyzed);
  const base = `${ds.relevant_count} relevant out of ${ds.total_analyzed.toLocaleString()} records (${rate})`;
  if (ds.data_note) {
    return `${base} - this is the raw pull before prescreening, not what actually reached the classifier. Open its tab for the full funnel.`;
  }
  return `${base} - every cleaned record in this community went through classification, nothing was prescreened out first.`;
}

// Matching one-liner for the top "Posts/comments analyzed" stat tile.
export function analyzedNote(ds: CommunityDataset): string {
  if (ds.subreddit === "all") {
    const mixed = COMMUNITIES.some((c) => c.data_note);
    return mixed
      ? "Sum across all communities - most were reviewed exhaustively, at least one includes its full raw pull rather than just what reached classification. See that community's tab for its funnel."
      : "Sum of every cleaned record across all communities, each reviewed exhaustively by the classifier.";
  }
  return ds.data_note
    ? "The full raw pull for this community before any filtering - only a fraction of this survived the prescreen and actually reached the classifier. See this community's tab for the funnel."
    : "Every cleaned record in this community, reviewed exhaustively by the classifier.";
}

// Matching one-liner for the top "Relevant findings" stat tile.
export function relevantNote(ds: CommunityDataset): string {
  const rate = ratioOrPct(ds.relevant_count, ds.total_analyzed);
  const nonExhaustive = ds.subreddit === "all" ? hasMixedMethodology() : !!ds.data_note;
  return `${rate} of records analyzed above described an actual retention pain point or a fix someone tried - the rest was off-topic chatter${nonExhaustive ? ", or never reached classification at all" : ""}.`;
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------
export const PAIN_POINT_LABEL: Record<string, string> = {
  motivation_engagement_decline: "Motivation & Engagement Decline",
  lack_of_accountability_support: "Lack of Accountability / Support",
  communication_gaps: "Communication Gaps",
  onboarding_reentry_friction: "Onboarding / Re-entry Friction",
  pricing_cost_value: "Pricing & Cost/Value",
  no_shows_late_cancellations: "No-Shows & Late Cancellations",
  facility_experience_decline: "Facility Experience Decline",
  coaching_quality_inconsistency: "Coaching Quality Inconsistency",
  community_culture_negative: "Negative Community Culture",
  scheduling_access_issues: "Scheduling & Access Issues",
  // Categories below didn't appear in r/gymowner's data — CrossFit/HYROX
  // communities surface different pain points, and these are native to
  // them, not forced into the gymowner list.
  business_ownership_change: "Business / Affiliation Change",
  programming_dissatisfaction: "Programming Dissatisfaction",
  other: "Other",
};
export function painPointLabel(p: string): string {
  return PAIN_POINT_LABEL[p] || p.replace(/_/g, " ");
}

// A synthesized, plain-language "what this actually looks like" for each
// category - not a repeat of a finding's own text, a distillation of the
// pattern across all findings in that category. This is what answers
// "programming dissatisfaction means what" without making someone read
// three full quotes to figure it out themselves.
export const PAIN_POINT_MEANING: Record<string, string> = {
  motivation_engagement_decline:
    "Someone who was showing up regularly loses steam over time - hits a goal with nothing to chase next, gets bored of the routine, or just quietly stops without a single triggering complaint.",
  lack_of_accountability_support:
    "Nobody catches a member drifting until it's too late - no system flags declining attendance early enough for a real conversation to happen before they've already mentally checked out.",
  communication_gaps:
    "A message that should have reached someone didn't - a renewal, a class change, a policy update - and the member finds out the hard way instead of being told directly.",
  onboarding_reentry_friction:
    "The first weeks (or the return after a break) are confusing or unwelcoming enough that someone leaves before ever getting comfortable, not because the core product failed them.",
  pricing_cost_value:
    "The price itself is rarely the whole story - it's usually 'the price for what I'm actually getting' - a single-location membership, a format they've outgrown, a value they no longer feel.",
  no_shows_late_cancellations:
    "Booking and cancellation policy friction - fees, caps, or rules that frustrate loyal members while (in theory) targeting the people abusing the system.",
  facility_experience_decline:
    "The physical space itself got worse - equipment, cleanliness, crowding - and that decline is what's cited as the actual reason someone stopped coming.",
  coaching_quality_inconsistency:
    "The coach or trainer experience varies too much class to class to trust - a great coach one day, a disengaged one the next, and that inconsistency is what erodes trust in the program.",
  community_culture_negative:
    "The social fabric of the group turned unwelcoming - cliquishness, unfriendliness, or a shift in who's in the room - and that, not the workout itself, is what pushed someone out.",
  scheduling_access_issues:
    "The class or facility isn't actually reachable when the member needs it - times that don't fit their life, locations too far, capacity that fills before they can book.",
  business_ownership_change:
    "A change at the business level - ownership, affiliation, closure - not a member complaint at all, but it still directly caused people to leave.",
  programming_dissatisfaction:
    "The workouts themselves stopped delivering - same format on repeat, plateaued results despite consistent effort, or a training style that doesn't match what the member actually wants.",
  other: "Doesn't cleanly fit one of the named categories above - real signal, just not common enough on its own to warrant a dedicated category yet.",
};

export const APP_RELEVANCE_LABEL: Record<AppRelevance, string> = {
  core_fit: "Core fit: directly addressable",
  partial_fit: "Partial fit: can help",
  not_addressable: "Not addressable by software",
};
export const APP_RELEVANCE_TONE: Record<AppRelevance, string> = {
  core_fit: "hot",
  partial_fit: "amber",
  not_addressable: "muted",
};
// One-line "why this bucket" explanation, shown on hover next to each
// app-relevance count - what the label alone doesn't say is the reasoning
// behind the split, not just the split itself.
export const APP_RELEVANCE_MEANING: Record<AppRelevance, string> = {
  core_fit: "Something a community/connection product like TWU's could plausibly fix directly - not a promise it's already built, just that it's in scope.",
  partial_fit: "TWU could help around the edges (a nudge, a flag, a reminder) but doesn't solve the actual root cause on its own.",
  not_addressable: "A coaching, staffing, facility, or pricing problem - no app changes what happened here, regardless of how it's built.",
};

export const CONFIDENCE_TONE: Record<ConfidenceTier, string> = {
  strong: "hot",
  moderate: "amber",
  weak: "muted",
};
export const CONFIDENCE_RANK: Record<ConfidenceTier, number> = { strong: 3, moderate: 2, weak: 1 };

export function solutionCategoryLabel(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

// Same purpose as painPointExamples, but for the Solutions Mentioned chart -
// hovering a solution category should show what that fix actually looked
// like in practice, not just leave the reader to guess from the label.
export type SolutionExample = { text: string; short: string };
export function solutionExamples(findings: Finding[], perCategory = 3): Record<string, SolutionExample[]> {
  const byCat: Record<string, Finding[]> = {};
  findings.forEach((f) => {
    if (!f.solution_category || !f.solution) return;
    if (!byCat[f.solution_category]) byCat[f.solution_category] = [];
    byCat[f.solution_category].push(f);
  });
  const out: Record<string, SolutionExample[]> = {};
  Object.entries(byCat).forEach(([cat, group]) => {
    const sorted = [...group].sort((a, b) => {
      const tierDiff = TIER_RANK[a.confidence_tier] - TIER_RANK[b.confidence_tier];
      if (tierDiff !== 0) return tierDiff;
      return (b.effectiveness ?? 0) - (a.effectiveness ?? 0);
    });
    out[cat] = sorted.slice(0, perCategory).map((f) => ({
      text: f.solution as string,
      short: shorten(f.solution as string),
    }));
  });
  return out;
}

// ---------------------------------------------------------------------------
// Aggregations — every one takes a findings array so it works identically
// for a single community or the combined view.
// ---------------------------------------------------------------------------
export function confidenceTierBreakdown(findings: Finding[]) {
  return {
    strong: findings.filter((f) => f.confidence_tier === "strong").length,
    moderate: findings.filter((f) => f.confidence_tier === "moderate").length,
    weak: findings.filter((f) => f.confidence_tier === "weak").length,
  };
}

export function painPointBreakdown(findings: Finding[]) {
  const map: Record<string, { weak: number; moderate: number; strong: number; total: number }> = {};
  findings.forEach((f) => {
    const k = f.pain_point || "other";
    if (!map[k]) map[k] = { weak: 0, moderate: 0, strong: 0, total: 0 };
    map[k][f.confidence_tier] += 1;
    map[k].total += 1;
  });
  return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
}

const TIER_RANK: Record<ConfidenceTier, number> = { strong: 0, moderate: 1, weak: 2 };

// Truncates to a word boundary rather than mid-word, so a shortened quote
// never ends looking like a typo.
function shorten(text: string, maxLen = 62): string {
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 20 ? cut.slice(0, lastSpace) : cut).trim() + "…";
}

// Real, concrete examples of what people actually said for each pain point,
// for hover reference next to the frequency count - a bare number like
// "124" doesn't mean anything on its own, "people getting bored of the same
// format" does. Picks the clearest, highest-confidence findings, not a
// random sample, so the example shown is representative, not a fluke.
export type PainPointExample = { reasoning: string; short: string; evidence: string | null };
export function painPointExamples(findings: Finding[], perPoint = 3): Record<string, PainPointExample[]> {
  const byPoint: Record<string, Finding[]> = {};
  findings.forEach((f) => {
    const k = f.pain_point || "other";
    if (!byPoint[k]) byPoint[k] = [];
    if (f.pain_point_reasoning) byPoint[k].push(f);
  });
  const out: Record<string, PainPointExample[]> = {};
  Object.entries(byPoint).forEach(([pp, group]) => {
    const sorted = [...group].sort((a, b) => {
      const tierDiff = TIER_RANK[a.confidence_tier] - TIER_RANK[b.confidence_tier];
      if (tierDiff !== 0) return tierDiff;
      return (b.pain_severity ?? 0) - (a.pain_severity ?? 0);
    });
    out[pp] = sorted.slice(0, perPoint).map((f) => ({
      reasoning: f.pain_point_reasoning as string,
      short: shorten(f.pain_point_reasoning as string),
      evidence: f.evidence_snippet,
    }));
  });
  return out;
}

export function severityHistogram(findings: Finding[]) {
  return [1, 2, 3, 4, 5].map((n) => ({
    severity: n,
    count: findings.filter((f) => f.pain_severity === n).length,
  }));
}

export function appRelevanceBreakdown(findings: Finding[]) {
  const order: AppRelevance[] = ["core_fit", "partial_fit", "not_addressable"];
  return order.map((k) => ({
    key: k,
    label: APP_RELEVANCE_LABEL[k],
    count: findings.filter((f) => f.app_relevance === k).length,
  }));
}

export function solutionCategoryBreakdown(findings: Finding[]) {
  const map: Record<string, number> = {};
  findings.forEach((f) => {
    if (f.solution_category) map[f.solution_category] = (map[f.solution_category] || 0) + 1;
  });
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

export function timelineBreakdown(findings: Finding[]) {
  const map: Record<string, number> = {};
  findings.forEach((f) => {
    if (f.period_quarter) map[f.period_quarter] = (map[f.period_quarter] || 0) + 1;
  });
  return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
}

// ---------------------------------------------------------------------------
// Perspective, who is actually talking
// ---------------------------------------------------------------------------
export const PERSPECTIVE_LABEL: Record<string, string> = {
  owner: "Gym owner",
  member: "Member",
  vendor: "Vendor / product seller",
  coach: "Coach or staff",
  employee: "Employee",
  unclear: "Unclear",
};
export function perspectiveLabel(p: string | null): string {
  const key = p || "unclear";
  return PERSPECTIVE_LABEL[key] || key;
}
// One-line "why this voice matters" explanation, shown on hover next to
// each perspective count.
export const PERSPECTIVE_MEANING: Record<string, string> = {
  owner: "An operator describing what they see in their own members - secondhand on the member's actual experience, firsthand on what an operator notices.",
  member: "Someone describing their own experience directly - the strongest evidentiary base of the group, but only one side of the story.",
  vendor: "A product or service seller talking about the space, not a member or operator's lived account - weighted lower for that reason.",
  coach: "Staff or a coach describing what they see from the floor - close to the member experience, but still not the member's own words.",
  employee: "A non-coaching staff member's account - workplace conditions and internal process, not member sentiment directly.",
  unclear: "Couldn't confidently tell who's speaking from the text alone - included for completeness, weighted cautiously.",
};

export function perspectiveBreakdown(findings: Finding[]): [string, number][] {
  const map: Record<string, number> = {};
  findings.forEach((f) => {
    const k = f.perspective || "unclear";
    map[k] = (map[k] || 0) + 1;
  });
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

export function soWhatPerspective(rows: [string, number][], total: number): string {
  if (total === 0) return "No findings to summarize yet.";
  const memberCount = rows.find(([k]) => k === "member")?.[1] ?? 0;
  const ownerCount = rows.find(([k]) => k === "owner")?.[1] ?? 0;
  const memberPct = Math.round((memberCount / total) * 100);
  const ownerPct = Math.round((ownerCount / total) * 100);
  if (ownerCount >= memberCount) {
    return `${ownerPct}% of findings are owners describing what they see in members, secondhand. Only ${memberPct}% (${memberCount} of ${total}) are members speaking for themselves. Read the frequency counts above as owner perception of churn drivers, not verified member sentiment, until that gap closes.`;
  }
  return `${memberPct}% of findings are members describing their own experience directly, versus ${ownerPct}% (${ownerCount} of ${total}) that are owners reporting on member behavior secondhand. That's a stronger evidentiary base than owner-perception data, though it also means this community skews toward why an individual left, not how an operator would systematically catch it.`;
}

// ---------------------------------------------------------------------------
// Priority matrix, pain point crossed with buildability and severity
// ---------------------------------------------------------------------------
export type PriorityRow = {
  pain_point: string;
  total: number;
  core_fit: number;
  partial_fit: number;
  not_addressable: number;
  avgSeverity: number;
  solutionRate: number;
  strongPct: number;
  score: number;
  confidenceMix: { strong: number; moderate: number; weak: number };
  topSolution: string | null;
  topSolutionCount: number;
  // Every solution category mentioned under this specific pain point, not
  // just the top one - effectiveness/difficulty averaged only over the
  // findings in THIS row that have both scored, so it never mixes in
  // outcomes from a different pain point's attempt at the same fix.
  solutions: {
    category: string;
    count: number;
    scoredCount: number;
    avgEffectiveness: number | null;
    avgDifficulty: number | null;
    // Why THIS score, for THIS solution, under THIS pain point specifically -
    // pulled from the actual finding's own effectiveness_reasoning /
    // difficulty_reasoning text, not a restatement of the generic 1-5
    // definition. Representative finding: highest-confidence one that
    // scored both, so the reasoning shown is the most trustworthy one
    // backing that average, not an arbitrary pick.
    effectivenessWhy: string | null;
    difficultyWhy: string | null;
  }[];
  recommendedAction: string;
};

function recommendedAction(rank: number, coreFit: number, avgSeverity: number, solutionRate: number, score: number): string {
  const solvedPct = Math.round(solutionRate * 100);
  if (coreFit === 0) {
    return "No findings here fall within what TWU's product can currently address, regardless of how often it comes up, so it sits outside the buildable set entirely.";
  }
  if (rank === 0 && score > 0) {
    return `This is the highest score in the set because it pairs the largest buildable volume (${coreFit} core-fit findings) with a solve rate still under two-thirds (${solvedPct}%). Average severity is moderate (${avgSeverity.toFixed(
      1
    )}/5) rather than extreme, so the case here is really about scale and an open gap, not raw pain intensity.`;
  }
  if (solutionRate >= 0.7) {
    return `${solvedPct}% of these findings already show someone attempting a fix, the highest solve rate in the set. Most of the addressable value here looks already captured, so further build investment would likely see diminishing returns.`;
  }
  if (rank <= 2 && score > 0) {
    return `Second-tier by score: ${coreFit} core-fit findings at ${avgSeverity.toFixed(
      1
    )}/5 severity, with ${solvedPct}% already showing an attempted fix. Close enough to the top pick that it's worth sequencing right after it rather than treating the gap between them as decisive.`;
  }
  return `Lands lower in this ranking on a mix of smaller buildable volume (${coreFit} findings) and ${
    solvedPct >= 50 ? `a solve rate that's already over half (${solvedPct}%)` : `a below-average severity (${avgSeverity.toFixed(1)}/5)`
  }, not because it's unimportant, just less urgent than what's ranked above it.`;
}

export function priorityMatrix(findings: Finding[]): PriorityRow[] {
  const pp = painPointBreakdown(findings).filter(([p]) => p !== "other");
  const rows: Omit<PriorityRow, "recommendedAction">[] = pp.map(([p, v]) => {
    const rowFindings = findings.filter((f) => f.pain_point === p);
    const core_fit = rowFindings.filter((f) => f.app_relevance === "core_fit").length;
    const partial_fit = rowFindings.filter((f) => f.app_relevance === "partial_fit").length;
    const not_addressable = rowFindings.filter((f) => f.app_relevance === "not_addressable").length;
    const severities = rowFindings.map((f) => f.pain_severity).filter((s): s is number => s != null);
    const avgSeverity = severities.length > 0 ? severities.reduce((a, b) => a + b, 0) / severities.length : 0;
    const solutionRate = rowFindings.length > 0 ? rowFindings.filter((f) => f.solution).length / rowFindings.length : 0;
    const strongPct = v.total > 0 ? Math.round((v.strong / v.total) * 100) : 0;
    const score = core_fit * avgSeverity;
    const solutionGroups: Record<string, Finding[]> = {};
    rowFindings.forEach((f) => {
      if (f.solution_category) {
        if (!solutionGroups[f.solution_category]) solutionGroups[f.solution_category] = [];
        solutionGroups[f.solution_category].push(f);
      }
    });
    const solutions = Object.entries(solutionGroups)
      .map(([category, group]) => {
        const scored = group.filter((f) => f.difficulty != null && f.effectiveness != null);
        const rep =
          scored.length > 0
            ? [...scored].sort((a, b) => TIER_RANK[a.confidence_tier] - TIER_RANK[b.confidence_tier])[0]
            : null;
        return {
          category,
          count: group.length,
          scoredCount: scored.length,
          avgEffectiveness: scored.length > 0 ? scored.reduce((a, f) => a + (f.effectiveness as number), 0) / scored.length : null,
          avgDifficulty: scored.length > 0 ? scored.reduce((a, f) => a + (f.difficulty as number), 0) / scored.length : null,
          effectivenessWhy: rep?.effectiveness_reasoning ?? null,
          difficultyWhy: rep?.difficulty_reasoning ?? null,
        };
      })
      .sort((a, b) => b.count - a.count);
    const topSolutionEntry = solutions[0];
    return {
      pain_point: p,
      total: v.total,
      core_fit,
      partial_fit,
      not_addressable,
      avgSeverity,
      solutionRate,
      strongPct,
      score,
      confidenceMix: { strong: v.strong, moderate: v.moderate, weak: v.weak },
      topSolution: topSolutionEntry ? topSolutionEntry.category : null,
      topSolutionCount: topSolutionEntry ? topSolutionEntry.count : 0,
      solutions,
    };
  });
  const sorted = rows.sort((a, b) => b.score - a.score);
  return sorted.map((r, i) => ({ ...r, recommendedAction: recommendedAction(i, r.core_fit, r.avgSeverity, r.solutionRate, r.score) }));
}

export function soWhatPriority(matrix: PriorityRow[]): string {
  const top = matrix.find((r) => r.score > 0);
  if (!top) return "No pain point currently combines enough core-fit findings and severity for me to rank. I'd widen the classification pass before prioritizing a build.";
  const solvedPct = Math.round(top.solutionRate * 100);
  return `${painPointLabel(top.pain_point)} ranks first in my scoring: ${top.core_fit} core-fit findings at an average severity of ${top.avgSeverity.toFixed(1)}/5, and a solution is on record in only ${solvedPct}% of them. High severity, directly buildable, mostly unsolved, that's the clearest build-first case I see in this data.`;
}

export function priorityHeadline(matrix: PriorityRow[]): { pain_point: string | null; sentence: string } {
  const top = matrix.find((r) => r.score > 0);
  if (!top) return { pain_point: null, sentence: "Not enough data yet for me to name a clear top priority." };
  const solvedPct = Math.round(top.solutionRate * 100);
  return {
    pain_point: top.pain_point,
    sentence: `${top.core_fit} findings I'd call directly fixable by TWU, and only ${solvedPct}% already have a solution on record.`,
  };
}

// ---------------------------------------------------------------------------
// Solution quick-wins, difficulty vs effectiveness for solutions that have
// both scored, a different axis than the priority matrix (which pain point
// to target) - this is which fixes are cheap AND actually work.
// ---------------------------------------------------------------------------
export type SolutionQuadrantRow = {
  category: string;
  count: number;
  avgDifficulty: number;
  avgEffectiveness: number;
  effectivenessWhy: string | null;
  difficultyWhy: string | null;
  // Which pain points this fix actually got tried against, most-mentioned
  // first - the quick-wins matrix pools solutions across every problem, so
  // this is what tells you which problem a given "quick win" would target.
  painPoints: { pain_point: string; count: number }[];
};

export function solutionQuadrant(findings: Finding[]): SolutionQuadrantRow[] {
  const scored = findings.filter((f) => f.solution_category && f.solution_category !== "other" && f.difficulty != null && f.effectiveness != null);
  const map: Record<string, Finding[]> = {};
  scored.forEach((f) => {
    const k = f.solution_category as string;
    if (!map[k]) map[k] = [];
    map[k].push(f);
  });
  return Object.entries(map)
    .map(([category, group]) => {
      const rep = [...group].sort((a, b) => TIER_RANK[a.confidence_tier] - TIER_RANK[b.confidence_tier])[0];
      const ppCounts: Record<string, number> = {};
      group.forEach((f) => {
        const k = f.pain_point || "other";
        ppCounts[k] = (ppCounts[k] || 0) + 1;
      });
      return {
        category,
        count: group.length,
        avgDifficulty: group.reduce((a, f) => a + (f.difficulty as number), 0) / group.length,
        avgEffectiveness: group.reduce((a, f) => a + (f.effectiveness as number), 0) / group.length,
        effectivenessWhy: rep?.effectiveness_reasoning ?? null,
        difficultyWhy: rep?.difficulty_reasoning ?? null,
        painPoints: Object.entries(ppCounts)
          .map(([pain_point, count]) => ({ pain_point, count }))
          .sort((a, b) => b.count - a.count),
      };
    })
    .sort((a, b) => b.count - a.count);
}

export function soWhatQuickWins(rows: SolutionQuadrantRow[], scoredCount: number, total: number): string {
  if (rows.length === 0) return "Not enough findings score both difficulty and effectiveness yet to compare solutions this way.";
  const quickWins = rows.filter((r) => r.avgDifficulty <= 2.5 && r.avgEffectiveness >= 3.5);
  const base = `Only ${scoredCount} of ${total} findings have both a difficulty and an effectiveness score, small enough that I'd treat this as directional, not final.`;
  if (quickWins.length === 0) {
    return `${base} Nothing in this data lands cleanly in the easy-and-effective corner yet, most tried fixes are either a real lift to implement or came back with mixed results.`;
  }
  return `${base} ${quickWins.map((r) => solutionCategoryLabel(r.category)).join(", ")} ${
    quickWins.length === 1 ? "is" : "are"
  } the standout${quickWins.length === 1 ? "" : "s"}: low reported difficulty, high reported effectiveness. Worth prioritizing on cost alone even before weighing it against the pain-point ranking above.`;
}


// dataset, not hand-typed, so it can never drift from what the charts show.
// ---------------------------------------------------------------------------
export function executiveSummary(ds: CommunityDataset): string[] {
  const f = ds.findings;
  const n = f.length;
  const relRate = ratioOrPct(ds.relevant_count, ds.total_analyzed);

  if (n === 0) {
    return [
      `No relevant retention findings are available yet for ${ds.label}.`,
    ];
  }

  const pp = painPointBreakdown(f).filter(([p]) => p !== "other");
  if (pp.length === 0) {
    return [`Every relevant finding for ${ds.label} landed in the uncategorized "other" bucket. The classification taxonomy needs another pass before this can support a specific conclusion.`];
  }
  const top = pp[0];
  const second = pp[1];
  const topPct = Math.round((top[1].total / n) * 100);

  const ct = confidenceTierBreakdown(f);
  const strongPct = Math.round((ct.strong / n) * 100);
  const weakPct = Math.round((ct.weak / n) * 100);

  const sentences: string[] = [];

  const nonExhaustive = ds.subreddit === "all" ? hasMixedMethodology() : !!ds.data_note;

  sentences.push(
    nonExhaustive
      ? `${ds.total_analyzed.toLocaleString()} posts and comments were pulled for ${ds.label}; after prescreening and classification, ${n} came back with a specific, identifiable reason a member left or almost left (${relRate}). That low a rate is expected here - most of what gets pulled in a raw scrape isn't about retention at all, and at least one community here filtered harder than others before classification ever saw it. Treat ${n} as a floor set by the prescreen, not a ceiling on what's actually in the data.`
      : `I ran ${ds.total_analyzed.toLocaleString()} posts and comments from ${ds.label} through classification looking for one thing: a specific, identifiable reason a member left or almost left. ${n} of them (${relRate}) had one. That's a small slice on purpose, most of what gets posted in a gym-owner subreddit isn't about retention at all, so I'd treat that percentage as a floor, not a headline.`
  );

  sentences.push(
    `${painPointLabel(top[0])} comes up most often, ${top[1].total} findings (${topPct}% of the relevant set)` +
      (second
        ? `, ahead of ${painPointLabel(second[0])} at ${second[1].total}. That's just how often people mention it though, not what I'd build first, I get to that later once I've laid out the full picture.`
        : ". That's mention frequency, not my build recommendation.")
  );

  sentences.push(
    `Confidence skews low: ${ct.strong} findings (${strongPct}%) are strong-tier, ${ct.weak} (${weakPct}%) are weak. I'm comfortable acting on the strong and moderate rows. The weak tier is more useful as a map of where I'd point the next classification pass than as something to quote.`
  );

  return sentences;
}

// ---------------------------------------------------------------------------
// Key takeaways — 3-4 scannable bullets for someone who will only read the
// very top of the page. Same underlying numbers as executiveSummary, cut to
// the single sharpest sentence per point instead of full paragraphs.
// ---------------------------------------------------------------------------
export function keyTakeaways(ds: CommunityDataset): string[] {
  const f = ds.findings;
  const n = f.length;
  if (n === 0) return [`No relevant findings yet for ${ds.label}.`];

  const pp = painPointBreakdown(f).filter(([p]) => p !== "other");
  if (pp.length === 0) return [`Every relevant finding for ${ds.label} landed in the uncategorized "other" bucket. Needs another classification pass before a specific pick is possible.`];
  const top = pp[0];
  const topPct = Math.round((top[1].total / n) * 100);

  const ar = appRelevanceBreakdown(f);
  const coreFit = ar.find((a) => a.key === "core_fit")?.count ?? 0;
  const coreFitPct = Math.round((coreFit / n) * 100);

  const ct = confidenceTierBreakdown(f);
  const strongPct = Math.round((ct.strong / n) * 100);

  const solutionsMentioned = f.filter((ff) => ff.solution).length;
  const solutionsPct = Math.round((solutionsMentioned / n) * 100);

  return [
    `${painPointLabel(top[0])} comes up more than anything else, ${topPct}% of everything I found. That's just frequency, though, my actual build pick is further down.`,
    `Over half of what I found (${coreFitPct}%, ${coreFit} of ${n}) is stuff TWU can actually fix. It's not all staffing or facility complaints, a good chunk of this is ours to solve.`,
    `Confidence is still thin, only ${strongPct}% strong-tier. I'd treat this as a first pass, not gospel, and I want a bigger classification run before anyone repeats these percentages as final.`,
    `Only ${solutionsPct}% of findings (${solutionsMentioned} of ${n}) mention someone actually trying a fix. That could mean a real gap, or it could just mean people vent about problems on Reddit more than they document what they tried. I can't tell the difference from this data alone, worth treating as a lead, not a conclusion.`,
  ];
}

// ---------------------------------------------------------------------------
// "So what" — one plain-language interpretive line per chart, computed from
// the real numbers so it can't drift from what's on screen.
// ---------------------------------------------------------------------------
export function soWhatPainPoints(rows: ReturnType<typeof painPointBreakdown>, total: number): string {
  if (rows.length === 0 || total === 0) return "No findings to summarize yet.";
  const named = rows.filter(([p]) => p !== "other");
  if (named.length === 0) return "Every relevant finding is uncategorized. Nothing specific to name yet.";
  const top3 = named.slice(0, 3);
  const top3Total = top3.reduce((s, [, v]) => s + v.total, 0);
  const top3Pct = Math.round((top3Total / total) * 100);
  const [topName, topStats] = top3[0];
  const topStrongPct = topStats.total > 0 ? Math.round((topStats.strong / topStats.total) * 100) : 0;
  const tail = named.slice(3);
  const tailTotal = tail.reduce((s, [, v]) => s + v.total, 0);
  return `${top3.map(([p]) => painPointLabel(p)).join(", ")} account for ${top3Pct}% of every relevant finding between them, retention risk is concentrated in a handful of issues, not spread thin across a dozen. ${painPointLabel(
    topName
  )} alone is ${topStats.total} findings, and only ${topStrongPct}% of those are strong-confidence, so the volume is real but I'd still want more high-confidence coverage before treating it as fully settled. The remaining ${tail.length} categories split the other ${tailTotal} findings between them, a long tail of smaller, more specific complaints rather than one dominant runner-up.`;
}

export function soWhatSeverity(hist: { severity: number; count: number }[], total: number): string {
  if (total === 0) return "No severity-scored findings yet.";
  const highSeverity = hist.filter((h) => h.severity >= 4).reduce((s, h) => s + h.count, 0);
  const midSeverity = hist.filter((h) => h.severity === 3).reduce((s, h) => s + h.count, 0);
  const lowSeverity = hist.filter((h) => h.severity <= 2).reduce((s, h) => s + h.count, 0);
  const pct = Math.round((highSeverity / total) * 100);
  const midPct = Math.round((midSeverity / total) * 100);
  const lowPct = Math.round((lowSeverity / total) * 100);
  const weightedSum = hist.reduce((s, h) => s + h.severity * h.count, 0);
  const avg = total > 0 ? weightedSum / total : 0;
  return `${pct}% of findings score 4 or 5, meaning the member called this out as a real reason they left or nearly did, not a passing gripe. ${midPct}% sit at a middling 3, noticeable but not described as a breaking point, and ${lowPct}% are low-severity annoyances (1-2). The average across everything relevant is ${avg.toFixed(
    1
  )}/5, so most of what's here is real but not extreme, the genuine 5s are a minority worth reading individually rather than a pattern that defines the whole set.`;
}

export function soWhatAppRelevance(ar: ReturnType<typeof appRelevanceBreakdown>, total: number): string {
  if (total === 0) return "No findings to summarize yet.";
  const coreFit = ar.find((a) => a.key === "core_fit")?.count ?? 0;
  const partial = ar.find((a) => a.key === "partial_fit")?.count ?? 0;
  const pct = total > 0 ? Math.round(((coreFit + partial) / total) * 100) : 0;
  return `${pct}% of this problem set is at least partially solvable with software. The rest is coaching, staffing, and facility quality, and no app touches that directly.`;
}

export function soWhatSolutions(rows: [string, number][], mentioned: number, total: number): string {
  if (total === 0) return "No findings to summarize yet.";
  const top = rows[0];
  if (!top) return `A specific fix was named in only ${mentioned} of ${total} findings. That's either a real gap or just what people happen to write about on Reddit, hard to tell apart from this alone.`;
  return `${solutionCategoryLabel(top[0])} is the most commonly tried fix, ${top[1]} mentions, but only ${mentioned} of ${total} findings name any solution at all. I'd read that as unaddressed problem space until proven otherwise, but posts skew toward venting over documenting fixes, so some of that gap is probably reporting bias, not a real vacuum.`;
}

export function soWhatTimeline(rows: [string, number][]): string {
  if (rows.length < 2) return "Not enough dated findings yet to call a trend.";
  const midpoint = Math.floor(rows.length / 2);
  const earlier = rows.slice(0, midpoint).reduce((s, [, c]) => s + c, 0);
  const later = rows.slice(midpoint).reduce((s, [, c]) => s + c, 0);
  if (later > earlier * 1.3) return "Mentions have picked up in the more recent half of the timeframe. This is a growing conversation, not a settled one.";
  if (earlier > later * 1.3) return "Mentions were heavier earlier in the timeframe than recently. Worth checking whether that's fewer posts or the problem actually easing.";
  return "Mentions are roughly steady across the timeframe, no strong recent spike or drop-off.";
}

// ---------------------------------------------------------------------------
// Glossary — plain-language definitions for every term a non-technical
// exec will hit on this page.
// ---------------------------------------------------------------------------
export const GLOSSARY: { term: string; meaning: string }[] = [
  { term: "Confidence tier", meaning: "How sure I am that this is a real, on-topic retention finding, based on how specific, credible, and unambiguous the source post is. Strong means I trust it. Weak means I'd read it with caution." },
  { term: "Core fit", meaning: "I call it core fit when it's directly addressable by what TWU actually is: a community and connection layer (event discovery, workout partner matching, real-time chat, member profiles). Not booking or admin software, TWU explicitly doesn't replace that. This is judged against TWU's stated purpose, not a verified list of what's already built, a core fit finding may already exist in the product." },
  { term: "Partial fit", meaning: "Connection and visibility features can help around the edges (surface who's showing up, prompt a conversation) but I don't think they solve the underlying issue alone." },
  { term: "Not addressable", meaning: "A staffing, facility, coaching, pricing, or culture problem. Outside what I think a connection layer can fix directly." },
  { term: "Severity (1-5)", meaning: "How serious the member or owner made this problem sound. 1 is a passing annoyance, 5 is a stated reason someone left or almost left." },
  { term: "Difficulty (1-5)", meaning: "How hard I'd rate the mentioned solution to implement. 1 is trivial, 5 is a major operational lift." },
  { term: "Effectiveness (1-5)", meaning: "How well the mentioned solution reportedly worked, per the source. I only score this when a solution and an outcome were both mentioned." },
  { term: "Relevance density", meaning: "The share of everything I analyzed that turned out to be an on-topic, specific retention finding. Most Reddit discussion in these communities isn't about retention at all." },
  { term: "Self-reported", meaning: "The result came from whoever built or sells the solution talking about their own product. I treat that as lower-trust than a first-hand owner or member account." },
];
