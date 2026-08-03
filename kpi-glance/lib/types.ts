export type Question = "growth" | "outreach" | "adoption" | "retention";

export type SourceStatus = "live" | "sample" | "blocked";

export type Direction = "higher-is-better" | "lower-is-better";

export interface Threshold {
  direction: Direction;
  good: number; // boundary at/beyond which the metric is green
  warn: number; // boundary at/beyond which the metric is yellow (between warn and good)
}

export interface Kpi {
  id: string;
  question: Question;
  label: string;
  value: number | null; // null when blocked / no data yet
  unit: "%" | "days" | "count" | "ratio";
  threshold: Threshold | null; // null = comparative/trend-only metric, no fixed color
  trendDeltaPct: number | null; // vs prior period, null if unknown
  source: string;
  status: SourceStatus;
  note?: string;
}

export type Severity = "good" | "warn" | "bad" | "neutral" | "blocked";

export function severityOf(kpi: Kpi): Severity {
  if (kpi.status === "blocked" || kpi.value === null) return "blocked";
  if (!kpi.threshold) return "neutral";
  const { direction, good, warn } = kpi.threshold;
  const v = kpi.value;
  if (direction === "higher-is-better") {
    if (v >= good) return "good";
    if (v >= warn) return "warn";
    return "bad";
  } else {
    if (v <= good) return "good";
    if (v <= warn) return "warn";
    return "bad";
  }
}
