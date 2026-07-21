// lib/combined-analysis.ts
//
// Everything specific to the "member vs owner" combined-analysis page:
// merging the member-perspective communities (f45, orangetheory, crossfit,
// hyrox) into one lens, keeping gymowner as the other lens, and comparing
// them - plus cross-community pain-point coverage (universal vs
// community-specific) used for both the coverage table and the feature
// development ranking.
//
// Deliberately its own file rather than more additions to
// retention-research.ts: everything here operates on *multiple*
// CommunityDataset objects at once, a different shape of question than the
// single-dataset functions there.
import { CommunityDataset, Finding, painPointBreakdown, painPointLabel, PAIN_POINT_LABEL } from "./retention-research";

// The combined dataset carries 70+ distinct pain_point values, but 56 of
// them are used 2 times or fewer across the entire ~2,350-finding corpus -
// one-off labels a single community's classification prompt invented
// instead of reusing the shared taxonomy (e.g. "cancellation_policy_friction"
// vs "cancellation_policy_frustration" vs "inflexible_cancellation_policy",
// three near-duplicate labels each appearing once). Cross-community
// comparison only makes sense on categories that were actually applied
// consistently, so every function below restricts to the 11 canonical
// categories already defined in PAIN_POINT_LABEL (excluding "other") -
// everything else stays visible on each community's own tab, where the
// long tail doesn't drown out the signal, it's just excluded from the
// cross-community lens.
const CANONICAL_PAIN_POINTS = new Set(Object.keys(PAIN_POINT_LABEL).filter((k) => k !== "other"));
function isCanonical(pp: string): boolean {
  return CANONICAL_PAIN_POINTS.has(pp);
}

// Which live communities represent which lens. Derived from the actual
// perspective mix in the data (gymowner: 142 owner / 8 member; the other
// four: 87-99% member), not an arbitrary split - if a new community gets
// added later with a similarly owner-heavy mix, it belongs in
// OWNER_SUBREDDITS instead of here.
export const MEMBER_SUBREDDITS = ["f45", "orangetheory", "crossfit", "hyrox"];
export const OWNER_SUBREDDITS = ["gymowner"];

export function lensFindings(communities: CommunityDataset[], subreddits: string[]): Finding[] {
  return communities.filter((c) => subreddits.includes(c.subreddit)).flatMap((c) => c.findings);
}

// ---------------------------------------------------------------------------
// Radar: normalized pain-point share (% of that lens's own findings) so a
// small lens and a large lens are still comparable shape-for-shape, not
// just raw-count-for-raw-count.
// ---------------------------------------------------------------------------
export type RadarAxis = {
  key: string;
  label: string;
  memberPct: number;
  ownerPct: number;
  memberCount: number;
  ownerCount: number;
};

export function radarAxes(memberFindings: Finding[], ownerFindings: Finding[]): RadarAxis[] {
  const mTotal = memberFindings.length || 1;
  const oTotal = ownerFindings.length || 1;
  const mBreak: Record<string, number> = {};
  painPointBreakdown(memberFindings).forEach(([k, v]) => (mBreak[k] = v.total));
  const oBreak: Record<string, number> = {};
  painPointBreakdown(ownerFindings).forEach(([k, v]) => (oBreak[k] = v.total));
  const keys = Array.from(new Set([...Object.keys(mBreak), ...Object.keys(oBreak)])).filter(isCanonical);
  return keys
    .map((k) => {
      const memberCount = mBreak[k] || 0;
      const ownerCount = oBreak[k] || 0;
      return {
        key: k,
        label: painPointLabel(k),
        memberCount,
        ownerCount,
        memberPct: Math.round((memberCount / mTotal) * 1000) / 10,
        ownerPct: Math.round((ownerCount / oTotal) * 1000) / 10,
      };
    })
    .sort((a, b) => b.memberPct + b.ownerPct - (a.memberPct + a.ownerPct));
}

// Which lens each pain point skews toward, and by how much - drives the
// "members say X, owners say Y" narrative under the radar chart.
export function radarSoWhat(axes: RadarAxis[], memberTotal: number, ownerTotal: number): string {
  if (axes.length === 0 || memberTotal === 0 || ownerTotal === 0) {
    return "Not enough findings on both sides yet to compare shapes.";
  }
  const withGap = axes.map((a) => ({ ...a, gap: a.memberPct - a.ownerPct }));
  const topMember = [...withGap].sort((a, b) => b.gap - a.gap)[0];
  const topOwner = [...withGap].sort((a, b) => a.gap - b.gap)[0];
  return `Members talk about ${topMember.label.toLowerCase()} disproportionately more than owners do (${topMember.memberPct}% of member findings vs ${topMember.ownerPct}% of owner findings). Owners, in turn, weight ${topOwner.label.toLowerCase()} far more heavily than members ever bring it up (${topOwner.ownerPct}% vs ${topOwner.memberPct}%) - the two groups aren't describing the same gym from the same angle.`;
}

export type OwnerAlignmentRow = {
  subreddit: string;
  label: string;
  memberCount: number;
  avgGap: number; // mean absolute percentage-point gap across shared canonical pain points - lower = more aligned with gymowner
  biggestGapAxis: RadarAxis | null;
  axes: RadarAxis[]; // full per-community comparison, for a real breakdown beyond just the single biggest divergence
};

// gymowner isn't segmented by training format, so this is "gym owners in
// general" vs. "members of format X specifically" - a proxy comparison, not
// a controlled one (an f45 owner and an orangetheory owner could both be
// posting in the same gymowner thread). Still useful: pooling every member
// community into one comparison (the gap chart above) can hide a format
// where owners and members are especially out of sync, or especially
// aligned, behind the average of all four.
export function ownerAlignmentByCommunity(ownerFindings: Finding[], memberCommunities: CommunityDataset[]): OwnerAlignmentRow[] {
  return memberCommunities
    .map((c) => {
      const axes = radarAxes(c.findings, ownerFindings);
      if (axes.length === 0 || c.findings.length === 0) return { subreddit: c.subreddit, label: c.label, memberCount: c.findings.length, avgGap: 0, biggestGapAxis: null, axes: [] };
      const withGap = axes.map((a) => ({ ...a, absGap: Math.abs(a.memberPct - a.ownerPct) }));
      const avgGap = Math.round((withGap.reduce((s, a) => s + a.absGap, 0) / withGap.length) * 10) / 10;
      const biggest = [...withGap].sort((a, b) => b.absGap - a.absGap)[0];
      return { subreddit: c.subreddit, label: c.label, memberCount: c.findings.length, avgGap, biggestGapAxis: biggest, axes };
    })
    .sort((a, b) => a.avgGap - b.avgGap);
}

// ---------------------------------------------------------------------------
// Cross-community pain-point coverage: for each pain point, how many of the
// live communities actually surface it, and how many of those mentions are
// buildable (core_fit/partial_fit). This is the same table used two ways:
// "universal vs specific" (sort by coverage) and "feature development
// ranking" (sort by buildableCount) - one dataset, two lenses on it, so
// they can never silently disagree with each other.
// ---------------------------------------------------------------------------
export type CrossCommunityRow = {
  pain_point: string;
  label: string;
  totalCount: number;
  buildableCount: number;
  coreFitCount: number;
  partialFitCount: number;
  avgSeverityBuildable: number;
  communities: { subreddit: string; label: string; count: number }[];
  coverage: number;
  universal: boolean;
};

export function crossCommunityPainPoints(communities: CommunityDataset[]): CrossCommunityRow[] {
  const allKeys = new Set<string>();
  communities.forEach((c) => c.findings.forEach((f) => {
    if (f.pain_point && isCanonical(f.pain_point)) allKeys.add(f.pain_point);
  }));

  return Array.from(allKeys)
    .map((pp) => {
      const perCommunity = communities.map((c) => ({
        subreddit: c.subreddit,
        label: c.label,
        count: c.findings.filter((f) => f.pain_point === pp).length,
      }));
      const allFindings = communities.flatMap((c) => c.findings).filter((f) => f.pain_point === pp);
      const coreFit = allFindings.filter((f) => f.app_relevance === "core_fit");
      const partialFit = allFindings.filter((f) => f.app_relevance === "partial_fit");
      const buildable = [...coreFit, ...partialFit];
      const severities = buildable.map((f) => f.pain_severity).filter((s): s is number => s != null);
      const coverage = perCommunity.filter((c) => c.count > 0).length;
      return {
        pain_point: pp,
        label: painPointLabel(pp),
        totalCount: allFindings.length,
        buildableCount: buildable.length,
        coreFitCount: coreFit.length,
        partialFitCount: partialFit.length,
        avgSeverityBuildable: severities.length > 0 ? severities.reduce((a, b) => a + b, 0) / severities.length : 0,
        communities: perCommunity,
        coverage,
        universal: coverage === communities.length,
      };
    })
    .sort((a, b) => b.totalCount - a.totalCount);
}

export function soWhatCoverage(rows: CrossCommunityRow[], communityCount: number): string {
  const universal = rows.filter((r) => r.universal);
  if (universal.length === 0) {
    return `Nothing shows up across all ${communityCount} communities yet - every pain point here is at least somewhat community-specific, worth keeping that in mind before generalizing any one of them into a platform-wide problem.`;
  }
  const names = universal.map((r) => r.label).join(", ");
  return `${universal.length} pain point${universal.length === 1 ? "" : "s"} show up in every single one of the ${communityCount} communities I've classified: ${names}. That's the closest thing this data has to a universal, cross-format retention problem rather than something specific to one training style or community.`;
}

// Transparency stat for the page footnote: how much got excluded by the
// canonical-taxonomy filter above, so that filtering is stated plainly
// rather than just silently shrinking the axis/row count.
export type LongTailStats = { excludedLabels: number; excludedFindings: number; totalLabels: number; totalFindings: number };
export function longTailStats(communities: CommunityDataset[]): LongTailStats {
  const allFindings = communities.flatMap((c) => c.findings);
  const labelCounts = new Map<string, number>();
  allFindings.forEach((f) => {
    const k = f.pain_point || "other";
    labelCounts.set(k, (labelCounts.get(k) || 0) + 1);
  });
  const nonCanonicalLabels = Array.from(labelCounts.keys()).filter((k) => k !== "other" && !isCanonical(k));
  const excludedFindings = nonCanonicalLabels.reduce((s, k) => s + (labelCounts.get(k) || 0), 0);
  return {
    excludedLabels: nonCanonicalLabels.length,
    excludedFindings,
    totalLabels: labelCounts.size,
    totalFindings: allFindings.length,
  };
}

export function soWhatFeatureRanking(rows: CrossCommunityRow[]): string {
  const buildable = [...rows].filter((r) => r.buildableCount > 0).sort((a, b) => b.buildableCount - a.buildableCount);
  if (buildable.length === 0) {
    return "No pain point has any buildable (core-fit or partial-fit) findings yet across the combined dataset.";
  }
  const top = buildable[0];
  const communitiesWithIt = top.communities.filter((c) => c.count > 0).length;
  return `${top.label} has the widest buildable footprint: ${top.buildableCount} findings TWU could actually act on, spread across ${communitiesWithIt} of the communities, at an average severity of ${top.avgSeverityBuildable.toFixed(1)}/5. That combination of breadth and severity is what makes it the strongest single feature case in the combined data, not just the loudest complaint in any one community.`;
}

// ---------------------------------------------------------------------------
// Headline takeaways for the combined tab - each one names real numbers
// pulled from the axes/coverage data, not a generic description of what
// the charts below show. This is what a research analyst would open with
// before anyone even looks at the radar.
// ---------------------------------------------------------------------------
export function combinedTakeaways(
  axes: RadarAxis[],
  rows: CrossCommunityRow[],
  communityCount: number
): string[] {
  const out: string[] = [];
  const universal = rows.filter((r) => r.universal);
  out.push(
    `${universal.length} of ${rows.length} core pain-point categories show up in every one of the ${communityCount} communities: ${universal.map((r) => r.label).join(", ")}. Those are the closest thing this data has to a platform-wide retention problem rather than something specific to one training format.`
  );

  const byGap = [...axes].sort((a, b) => Math.abs(b.memberPct - b.ownerPct) - Math.abs(a.memberPct - a.ownerPct));
  const biggestGap = byGap[0];
  if (biggestGap) {
    const memberHigher = biggestGap.memberPct > biggestGap.ownerPct;
    const gapSize = Math.abs(biggestGap.memberPct - biggestGap.ownerPct).toFixed(1);
    out.push(
      memberHigher
        ? `The sharpest blind spot: ${biggestGap.label} makes up ${biggestGap.memberPct}% of what members say versus only ${biggestGap.ownerPct}% of what owners say (a ${gapSize}-point gap) - owners may be underestimating how much this actually drives people out.`
        : `Owners talk about ${biggestGap.label} far more than members ever bring it up (${biggestGap.ownerPct}% vs ${biggestGap.memberPct}%, a ${gapSize}-point gap) - a business worry that isn't showing up as a stated reason members leave, at least not in their own words.`
    );
  }

  const byBuildable = [...rows].filter((r) => r.buildableCount > 0).sort((a, b) => b.buildableCount - a.buildableCount);
  const topBuildable = byBuildable[0];
  if (topBuildable) {
    const coverage = topBuildable.communities.filter((c) => c.count > 0).length;
    out.push(
      `${topBuildable.label} is the single largest buildable opportunity: ${topBuildable.buildableCount} findings TWU could act on directly, present in ${coverage} of ${communityCount} communities, averaging ${topBuildable.avgSeverityBuildable.toFixed(1)}/5 severity.`
    );
  }

  const universalButNotBuildable = universal
    .filter((r) => r.buildableCount / Math.max(1, r.totalCount) < 0.3)
    .sort((a, b) => b.totalCount - a.totalCount)[0];
  if (universalButNotBuildable) {
    const pct = Math.round((universalButNotBuildable.buildableCount / universalButNotBuildable.totalCount) * 100);
    out.push(
      `${universalButNotBuildable.label} is universal and high-volume (${universalButNotBuildable.totalCount} findings) but mostly out of TWU's reach - only ${pct}% of its findings are core or partial fit. Real and widespread, just not a product problem.`
    );
  }
  return out;
}


