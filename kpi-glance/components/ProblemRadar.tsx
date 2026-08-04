import { Kpi, Section, severityOf, targetText } from "@/lib/types";

interface Flag {
  kpi: Kpi;
  severity: "warn" | "bad";
  sectionTitle: string;
}

function collect(sections: Section[]): Flag[] {
  const flags: Flag[] = [];
  for (const section of sections) {
    for (const kpi of section.kpis) {
      const severity = severityOf(kpi);
      if (severity === "warn" || severity === "bad") {
        flags.push({ kpi, severity, sectionTitle: section.title });
      }
    }
  }
  // Red first, so the worst thing is the first thing read.
  return flags.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "bad" ? -1 : 1));
}

export default function ProblemRadar({ sections }: { sections: Section[] }) {
  const tracked = sections.flatMap((s) => s.kpis).filter((k) => k.threshold !== null);
  const flags = collect(sections);
  const reds = flags.filter((f) => f.severity === "bad").length;

  if (tracked.length === 0) {
    return (
      <div className="rounded-2xl border border-base-line bg-base-card px-5 py-4">
        <p className="text-[13px] text-ink-dim">
          No thresholded KPIs have data yet. The Problem Radar turns on with the first daily sync.
        </p>
      </div>
    );
  }

  if (flags.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-signal-goodDim bg-base-card px-5 py-4">
        <span className="h-2 w-2 shrink-0 rounded-full bg-signal-good" />
        <p className="text-[13.5px] text-ink">
          <span className="font-semibold">All clear.</span>{" "}
          <span className="text-ink-dim">
            All {tracked.length} tracked KPIs are inside their green threshold.
          </span>
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-base-line bg-base-card px-5 py-4">
      <div className="mb-3.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-signal-bad" />
        <h2 className="eyebrow !text-ink-dim">Problem Radar</h2>
        <span className="font-mono text-[10px] text-ink-faint">
          {reds} off target · {flags.length - reds} to watch · {tracked.length} tracked
        </span>
      </div>

      {/* Two columns past four flags so the KPI sections stay above the fold. */}
      <ul className={`grid gap-2 ${flags.length > 4 ? "lg:grid-cols-2" : ""}`}>
        {flags.map(({ kpi, severity, sectionTitle }) => (
          <li
            key={kpi.id}
            className={`flex items-start gap-3 rounded-lg border-l-2 bg-base-raised px-3 py-2.5 ${
              severity === "bad" ? "border-signal-bad" : "border-signal-warn"
            }`}
          >
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-ink">{kpi.label}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-ink-faint">
                {sectionTitle} · {targetText(kpi)} · {kpi.detail}
              </p>
            </div>
            <span
              className={`shrink-0 font-mono text-[14px] font-semibold tabular ${
                severity === "bad" ? "text-signal-bad" : "text-signal-warn"
              }`}
            >
              {kpi.unit === "%" ? `${kpi.value.toFixed(1)}%` : kpi.value.toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
