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
import hyroxData from "@/data/retention-research/hyrox.json";
import crossfitData from "@/data/retention-research/crossfit.json";
import f45Data from "@/data/retention-research/f45.json";
import orangetheoryData from "@/data/retention-research/orangetheory.json";

export type AppRelevance = "core_fit" | "partial_fit" | "not_addressable";
export type ConfidenceTier = "weak" | "moderate" | "strong";

export type SourceStatus = "live" | "deleted" | "removed" | "unknown";

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
  // Optional. Only present for communities classified with this field
  // captured (orangetheory, crossfit, hyrox). Older communities' source data
  // didn't include it, so this is undefined there rather than null.
  app_relevance_reasoning?: string | null;
  solution: string | null;
  solution_category: string | null;
  effectiveness: number | null;
  effectiveness_reasoning: string | null;
  difficulty: number | null;
  difficulty_reasoning: string | null;
  evidence_snippet: string | null;
  confidence_tier: ConfidenceTier;
  // Optional. Result of a live check against Reddit's own API (run via
  // scripts/check-reddit-status.py), not scrape-time data - reflects
  // whatever the source's status was as of whenever that script last ran,
  // not necessarily right now. Undefined until that script has been run
  // and its output merged in.
  source_status?: SourceStatus;
  source_trust?: string | null;
};

export type CommunityDataset = {
  subreddit: string;
  label: string;
  generated_at: string;
  total_analyzed: number;
  relevant_count: number;
  // Raw records pulled/scraped before any prescreen or filtering, for
  // communities where a prescreen ran (crossfit, orangetheory). Defaults to
  // total_analyzed (via sanitizeDataset) for communities that were
  // classified in full, where scraped and classified are the same number.
  raw_scraped?: number;
  // Optional, community-specific data-quality caveat. Currently kept for
  // internal record-keeping only - not rendered anywhere in the UI.
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
    // evidence_snippet deliberately NOT cleaned - it's a direct quote from
    // the source post, not our own commentary. Rewriting its punctuation
    // (even just em dashes) breaks the browser Text Fragment highlight on
    // the source link below, since that highlight only fires on an exact
    // substring match against the live page's actual text.
    evidence_snippet: f.evidence_snippet,
    solution: cleanText(f.solution),
    effectiveness_reasoning: cleanText(f.effectiveness_reasoning),
    difficulty_reasoning: cleanText(f.difficulty_reasoning),
    app_relevance_reasoning: cleanText(f.app_relevance_reasoning),
  };
}

function sanitizeDataset(ds: CommunityDataset): CommunityDataset {
  return { ...ds, raw_scraped: ds.raw_scraped ?? ds.total_analyzed, findings: ds.findings.map(sanitizeFinding) };
}

export const COMMUNITIES: CommunityDataset[] = [
  gymownerData as CommunityDataset,
  f45Data as CommunityDataset,
  orangetheoryData as CommunityDataset,
  crossfitData as CommunityDataset,
  hyroxData as CommunityDataset,
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
    raw_scraped: COMMUNITIES.reduce((s, c) => s + (c.raw_scraped ?? c.total_analyzed), 0),
    relevant_count: COMMUNITIES.reduce((s, c) => s + c.relevant_count, 0),
    findings: COMMUNITIES.flatMap((c) => c.findings),
  };
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
  // "1 in every N" can read like a fixed pattern (as if every 2,574th
  // record specifically is the relevant one) rather than what it actually
  // is - an average rate across the whole pull. "roughly X per N, on
  // average" says the same math without implying a pattern that isn't there.
  return `roughly 1 per ${Math.round(d / n).toLocaleString()}, on average`;
}

// The raw permalink exactly as it sits in the data, with a browser Text
// Fragment (#:~:text=...) appended so the page jumps to and highlights the
// same words shown on the card. Highlighting isn't guaranteed to fire on
// every click (it depends on Reddit's own page rendering, out of our
// control), but the link itself always goes to the right place either way.
// Findings aren't individually tagged with which community they came from
// (that's only known at the file level, data/retention-research/<x>.json) -
// but every permalink is a full reddit.com/r/<subreddit>/... URL, so the
// community is always recoverable from it. Used anywhere combined findings
// need to show or filter by source community (the receipts table, cross-
// community drill-downs) without changing the underlying data schema.
export function communityFromPermalink(permalink: string): string {
  const m = permalink.match(/reddit\.com\/r\/([^/]+)/i);
  return m ? `r/${m[1]}` : "unknown";
}

export function sourceLink(permalink: string, quote?: string | null): string {
  if (!quote) return permalink;
  const firstSentence = quote.split(/[.!?](?:\s|$)/)[0].trim();
  if (!firstSentence) return permalink;
  const fragment = encodeURIComponent(firstSentence.slice(0, 200));
  return `${permalink}#:~:text=${fragment}`;
}

// Falls back to the scrape-time author check (a real but partial signal -
// only catches accounts already deleted when we scraped, not deletions
// since) when source_status hasn't been filled in by
// scripts/check-reddit-status.py yet. Once that script has run for a
// finding, its live result takes over instead.
export function sourceStatusLabel(f: Pick<Finding, "author" | "source_status">): string | null {
  if (f.source_status === "deleted") return "poster's account deleted (checked live)";
  if (f.source_status === "removed") return "post removed (checked live)";
  if (f.source_status === "live") return null;
  if (f.source_status === "unknown") return null;
  if ((f.author || "").toLowerCase() === "[deleted]") return "poster's account deleted (as of when this was scraped)";
  return null;
}

// One-line "why this number" explanation for a community's relevant-findings
// count, shown on hover next to the tab/selector.
export function communityCountNote(ds: CommunityDataset): string {
  if (ds.subreddit === "all") {
    return `Union of every community below (${COMMUNITIES.length}) at once. Each keeps its own pain-point categories rather than being forced into a shared list.`;
  }
  const rate = ratioOrPct(ds.relevant_count, ds.total_analyzed);
  return `${ds.relevant_count} relevant out of ${ds.total_analyzed.toLocaleString()} records (${rate}).`;
}

// Matching one-liner for the top "Posts/comments analyzed" stat tile.
export function analyzedNote(ds: CommunityDataset): string {
  if (ds.subreddit === "all") {
    const parts = COMMUNITIES.map((c) => `${c.label} ${c.total_analyzed.toLocaleString()}`).join(" + ");
    const rawTotal = COMMUNITIES.reduce((s, c) => s + (c.raw_scraped ?? c.total_analyzed), 0);
    return `${parts} = ${ds.total_analyzed.toLocaleString()} total. ${rawTotal.toLocaleString()} records were scraped in total before any prescreening; this is the number that actually went through classification.`;
  }
  const raw = ds.raw_scraped ?? ds.total_analyzed;
  if (raw > ds.total_analyzed) {
    return `${raw.toLocaleString()} records were scraped for this community; a prescreen narrowed that down to the ${ds.total_analyzed.toLocaleString()} shown here, which is what actually went through classification.`;
  }
  return `${raw.toLocaleString()} records were scraped for this community; every one of them went through classification, nothing was filtered out first.`;
}

// Matching one-liner for the top "Relevant findings" stat tile.
export function relevantNote(ds: CommunityDataset): string {
  const rate = ratioOrPct(ds.relevant_count, ds.total_analyzed);
  return `${rate} of records analyzed above described an actual retention pain point or a fix someone tried. The rest was off-topic chatter.`;
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
    "Someone who was showing up regularly loses steam over time: hits a goal with nothing to chase next, gets bored of the routine, or just quietly stops without a single triggering complaint.",
  lack_of_accountability_support:
    "Nobody catches a member drifting until it's too late; no system flags declining attendance early enough for a real conversation to happen before they've already mentally checked out.",
  communication_gaps:
    "A message that should have reached someone didn't (a renewal, a class change, a policy update), and the member finds out the hard way instead of being told directly.",
  onboarding_reentry_friction:
    "The first weeks (or the return after a break) are confusing or unwelcoming enough that someone leaves before ever getting comfortable, not because the core product failed them.",
  pricing_cost_value:
    "The price itself is rarely the whole story. It's usually 'the price for what I'm actually getting': a single-location membership, a format they've outgrown, a value they no longer feel.",
  no_shows_late_cancellations:
    "Booking and cancellation policy friction: fees, caps, or rules that frustrate loyal members while, in theory, targeting the people abusing the system.",
  facility_experience_decline:
    "The physical space itself got worse (equipment, cleanliness, crowding), and that decline is what's cited as the actual reason someone stopped coming.",
  coaching_quality_inconsistency:
    "The coach or trainer experience varies too much class to class to trust: a great coach one day, a disengaged one the next, and that inconsistency is what erodes trust in the program.",
  community_culture_negative:
    "The social fabric of the group turned unwelcoming (cliquishness, unfriendliness, or a shift in who's in the room), and that, not the workout itself, is what pushed someone out.",
  scheduling_access_issues:
    "The class or facility isn't actually reachable when the member needs it: times that don't fit their life, locations too far, capacity that fills before they can book.",
  business_ownership_change:
    "A change at the business level (ownership, affiliation, closure), not a member complaint at all, but it still directly caused people to leave.",
  programming_dissatisfaction:
    "The workouts themselves stopped delivering: same format on repeat, plateaued results despite consistent effort, or a training style that doesn't match what the member actually wants.",
  other: "Doesn't cleanly fit one of the named categories above. Real signal, just not common enough on its own to warrant a dedicated category yet.",
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
  core_fit: "Something a community/connection product like TWU's could plausibly fix directly. Not a promise it's already built, just that it's in scope.",
  partial_fit: "TWU could help around the edges (a nudge, a flag, a reminder) but doesn't solve the actual root cause on its own.",
  not_addressable: "A coaching, staffing, facility, or pricing problem. No app changes what happened here, regardless of how it's built.",
};

export const CONFIDENCE_TONE: Record<ConfidenceTier, string> = {
  strong: "hot",
  moderate: "amber",
  weak: "muted",
};
export const CONFIDENCE_RANK: Record<ConfidenceTier, number> = { strong: 3, moderate: 2, weak: 1 };

export function solutionCategoryLabel(s: string): string {
  if (s === NO_SOLUTION_KEY) return "No Solution Mentioned";
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
// ---------------------------------------------------------------------------
// Recency. period_quarter is "YYYY-QN", which sorts correctly as a plain
// string, but for a rolling "last 12 months" window we need it as a
// comparable integer (year * 4 + zero-based quarter) so "trailing 4
// quarters from whatever the latest one in the data is" is a simple
// subtraction, not a date-library dependency.
// ---------------------------------------------------------------------------
function quarterIndex(pq: string | null): number | null {
  if (!pq) return null;
  const m = /^(\d{4})-Q([1-4])$/.exec(pq);
  if (!m) return null;
  return parseInt(m[1], 10) * 4 + (parseInt(m[2], 10) - 1);
}

// Latest quarter present in a given finding set - computed from whatever's
// passed in (a single community or the combined set) rather than hardcoded,
// so this keeps working as new scrapes land without a code change.
export function latestQuarterIndex(findings: Finding[]): number | null {
  let max: number | null = null;
  findings.forEach((f) => {
    const idx = quarterIndex(f.period_quarter);
    if (idx != null && (max == null || idx > max)) max = idx;
  });
  return max;
}

// Trailing 12 months = the latest quarter plus the 3 before it. Findings
// with no parseable period_quarter are excluded rather than assumed recent -
// silently counting an undated finding as current would be a bigger
// distortion than leaving it out of a "recent" filter that's opt-in anyway.
export function isRecentFinding(f: Finding, latestIdx: number | null): boolean {
  if (latestIdx == null) return false;
  const idx = quarterIndex(f.period_quarter);
  if (idx == null) return false;
  return idx > latestIdx - 4;
}

// How many distinct Reddit accounts are actually behind a community's
// findings, versus how many findings there are total - a real evidentiary-
// strength signal separate from confidence tier. A community where 90% of
// findings come from under 20% of the accounts posting them would be a
// handful of loud repeat voices, not a broad pattern; this is here so that
// distinction doesn't have to be taken on faith.
export function authorDiversity(findings: Finding[]): { total: number; uniqueAuthors: number; pct: number } {
  const authors = new Set(findings.map((f) => f.author).filter((a): a is string => !!a));
  const total = findings.length;
  return { total, uniqueAuthors: authors.size, pct: total > 0 ? Math.round((authors.size / total) * 100) : 0 };
}

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
export type PainPointExample = { reasoning: string; short: string; evidence: string | null; permalink: string; link: string };
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
      permalink: f.permalink,
      link: sourceLink(f.permalink, f.evidence_snippet),
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

// Synthetic key for findings where nobody described trying anything -
// computed from the solution field being empty, not from raw category
// labels, so it's consistent across communities regardless of how each
// one's source data happened to tag (or not tag) "nothing was tried."
export const NO_SOLUTION_KEY = "no_solution_mentioned";

export function solutionCategoryBreakdown(findings: Finding[]) {
  const map: Record<string, number> = {};
  let noSolution = 0;
  findings.forEach((f) => {
    if (f.solution_category) map[f.solution_category] = (map[f.solution_category] || 0) + 1;
    else if (!f.solution) noSolution++;
  });
  const entries = Object.entries(map);
  if (noSolution > 0) entries.push([NO_SOLUTION_KEY, noSolution]);
  return entries.sort((a, b) => b[1] - a[1]);
}

export function timelineBreakdown(findings: Finding[]) {
  const map: Record<string, number> = {};
  findings.forEach((f) => {
    if (f.period_quarter) map[f.period_quarter] = (map[f.period_quarter] || 0) + 1;
  });
  return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
}

// Volume over time answers "are people talking about this more." It says
// nothing about whether what they're describing is getting worse - a flat
// mention count could still hide rising severity. Paired with the volume
// timeline so both questions get answered from the same underlying quarters.
export function severityTimelineBreakdown(findings: Finding[]): [string, number, number][] {
  const map: Record<string, { sum: number; count: number }> = {};
  findings.forEach((f) => {
    if (!f.period_quarter || f.pain_severity == null) return;
    if (!map[f.period_quarter]) map[f.period_quarter] = { sum: 0, count: 0 };
    map[f.period_quarter].sum += f.pain_severity;
    map[f.period_quarter].count += 1;
  });
  return Object.entries(map)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([q, v]) => [q, Math.round((v.sum / v.count) * 10) / 10, v.count]);
}

export function soWhatSeverityTrend(rows: [string, number, number][]): string {
  const withData = rows.filter((r) => r[2] >= 3); // ignore near-empty quarters, too noisy to read as a trend point
  if (withData.length < 4) return "Not enough quarters with a meaningful sample yet to read a severity trend.";
  const half = Math.floor(withData.length / 2);
  const early = withData.slice(0, half);
  const recent = withData.slice(-half);
  const earlyAvg = early.reduce((s, r) => s + r[1], 0) / early.length;
  const recentAvg = recent.reduce((s, r) => s + r[1], 0) / recent.length;
  const diff = Math.round((recentAvg - earlyAvg) * 10) / 10;
  if (Math.abs(diff) < 0.15) {
    return `Average severity has stayed roughly flat across the timeframe (${earlyAvg.toFixed(1)}/5 average-of-quarters in the earlier half vs ${recentAvg.toFixed(1)}/5 in the more recent half) - more mentions over time, if any, isn't the same as worse ones.`;
  }
  return diff > 0
    ? `Average severity has crept up over the timeframe, from ${earlyAvg.toFixed(1)}/5 average-of-quarters in the earlier half to ${recentAvg.toFixed(1)}/5 more recently - not just more mentions, somewhat worse ones too.`
    : `Average severity has eased over the timeframe, from ${earlyAvg.toFixed(1)}/5 average-of-quarters in the earlier half to ${recentAvg.toFixed(1)}/5 more recently, even where mention volume hasn't dropped.`;
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
  owner: "An operator describing what they see in their own members: secondhand on the member's actual experience, firsthand on what an operator notices.",
  member: "Someone describing their own experience directly. The strongest evidentiary base of the group, but only one side of the story.",
  vendor: "A product or service seller talking about the space, not a member or operator's lived account. Weighted lower for that reason.",
  coach: "Staff or a coach describing what they see from the floor. Close to the member experience, but still not the member's own words.",
  employee: "A non-coaching staff member's account: workplace conditions and internal process, not member sentiment directly.",
  unclear: "Couldn't confidently tell who's speaking from the text alone. Included for completeness, weighted cautiously.",
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
    const coreFindings = rowFindings.filter((f) => f.app_relevance === "core_fit");
    const core_fit = coreFindings.length;
    const partial_fit = rowFindings.filter((f) => f.app_relevance === "partial_fit").length;
    const not_addressable = rowFindings.filter((f) => f.app_relevance === "not_addressable").length;
    // Severity and solve-rate are computed from the core-fit subset, not
    // every finding under this pain point - the ranking score and the
    // recommendation text are both specifically about what TWU could
    // actually build, so the numbers backing them need to describe that
    // same subset. Mixing in not-addressable findings here previously
    // produced a solve-rate that didn't match the buildable set it was
    // narrated as describing (e.g. one pain point's core-fit findings
    // were 100% solved while the all-findings figure read 43%).
    const severities = coreFindings.map((f) => f.pain_severity).filter((s): s is number => s != null);
    const avgSeverity = severities.length > 0 ? severities.reduce((a, b) => a + b, 0) / severities.length : 0;
    const solutionRate = core_fit > 0 ? coreFindings.filter((f) => f.solution).length / core_fit : 0;
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

export type SolutionByCommunityRow = { subreddit: string; label: string; count: number; avgEffectiveness: number; avgDifficulty: number };
export type SolutionByCommunityGroup = { category: string; totalCount: number; communities: SolutionByCommunityRow[] };

// A solution that scores well pooled across every community could still be
// working great in one and doing nothing in another - pooling can hide
// that the same "fix" behaves differently depending on the format. Built
// per-community by re-running solutionQuadrant on each community's own
// findings rather than post-filtering the pooled result, so a category's
// per-community effectiveness/difficulty is computed the same way the
// pooled Quick Wins numbers are, just scoped smaller.
export function solutionEffectivenessByCommunity(communities: { subreddit: string; label: string; findings: Finding[] }[]): SolutionByCommunityGroup[] {
  const byCategory: Record<string, SolutionByCommunityRow[]> = {};
  communities.forEach((c) => {
    solutionQuadrant(c.findings).forEach((row) => {
      if (!byCategory[row.category]) byCategory[row.category] = [];
      byCategory[row.category].push({
        subreddit: c.subreddit,
        label: c.label,
        count: row.count,
        avgEffectiveness: row.avgEffectiveness,
        avgDifficulty: row.avgDifficulty,
      });
    });
  });
  return Object.entries(byCategory)
    .map(([category, rows]) => ({
      category,
      totalCount: rows.reduce((s, r) => s + r.count, 0),
      communities: rows.sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => b.totalCount - a.totalCount);
}


export function soWhatQuickWins(rows: SolutionQuadrantRow[], scoredCount: number, total: number): string {
  if (rows.length === 0) return "Not enough findings score both difficulty and effectiveness yet to compare solutions this way.";
  const quickWins = rows.filter((r) => r.avgDifficulty <= 2.5 && r.avgEffectiveness >= 3.5);
  const base = `Only ${scoredCount} of ${total} findings have both a difficulty and an effectiveness score, small enough that I'd treat this as directional, not final.`;
  if (quickWins.length === 0) {
    return `${base} Nothing in this data lands cleanly in the easy-and-effective corner yet, most tried fixes are either a real lift to implement or came back with mixed results.`;
  }
  const NAMED_CAP = 5;
  const byVolume = [...quickWins].sort((a, b) => b.count - a.count);
  const named = byVolume.slice(0, NAMED_CAP);
  const rest = byVolume.length - named.length;
  const namedList = named.map((r) => `${solutionCategoryLabel(r.category)} (${r.count})`).join(", ");
  const restNote = rest > 0 ? `, plus ${rest} more that clear the same bar with fewer mentions` : "";
  return `${quickWins.length} solution${quickWins.length === 1 ? "" : "s"} clear the easy-and-effective bar. By volume, ${namedList}${restNote} are the standouts worth prioritizing on cost alone, even before weighing it against the pain-point ranking above.`;
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

  const ct = confidenceTierBreakdown(f);

  const sentences: string[] = [];

  const isAll = ds.subreddit === "all";
  const raw = ds.raw_scraped ?? ds.total_analyzed;
  const rawTotal = COMMUNITIES.reduce((s, c) => s + (c.raw_scraped ?? c.total_analyzed), 0);
  const rawClause = isAll
    ? ` (${rawTotal.toLocaleString()} records were scraped in total before prescreening; this is the number that actually reached classification)`
    : raw > ds.total_analyzed
      ? ` (${raw.toLocaleString()} were scraped before a prescreen narrowed that down to this classified pool)`
      : ` (${raw.toLocaleString()} were scraped for this community; every one of them reached classification)`;

  sentences.push(
    isAll
      ? `${ds.total_analyzed.toLocaleString()} posts and comments were pulled across these communities${rawClause}. ${n} findings (${relRate}) named a specific, identifiable reason a member left or almost left.`
      : `${ds.total_analyzed.toLocaleString()} posts and comments from ${ds.label} were reviewed${rawClause} to isolate one thing: a specific, identifiable reason a member left or almost left. ${n} of them (${relRate}) met that bar. That rate is expected for a general-purpose subreddit, where most discussion isn't about retention at all; ${n} is the confirmed signal, not a claim about how much members discuss the topic overall.`
  );

  // Deliberately doesn't restate the top pain point or the confidence split -
  // both are already the sharpest line in the Key Takeaways bullets above.
  // This paragraph's job is to add texture those bullets don't have room
  // for: the full three-way app-relevance split (not just the core-fit
  // slice), and what the confidence tiers actually mean for how to use the
  // rest of the page - not the same two facts said twice in a row.
  const ar = appRelevanceBreakdown(f);
  const coreFit = ar.find((a) => a.key === "core_fit")?.count ?? 0;
  const partialFit = ar.find((a) => a.key === "partial_fit")?.count ?? 0;
  const notAddressable = ar.find((a) => a.key === "not_addressable")?.count ?? 0;
  const coreFitPct = Math.round((coreFit / n) * 100);
  const partialFitPct = Math.round((partialFit / n) * 100);
  const notAddressablePct = Math.round((notAddressable / n) * 100);

  sentences.push(
    `Of those ${n}, ${coreFitPct}% (${coreFit}) are problems TWU's product can move on its own, ${partialFitPct}% (${partialFit}) would need product work paired with something outside the app, and ${notAddressablePct}% (${notAddressable}) is staffing, facility, or pricing, outside what any software fixes. The core-fit and partial-fit shares define the addressable opportunity; the not-addressable share sets its outer limit.`
  );

  sentences.push(
    ct.weak > 0
      ? `Strong and moderate-tier findings anchor the conclusions on this page. The weak tier is lower-confidence signal, useful for prioritizing the next classification pass rather than for supporting a specific recommendation on its own.`
      : `Everything in this set cleared at least moderate confidence, with nothing weak-tier here to caveat.`
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
    `${painPointLabel(top[0])} comes up more than anything else, ${topPct}% of everything found. This reflects mention frequency; the build recommendation is ranked separately further down.`,
    `Over half of what's here (${coreFitPct}%, ${coreFit} of ${n}) is addressable by TWU's product directly. Staffing and facility complaints account for only part of the remainder.`,
    `${strongPct}% of findings are strong-tier. This is a first classification pass; a larger run would tighten these percentages before they're treated as final.`,
    `${solutionsPct}% of findings (${solutionsMentioned} of ${n}) name an attempted fix. The remainder may reflect an unaddressed gap, or a reporting bias toward venting over documenting solutions; this data doesn't distinguish between the two, so treat it as a lead rather than a conclusion.`,
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
  const realSolutions = rows.filter(([cat]) => cat !== NO_SOLUTION_KEY);
  if (top[0] === NO_SOLUTION_KEY) {
    const topReal = realSolutions[0];
    const noSolvePct = Math.round((top[1] / total) * 100);
    if (!topReal) {
      return `${top[1]} of ${total} findings (${noSolvePct}%) never mention anyone trying a fix at all. That's the single biggest bucket here, bigger than any actual solution. Read it as unaddressed problem space until proven otherwise. Posts skew toward venting over documenting fixes, so some of this gap is reporting bias, not a real vacuum. No solution category has enough volume yet to call a clear runner-up.`;
    }
    return `The single biggest bucket isn't a solution at all: ${top[1]} of ${total} findings (${noSolvePct}%) never mention anyone trying anything. That's not a fix; it's the absence of one, people venting about the problem without describing what (if anything) they did about it. Once you set that aside, the actual most-tried fix is ${solutionCategoryLabel(topReal[0])} (${topReal[1]} mentions). Treat the no-solution share as a floor on unaddressed problem space, not a headline finding on its own. Some of it is reporting bias (Reddit skews toward venting over documenting fixes), not proof nothing was ever tried.`;
  }
  return `${solutionCategoryLabel(top[0])} is the most commonly tried fix, ${top[1]} mentions, out of ${mentioned} of ${total} findings that name any solution at all.`;
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
  { term: "Buildable", meaning: "A finding tagged core fit or partial fit, pooled together. 'Buildable volume' on a pain point is the count of these - not weighted by severity or confidence, just a raw count of findings TWU could plausibly act on." },
  { term: "Coverage / Universal", meaning: "Coverage is how many of the live communities mention a given pain point at all, out of the total live count. 'Universal' means every single one does - the closest thing this data has to a platform-wide problem rather than something specific to one training format." },
  { term: "Hit rate", meaning: "Relevant findings divided by everything analyzed for a community. A high hit rate means that community's raw pull was dense with on-topic retention content; it says nothing about how trustworthy those findings are - see Confidence tier for that." },
  { term: "Perspective / voice", meaning: "Who's actually talking in a given finding: owner (a gym operator describing their business), member (someone describing their own experience directly), vendor (a product or service seller), coach or staff (someone on the floor, not a member), or unclear. Member and owner voice are compared directly in the member-vs-owner chart; the other categories are tracked but not split out there." },
  { term: "Gap (member vs owner)", meaning: "The percentage-point difference between how often members bring up a pain point (as a share of member findings) and how often owners do (as a share of owner findings). A large gap means the two groups are describing different problems, not just the same gym from two angles." },
];
