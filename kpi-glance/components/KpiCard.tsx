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
  neutral: "bg-ink-muted",
};

const badge: Record<Severity, { text: string; cls: string } | null> = {
  good: { text: "On target", cls: "text-signal-good border-signal-goodDim bg-signal-goodDim/30" },
  warn: { text: "Watch", cls: "text-signal-warn border-signal-warnDim bg-signal-warnDim/30" },
  bad: { text: "Off target", cls: "text-signal-bad border-signal-badDim bg-signal-badDim/30" },
  neutral: null,
};

function formatValue(kpi: Kpi): string {
  if (kpi.unit === "%") return `${kpi.value.toFixed(1)}%`;
  return kpi.value.toLocaleString();
}

/**
 * Where the value sits between the red floor and the green target, so the
 * card is readable without doing arithmetic. The tick marks the target.
 */
function ThresholdBar({ kpi, severity }: { kpi: Kpi; severity: Severity }) {
  if (!kpi.threshold) return null;
  const { direction, good, warn } = kpi.threshold;

  // The scale has to admit negative values: Member Base Change is a signed
  // percentage, and a domain that starts at zero renders -2% as an empty
  // stub. Domain is derived from the thresholds and the value together.
  const lowerBetter = direction === "lower-is-better";
  const domainMin = lowerBetter ? 0 : Math.min(0, warn * 1.5, kpi.value * 1.2);
  const domainMax = lowerBetter
    ? Math.max(warn * 1.5, kpi.value * 1.1, 1)
    : Math.max(good * 1.35, kpi.value * 1.1, domainMin + 1);
  const span = domainMax - domainMin || 1;
  const at = (v: number) => Math.min(100, Math.max(0, ((v - domainMin) / span) * 100));

  const zero = domainMin < 0 ? at(0) : null;
  const fillFrom = domainMin < 0 ? Math.min(at(0), at(kpi.value)) : 0;
  const fillTo = domainMin < 0 ? Math.max(at(0), at(kpi.value)) : at(kpi.value);
  const goodMark = at(good);

  const unit = kpi.unit === "%" ? "%" : "";

  return (
    <div className="mt-3.5">
      <div className="relative h-[3px] w-full overflow-hidden rounded-full bg-base-raised">
        <div
          className={`absolute inset-y-0 rounded-full ${railColor[severity]}`}
          style={{ left: `${fillFrom}%`, width: `${Math.max(1.5, fillTo - fillFrom)}%` }}
        />
        {zero !== null && (
          <div className="absolute inset-y-0 w-px bg-ink-faint/40" style={{ left: `${zero}%` }} aria-hidden />
        )}
        <div
          className="absolute inset-y-0 w-px bg-ink-faint/60"
          style={{ left: `${goodMark}%` }}
          aria-hidden
        />
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[9.5px] tabular text-ink-faint">
        <span>
          {direction === "higher-is-better" ? `red <${warn}${unit}` : `green <${good}${unit}`}
        </span>
        <span>
          {direction === "higher-is-better" ? `green ≥${good}${unit}` : `red >${warn}${unit}`}
        </span>
      </div>
    </div>
  );
}

export default function KpiCard({ kpi }: { kpi: Kpi }) {
  const severity = severityOf(kpi);
  const tag = badge[severity];

  return (
    <div className="relative flex flex-col overflow-hidden rounded-2xl border border-base-line bg-base-card p-5">
      <span className={`absolute inset-x-0 top-0 h-[2px] ${railColor[severity]}`} aria-hidden />

      <div className="flex items-start justify-between gap-2">
        <span className="text-[12.5px] font-medium leading-snug text-ink-dim">{kpi.label}</span>
        {tag && (
          <span
            className={`shrink-0 rounded-full border px-2 py-[2px] font-mono text-[9px] uppercase tracking-[0.12em] ${tag.cls}`}
          >
            {tag.text}
          </span>
        )}
      </div>

      <div className="mt-2.5 flex items-baseline gap-2">
        <span
          className={`font-display text-[30px] font-bold leading-none tabular ${valueColor[severity]}`}
        >
          {formatValue(kpi)}
        </span>
        <Delta kpi={kpi} />
      </div>

      <p className="mt-2 text-[11px] leading-snug text-ink-faint">{kpi.detail}</p>

      {kpi.caveat && (
        <p className="mt-1.5 text-[10.5px] font-medium leading-snug text-signal-warn/90">
          {kpi.caveat}
        </p>
      )}

      <ThresholdBar kpi={kpi} severity={severity} />

      <div className="mt-auto">
        {kpi.spark && kpi.spark.length > 1 ? (
          <>
            <Sparkline
              values={kpi.spark}
              dates={kpi.sparkDates}
              severity={severity}
              label={kpi.label}
              unit={kpi.unit}
            />
            <p className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-faint">
              {kpi.sparkDays ?? kpi.spark.length}d · hover for daily values
            </p>
          </>
        ) : (
          // Says why the trend is missing rather than leaving a silent gap.
          <p className="mt-3.5 text-[10px] leading-snug text-ink-faint">
            No trend yet. This source keeps no history, so the line starts once a second daily
            sync has run.
          </p>
        )}
      </div>
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
      className={`font-mono text-[11px] tabular ${
        improving ? "text-signal-good" : "text-signal-bad"
      }`}
      title={`${rising ? "Up" : "Down"} ${Math.abs(kpi.delta)}${unit} across the window shown`}
    >
      {rising ? "▲" : "▼"} {Math.abs(kpi.delta)}
      {unit}
    </span>
  );
}
