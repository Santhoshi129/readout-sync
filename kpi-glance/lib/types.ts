export type Direction = "higher-is-better" | "lower-is-better";

export interface Threshold {
  direction: Direction;
  good: number; // at/beyond this the metric is green
  warn: number; // between warn and good the metric is yellow
}

export interface Kpi {
  id: string;
  label: string;
  value: number;
  unit: "%" | "count";
  /** null = scale/context number with no target; shown neutral, never in the Problem Radar */
  threshold: Threshold | null;
  /** Short factual basis for the number, e.g. "208 of 1,465 linked members" */
  detail: string;
  /** Set when the number is real but the sample behind it is too small to trust. */
  caveat?: string;
  /** Real daily readings, oldest to newest. Absent when no history exists yet. */
  spark?: number[];
  /** Change across the sparkline window, in percentage points for rates. */
  delta?: number | null;
  /** ISO dates matching `spark`, so a hovered point can name its day. */
  sparkDates?: string[];
  /** How many days the sparkline covers, for the card's footnote. */
  sparkDays?: number;
  /** True when a rise in this metric is bad (at-risk, drop-off, and similar). */
  inverse?: boolean;
}

/** Below this many observations a rate is too noisy to act on. */
export const LOW_SAMPLE = 30;

export function lowSampleCaveat(denominator: number): string | undefined {
  if (denominator >= LOW_SAMPLE) return undefined;
  return `Low sample (n=${denominator}) — treat as directional`;
}

export type Severity = "good" | "warn" | "bad" | "neutral";

export function severityOf(kpi: Kpi): Severity {
  if (!kpi.threshold) return "neutral";
  const { direction, good, warn } = kpi.threshold;
  const v = kpi.value;
  if (direction === "higher-is-better") {
    if (v >= good) return "good";
    if (v >= warn) return "warn";
    return "bad";
  }
  if (v <= good) return "good";
  if (v <= warn) return "warn";
  return "bad";
}

/** Plain-language statement of what the threshold expects, for the Problem Radar. */
export function targetText(kpi: Kpi): string {
  if (!kpi.threshold) return "";
  const { direction, good } = kpi.threshold;
  const t = kpi.unit === "%" ? `${good}%` : good.toLocaleString();
  return direction === "higher-is-better" ? `target ≥ ${t}` : `target < ${t}`;
}

export interface Section {
  id: string;
  title: string;
  source: string;
  syncedAt: string | null;
  kpis: Kpi[];
}
