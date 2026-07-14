// lib/retention-matrix.ts
// SERVER-ONLY loader for the Community Research page (/retention-research).
// Reads the static matrix committed at data/retention-matrix.json - this is
// a SEPARATE, independent pipeline from Retention Signal (/retention-signal):
// Arctic Shift Reddit scrape -> keyword pre-filter -> OpenRouter free-tier
// classification against a fixed taxonomy -> aggregated matrix, run via n8n
// and dropped into this file. No MongoDB involved on this page.
//
// To refresh with a new run: replace data/retention-matrix.json wholesale
// (same shape) and redeploy - this file just shapes/labels whatever is in
// there, it doesn't validate freshness or fetch live.

import matrixData from "@/data/retention-matrix.json";

export interface Solution {
  solution: string;
  frequency: number;
  effectiveness: number | null;
  difficulty: number | null;
}

export interface PainPoint {
  pain_point: string;
  frequency: number;
  owner_mentions: number;
  member_mentions: number;
  solutions: Solution[];
}

export interface RetentionMatrix {
  generated_at: string;
  total_classified_items: number;
  subreddits: string[];
  matrix: PainPoint[];
}

export const PAIN_POINT_LABELS: Record<string, string> = {
  community_culture_negative: "Community culture",
  no_shows_late_cancellations: "No-shows / late cancels",
  pricing_cost_value: "Pricing & value",
  coaching_quality_inconsistency: "Coaching inconsistency",
  other: "Other",
  motivation_engagement_decline: "Motivation decline",
  programming_dissatisfaction: "Programming dissatisfaction",
  injury_safety_concerns: "Injury & safety",
  business_ownership_change: "Ownership change",
  facility_experience_decline: "Facility experience",
  scheduling_access_issues: "Scheduling & access",
  onboarding_reentry_friction: "Onboarding / re-entry friction",
  communication_gaps: "Communication gaps",
  competition_goal_misalignment: "Competition goal fit",
};

export const PAIN_POINT_DESCRIPTIONS: Record<string, string> = {
  community_culture_negative: "Toxic, cliquey, intimidating, or unwelcoming gym culture/community.",
  no_shows_late_cancellations: "Members not showing up or cancelling last-minute for booked classes/sessions.",
  pricing_cost_value: "Complaints about price increases, cost vs. perceived value, or affordability.",
  coaching_quality_inconsistency: "Inconsistent coaching, unqualified coaches, or coach turnover.",
  other: "Genuinely retention-relevant but doesn't fit a defined category.",
  motivation_engagement_decline: "Member losing personal motivation, not tied to a specific gym failure.",
  programming_dissatisfaction: "Dislike of the workout programming itself.",
  injury_safety_concerns: "Injury, re-injury risk, or physical safety concerns.",
  business_ownership_change: "Gym sold, ownership transition, or owner stepping back.",
  facility_experience_decline: "Physical facility/equipment quality declining.",
  scheduling_access_issues: "Class times, booking system, or access hours don't fit member needs.",
  onboarding_reentry_friction: "Friction rejoining after a break, or a rough first-weeks onboarding experience.",
  communication_gaps: "Poor or infrequent communication from the gym/owner.",
  competition_goal_misalignment: "Gym doesn't support member's specific competitive goals.",
};

export function getRetentionMatrix(): RetentionMatrix {
  const data = matrixData as RetentionMatrix;
  return { ...data, matrix: [...data.matrix].sort((a, b) => b.frequency - a.frequency) };
}

export function label(key: string): string {
  return PAIN_POINT_LABELS[key] || key;
}

export function description(key: string): string {
  return PAIN_POINT_DESCRIPTIONS[key] || "";
}

// Plain-language readings of the 1-5 scores, for anyone who doesn't want
// to mentally convert "4/5" into a judgment call. Number stays visible
// alongside these for anyone who does want the precise scale.
const EFFECTIVENESS_WORDS: Record<number, string> = {
  1: "Didn't work", 2: "Mixed results", 3: "Somewhat effective", 4: "Worked well", 5: "Highly effective",
};
const DIFFICULTY_WORDS: Record<number, string> = {
  1: "Trivial to do", 2: "Easy", 3: "Moderate effort", 4: "Significant effort", 5: "Major undertaking",
};

export function effectivenessLabel(n: number | null): string {
  if (n == null) return "–";
  return EFFECTIVENESS_WORDS[n] || `${n}/5`;
}

export function difficultyLabel(n: number | null): string {
  if (n == null) return "–";
  return DIFFICULTY_WORDS[n] || `${n}/5`;
}
