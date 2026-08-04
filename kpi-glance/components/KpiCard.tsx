import { Kpi, Severity, severityOf } from "@/lib/types";
import Sparkline from "./Sparkline";

const valueColor: Record<Severity, string> = {
  good: "text-signal-good",
  warn: "text-signal-warn",
  bad: "text-signal-bad",
  neutral: "text-ink",
};

const railColor: Record<Severity, string> = {
  good: "bg-signal-good",
  warn: "bg-signal-warn",
  bad: "bg-signal-bad",
  neutral: "bg-base-line",
};

const badge: Record<Severity, { text: string; cls: string } | null> = {
  good: { text: "Green", cls: "text-signal-good bg-signal-goodDim/40 border-signal-goodDim" },
  warn: { text: "Yellow", cls: "text-signal-warn bg-signal-warnDim/40 border-signal-warnDim" },
  bad: { text: "Red", cls: "text-signal-bad bg-signal-badDim/40 border-signal-badDim" },
  neutral: null,
};

function formatValue(kpi: Kpi): string {
  if (kpi.unit === "%") return `${kpi.value.toFixed(1)}%`;
  return kpi.value.toLocaleString();
}

/**
 * A single bar showing where the value sits between the red floor and the
 * green target, so the card is readable without doing arithmetic.
 */
function ThresholdBar({ kpi, severity }: { kpi: Kpi; severity: Severity }) {
  if (!kpi.threshold) return null;
  const { direction, good, warn } = kpi.threshold;

  const scaleMax =
    direction === "higher-is-better"
      ? Math.max(good * 1.35, kpi.value * 1.1, 1)
      : Math.max(warn * 1.5, kpi.value * 1.1, 1);

  const fill = Math.min(100, Math.max(2, (kpi.value / scaleMax) * 100));
  const goodMark = Math.min(100, (good / scaleMax) * 100);

  return (
    <div className="mt-3">
      <div className="relative h-1 w-full rounded-full bg-base-raised overflow-hidden">
        <div className={`h-full rounded-full ${railColor[severity]}`} style={{ width: `${fill}%` }} />
        <div
          className="absolute inset-y-0 w-px bg-ink-faint/70"
          style={{ left: `${goodMark}%` }}
          aria-hidden
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] tabular text-ink-faint">
        <span>
          {direction === "higher-is-better" ? "red below" : "green below"}{" "}
          {direction === "higher-is-better" ? warn : good}
          {kpi.unit === "%" ? "%" : ""}
        </span>
        <span>
          {direction === "higher-is-better" ? "green at" : "red above"}{" "}
          {direction === "higher-is-better" ? good : warn}
          {kpi.unit === "%" ? "%" : ""}
        </span>
      </div>
    </div>
  );
}

export default function KpiCard({ kpi }: { kpi: Kpi }) {
  const severity = severityOf(kpi);
  const tag = badge[severity];

  return (
    <div className="relative overflow-hidden rounded-xl border border-base-line bg-base-panel p-4">
      <span className={`absolute inset-y-0 left-0 w-[3px] ${railColor[severity]}`} aria-hidden />

      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] font-medium leading-snug text-ink-dim">{kpi.label}</span>
        {tag && (
          <span
            className={`shrink-0 rounded-full border px-2 py-[1px] text-[10px] font-semibold uppercase tracking-wide ${tag.cls}`}
          >
            {tag.text}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className={`font-mono text-[28px] font-semibold leading-none tabular ${valueColor[severity]}`}>
          {formatValue(kpi)}
        </span>
        <Delta kpi={kpi} />
      </div>

      <p className="mt-1.5 text-[11px] leading-snug text-ink-faint">{kpi.detail}</p>

      {kpi.caveat && (
        <p className="mt-1 text-[10.5px] font-medium leading-snug text-signal-warn/90">{kpi.caveat}</p>
      )}

      <ThresholdBar kpi={kpi} severity={severity} />

      {kpi.spark && kpi.spark.length > 1 ? (
        <>
          <Sparkline values={kpi.spark} severity={severity} label={kpi.label} />
          <p className="mt-0.5 text-[10px] text-ink-faint">
            last {kpi.sparkDays ?? kpi.spark.length} days
          </p>
        </>
      ) : (
        // Says why the trend is missing rather than leaving a silent gap.
        <p className="mt-3 text-[10px] leading-snug text-ink-faint">
          No trend yet — this source keeps no history, so the line starts once a second daily sync
          has run.
        </p>
      )}
    </div>
  );
}

/**
 * Direction of travel over the sparkline window. Improvement is judged
 * against the metric's own direction, so a falling at-risk rate reads as
 * good and a falling reply rate reads as bad.
 */
function Delta({ kpi }: { kpi: Kpi }) {
  if (kpi.delta === null || kpi.delta === undefined || kpi.delta === 0) return null;
  const rising = kpi.delta > 0;
  const improving = kpi.inverse ? !rising : rising;
  const unit = kpi.unit === "%" ? "pt" : "";
  return (
    <span
      className={`font-mono text-[11.5px] tabular ${
        improving ? "text-signal-good" : "text-signal-bad"
      }`}
      title={`${rising ? "Up" : "Down"} ${Math.abs(kpi.delta)}${unit} over the window shown`}
    >
      {rising ? "▲" : "▼"} {Math.abs(kpi.delta)}
      {unit}
    </span>
  );
}
