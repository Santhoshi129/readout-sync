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
