import { Kpi, severityOf } from "@/lib/types";

const severityColor: Record<string, string> = {
  good: "text-signal-good",
  warn: "text-signal-warn",
  bad: "text-signal-bad",
  neutral: "text-ink",
  blocked: "text-ink-faint",
};

const severityDot: Record<string, string> = {
  good: "bg-signal-good",
  warn: "bg-signal-warn",
  bad: "bg-signal-bad",
  neutral: "bg-ink-faint",
  blocked: "bg-ink-faint",
};

function formatValue(kpi: Kpi): string {
  if (kpi.value === null) return "—";
  if (kpi.unit === "%") return `${kpi.value.toFixed(1)}%`;
  if (kpi.unit === "days") return `${kpi.value.toFixed(0)}d`;
  return kpi.value.toLocaleString();
}

function Runway({ kpi }: { kpi: Kpi }) {
  if (!kpi.threshold || kpi.value === null) return null;
  const { direction, good, warn } = kpi.threshold;
  const scaleMax =
    direction === "higher-is-better"
      ? Math.max(good * 1.4, kpi.value * 1.1, 1)
      : Math.max(warn * 1.6, kpi.value * 1.1, 1);

  const pct = (n: number) => Math.min(100, Math.max(0, (n / scaleMax) * 100));
  const markerPos = pct(kpi.value);

  const zones =
    direction === "higher-is-better"
      ? [
          { width: pct(warn), color: "bg-signal-badDim" },
          { width: pct(good) - pct(warn), color: "bg-signal-warnDim" },
          { width: 100 - pct(good), color: "bg-signal-goodDim" },
        ]
      : [
          { width: pct(good), color: "bg-signal-goodDim" },
          { width: pct(warn) - pct(good), color: "bg-signal-warnDim" },
          { width: 100 - pct(warn), color: "bg-signal-badDim" },
        ];

  return (
    <div className="relative mt-3 h-1.5 w-full rounded-full overflow-hidden bg-base-raised flex">
      {zones.map((z, i) => (
        <div key={i} style={{ width: `${z.width}%` }} className={z.color} />
      ))}
      <div
        className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-base bg-ink"
        style={{ left: `${markerPos}%` }}
      />
    </div>
  );
}

export default function KpiCard({ kpi }: { kpi: Kpi }) {
  const severity = severityOf(kpi);
  const blocked = kpi.status === "blocked";

  return (
    <div
      className={`rounded-lg border border-base-line bg-base-panel p-4 flex flex-col gap-1 ${
        blocked ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-ink-dim leading-snug">{kpi.label}</span>
        <span className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${severityDot[severity]}`} />
      </div>

      <div className="flex items-baseline gap-2">
        <span className={`font-mono font-semibold text-2xl tabular ${severityColor[severity]}`}>
          {formatValue(kpi)}
        </span>
        {kpi.trendDeltaPct !== null && kpi.value !== null && (
          <span
            className={`font-mono text-xs tabular ${
              kpi.trendDeltaPct >= 0 ? "text-signal-good" : "text-signal-bad"
            }`}
          >
            {kpi.trendDeltaPct >= 0 ? "▲" : "▼"} {Math.abs(kpi.trendDeltaPct).toFixed(1)}
            {kpi.unit === "%" ? "pt" : "%"}
          </span>
        )}
      </div>

      <Runway kpi={kpi} />

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wide text-ink-faint">{kpi.source}</span>
        {kpi.status === "sample" && (
          <span className="text-[10px] uppercase tracking-wide text-signal-warn border border-signal-warnDim rounded px-1.5 py-0.5">
            Sample
          </span>
        )}
        {kpi.status === "blocked" && (
          <span className="text-[10px] uppercase tracking-wide text-ink-faint border border-base-line rounded px-1.5 py-0.5">
            Blocked
          </span>
        )}
      </div>

      {kpi.note && <p className="mt-1 text-[11px] text-ink-faint leading-snug">{kpi.note}</p>}
    </div>
  );
}
