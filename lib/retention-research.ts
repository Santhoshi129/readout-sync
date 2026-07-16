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
