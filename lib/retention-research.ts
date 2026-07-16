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
  findings: Finding[];
};

// --- registry: add new communities here as their JSONL files are classified ---
export const COMMUNITIES: CommunityDataset[] = [gymownerData as CommunityDataset];

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
    findings: COMMUNITIES.flatMap((c) => c.findings),
  };
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
  other: "Other",
};
export function painPointLabel(p: string): string {
  return PAIN_POINT_LABEL[p] || p.replace(/_/g, " ");
}

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

export const CONFIDENCE_TONE: Record<ConfidenceTier, string> = {
  strong: "hot",
  moderate: "amber",
  weak: "muted",
};
export const CONFIDENCE_RANK: Record<ConfidenceTier, number> = { strong: 3, moderate: 2, weak: 1 };

export function solutionCategoryLabel(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
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
  return `${ownerPct}% of findings are owners describing what they see in members, secondhand. Only ${memberPct}% (${memberCount} of ${total}) are members speaking for themselves. Read the frequency counts above as owner perception of churn drivers, not verified member sentiment, until that gap closes.`;
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
  recommendedAction: string;
};

function recommendedAction(rank: number, coreFit: number, solutionRate: number, score: number): string {
  if (coreFit === 0) return "Not a build target. No core-fit findings in this category.";
  if (rank === 0 && score > 0) return "Build first. The strongest combination of severity, buildable volume, and unsolved gap in this data.";
  if (solutionRate >= 0.7) return `Largely solved already, ${Math.round(solutionRate * 100)}% of findings mention a fix. Low marginal value in building more here.`;
  if (rank <= 2 && score > 0) return "Strong candidate. Sequence this right after the #1 pick above.";
  return "Lower priority relative to the rest of this list, either lighter severity, smaller buildable volume, or partly addressed already.";
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
    const solutionCounts: Record<string, number> = {};
    rowFindings.forEach((f) => {
      if (f.solution_category) solutionCounts[f.solution_category] = (solutionCounts[f.solution_category] || 0) + 1;
    });
    const topSolutionEntry = Object.entries(solutionCounts).sort((a, b) => b[1] - a[1])[0];
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
      topSolution: topSolutionEntry ? topSolutionEntry[0] : null,
      topSolutionCount: topSolutionEntry ? topSolutionEntry[1] : 0,
    };
  });
  const sorted = rows.sort((a, b) => b.score - a.score);
  return sorted.map((r, i) => ({ ...r, recommendedAction: recommendedAction(i, r.core_fit, r.solutionRate, r.score) }));
}

export function soWhatPriority(matrix: PriorityRow[]): string {
  const top = matrix.find((r) => r.score > 0);
  if (!top) return "No pain point currently combines enough core-fit findings and severity for me to rank. I'd widen the classification pass before prioritizing a build.";
  const solvedPct = Math.round(top.solutionRate * 100);
  return `${painPointLabel(top.pain_point)} ranks first in my scoring: ${top.core_fit} core-fit findings at an average severity of ${top.avgSeverity.toFixed(1)}/5, and a solution is on record in only ${solvedPct}% of them. High severity, directly buildable, mostly unsolved, that's the clearest build-first case I see in this data.`;
}

export function priorityHeadline(matrix: PriorityRow[]): { pain_point: string | null; sentence: string } {
  const top = matrix.find((r) => r.score > 0);
  if (!top) return { pain_point: null, sentence: "Not enough data yet for me to name a clear build-first pick." };
  const solvedPct = Math.round(top.solutionRate * 100);
  return {
    pain_point: top.pain_point,
    sentence: `${top.core_fit} findings I'd call directly fixable by TWU, and only ${solvedPct}% already have a solution on record.`,
  };
}

// ---------------------------------------------------------------------------
// Executive summary, computed from the real numbers in the selected
// dataset, not hand-typed, so it can never drift from what the charts show.
// ---------------------------------------------------------------------------
export function executiveSummary(ds: CommunityDataset): string[] {
  const f = ds.findings;
  const n = f.length;
  const relDensity = ds.total_analyzed > 0 ? (ds.relevant_count / ds.total_analyzed) * 100 : 0;

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

  sentences.push(
    `I ran ${ds.total_analyzed.toLocaleString()} posts and comments from ${ds.label} through classification looking for one thing: a specific, identifiable reason a member left or almost left. ${n} of them (${relDensity.toFixed(
      1
    )}%) had one. That's a small slice on purpose, most of what gets posted in a gym-owner subreddit isn't about retention at all, so I'd treat that percentage as a floor, not a headline.`
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
    `Only ${solutionsPct}% of findings (${solutionsMentioned} of ${n}) mention someone actually trying a fix. Most owners are just naming the problem. That's the gap worth building into.`,
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
  return `${top3.map(([p]) => painPointLabel(p)).join(", ")} account for ${top3Pct}% of every relevant finding. Retention risk is concentrated in a handful of issues, not spread thin across a dozen.`;
}

export function soWhatSeverity(hist: { severity: number; count: number }[], total: number): string {
  if (total === 0) return "No severity-scored findings yet.";
  const highSeverity = hist.filter((h) => h.severity >= 4).reduce((s, h) => s + h.count, 0);
  const pct = Math.round((highSeverity / total) * 100);
  return `${pct}% of findings score 4 or 5 on severity, meaning the member called this out as a real reason they left or nearly did, not a passing gripe.`;
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
  if (!top) return `A specific fix was named in only ${mentioned} of ${total} findings. Owners are describing the problem, not a solution they tried.`;
  return `${solutionCategoryLabel(top[0])} is the most commonly tried fix, ${top[1]} mentions, but only ${mentioned} of ${total} findings name any solution at all. Most of this problem space is still unaddressed.`;
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
  { term: "Core fit", meaning: "I call it core fit when it's directly addressable by what TWU actually is: a community and connection layer (event discovery, workout partner matching, real-time chat, member profiles). Not booking or admin software, TWU explicitly doesn't replace that." },
  { term: "Partial fit", meaning: "Connection and visibility features can help around the edges (surface who's showing up, prompt a conversation) but I don't think they solve the underlying issue alone." },
  { term: "Not addressable", meaning: "A staffing, facility, coaching, pricing, or culture problem. Outside what I think a connection layer can fix directly." },
  { term: "Severity (1-5)", meaning: "How serious the member or owner made this problem sound. 1 is a passing annoyance, 5 is a stated reason someone left or almost left." },
  { term: "Difficulty (1-5)", meaning: "How hard I'd rate the mentioned solution to implement. 1 is trivial, 5 is a major operational lift." },
  { term: "Effectiveness (1-5)", meaning: "How well the mentioned solution reportedly worked, per the source. I only score this when a solution and an outcome were both mentioned." },
  { term: "Relevance density", meaning: "The share of everything I analyzed that turned out to be an on-topic, specific retention finding. Most Reddit discussion in these communities isn't about retention at all." },
  { term: "Self-reported", meaning: "The result came from whoever built or sells the solution talking about their own product. I treat that as lower-trust than a first-hand owner or member account." },
];
