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
  core_fit: "Core fit — directly addressable",
  partial_fit: "Partial fit — can help",
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
// Executive summary — computed from the real numbers in the selected
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

  const pp = painPointBreakdown(f);
  const top = pp[0];
  const second = pp[1];
  const topPct = Math.round((top[1].total / n) * 100);

  const ar = appRelevanceBreakdown(f);
  const coreFit = ar.find((a) => a.key === "core_fit")?.count ?? 0;
  const notAddressable = ar.find((a) => a.key === "not_addressable")?.count ?? 0;
  const coreFitPct = Math.round((coreFit / n) * 100);
  const notAddressablePct = Math.round((notAddressable / n) * 100);

  const ct = confidenceTierBreakdown(f);
  const strongPct = Math.round((ct.strong / n) * 100);
  const weakPct = Math.round((ct.weak / n) * 100);

  const sentences: string[] = [];

  sentences.push(
    `Of ${ds.total_analyzed.toLocaleString()} posts and comments analyzed in ${ds.label}, ${n} (${relDensity.toFixed(
      1
    )}%) surfaced a specific, identifiable member-retention pain point — a small slice, and a reminder that this is a targeted extraction from a much larger, mostly off-topic corpus, not a survey of gym owners broadly.`
  );

  sentences.push(
    `${painPointLabel(top[0])} is the leading cluster at ${top[1].total} findings (${topPct}% of the relevant set)` +
      (second
        ? `, followed by ${painPointLabel(second[0])} at ${second[1].total}.`
        : ".")
  );

  sentences.push(
    `${coreFitPct}% of findings (${coreFit} of ${n}) describe a problem TWU's software can directly address; ${notAddressablePct}% (${notAddressable}) describe staffing, facility, or culture issues that are outside what an app can fix on its own.`
  );

  sentences.push(
    `Confidence is skewed toward the low end: only ${ct.strong} findings (${strongPct}%) are rated strong-confidence, while ${ct.weak} (${weakPct}%) are weak — read the pattern-level conclusions above with that in mind, and treat individual weak-tier rows as leads worth watching rather than settled facts.`
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

  const pp = painPointBreakdown(f);
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
    `${painPointLabel(top[0])} is the #1 retention risk — ${topPct}% of everything relevant we found.`,
    `${coreFitPct}% of the problem set (${coreFit} of ${n} findings) is something TWU's software can directly fix, not a staffing or facility issue.`,
    `Only ${strongPct}% of findings are strong-confidence — this is a solid first read, not a final verdict; treat it as where to look next, not where to stop looking.`,
    `A concrete solution was even mentioned in ${solutionsPct}% of findings (${solutionsMentioned} of ${n}) — most gym owners are naming the problem without naming a fix, which is itself the opportunity.`,
  ];
}

// ---------------------------------------------------------------------------
// "So what" — one plain-language interpretive line per chart, computed from
// the real numbers so it can't drift from what's on screen.
// ---------------------------------------------------------------------------
export function soWhatPainPoints(rows: ReturnType<typeof painPointBreakdown>, total: number): string {
  if (rows.length === 0 || total === 0) return "No findings to summarize yet.";
  const top3 = rows.slice(0, 3);
  const top3Total = top3.reduce((s, [, v]) => s + v.total, 0);
  const top3Pct = Math.round((top3Total / total) * 100);
  return `The top 3 pain points (${top3.map(([p]) => painPointLabel(p)).join(", ")}) account for ${top3Pct}% of all relevant findings — retention risk here is concentrated, not spread evenly across a dozen issues.`;
}

export function soWhatSeverity(hist: { severity: number; count: number }[], total: number): string {
  if (total === 0) return "No severity-scored findings yet.";
  const highSeverity = hist.filter((h) => h.severity >= 4).reduce((s, h) => s + h.count, 0);
  const pct = Math.round((highSeverity / total) * 100);
  return `${pct}% of findings are rated high severity (4-5/5) — meaning the member described this as a real reason they left or nearly left, not a minor annoyance.`;
}

export function soWhatAppRelevance(ar: ReturnType<typeof appRelevanceBreakdown>, total: number): string {
  if (total === 0) return "No findings to summarize yet.";
  const coreFit = ar.find((a) => a.key === "core_fit")?.count ?? 0;
  const partial = ar.find((a) => a.key === "partial_fit")?.count ?? 0;
  const pct = total > 0 ? Math.round(((coreFit + partial) / total) * 100) : 0;
  return `${pct}% of the retention problem is at least partially solvable with software — the rest is coaching, staffing, and facility quality, which no app touches directly.`;
}

export function soWhatSolutions(rows: [string, number][], mentioned: number, total: number): string {
  if (total === 0) return "No findings to summarize yet.";
  const top = rows[0];
  if (!top) return `A specific fix was named in only ${mentioned} of ${total} findings — most gym owners are describing the problem, not a solution they tried.`;
  return `${solutionCategoryLabel(top[0])} is the most commonly tried fix (${top[1]} mentions), but only ${mentioned} of ${total} findings name any solution at all — most of this problem space is still unaddressed.`;
}

export function soWhatTimeline(rows: [string, number][]): string {
  if (rows.length < 2) return "Not enough dated findings yet to call a trend.";
  const midpoint = Math.floor(rows.length / 2);
  const earlier = rows.slice(0, midpoint).reduce((s, [, c]) => s + c, 0);
  const later = rows.slice(midpoint).reduce((s, [, c]) => s + c, 0);
  if (later > earlier * 1.3) return "Mentions have picked up in the more recent half of the timeframe — this looks like a growing conversation, not a settled one.";
  if (earlier > later * 1.3) return "Mentions were more concentrated earlier in the timeframe than recently — worth checking whether that's fewer posts or a problem that's actually easing.";
  return "Mentions are roughly steady across the timeframe — no strong recent spike or drop-off.";
}

// ---------------------------------------------------------------------------
// Glossary — plain-language definitions for every term a non-technical
// exec will hit on this page.
// ---------------------------------------------------------------------------
export const GLOSSARY: { term: string; meaning: string }[] = [
  { term: "Confidence tier", meaning: "How sure the classifier is that this is a real, on-topic retention finding — based on how specific, credible, and unambiguous the source post is. Strong = high trust; weak = plausible but read with caution." },
  { term: "Core fit", meaning: "TWU's software can directly address this problem today — e.g. booking, reminders, progress tracking, check-ins." },
  { term: "Partial fit", meaning: "Software can help around the edges (surface data, prompt a conversation) but can't solve the underlying issue alone." },
  { term: "Not addressable", meaning: "A staffing, facility, coaching, or culture problem — outside what any app can fix directly." },
  { term: "Severity (1-5)", meaning: "How serious the member/owner made this problem sound — 1 is a passing annoyance, 5 is a stated reason someone left or almost left." },
  { term: "Difficulty (1-5)", meaning: "How hard the mentioned solution would be to implement — 1 is trivial, 5 is a major operational lift." },
  { term: "Effectiveness (1-5)", meaning: "How well the mentioned solution reportedly worked, per the source — only scored when a solution and an outcome were both mentioned." },
  { term: "Relevance density", meaning: "The share of all posts/comments analyzed that turned out to be an on-topic, specific retention finding — most Reddit discussion in these communities isn't about retention at all." },
  { term: "Self-reported", meaning: "The result came from whoever built or sells the solution talking about their own product — treated as lower-trust than a first-hand owner or member account." },
];
