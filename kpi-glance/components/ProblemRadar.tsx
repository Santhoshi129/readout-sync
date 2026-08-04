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
  // Red first, then by how far past the target each one sits.
  return flags.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "bad" ? -1 : 1;
    return 0;
  });
}

export default function ProblemRadar({ sections }: { sections: Section[] }) {
  const tracked = sections.flatMap((s) => s.kpis).filter((k) => k.threshold !== null);
  const flags = collect(sections);

  if (tracked.length === 0) {
    return (
      <div className="rounded-xl border border-base-line bg-base-panel px-4 py-3">
        <p className="text-sm text-ink-dim">
          No thresholded KPIs have data yet — the Problem Radar turns on with the first daily sync.
        </p>
      </div>
    );
  }

  if (flags.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-signal-goodDim bg-base-panel px-4 py-3.5">
        <span className="h-2 w-2 shrink-0 rounded-full bg-signal-good" />
        <p className="text-sm text-ink">
          <span className="font-semibold">All clear.</span>{" "}
          <span className="text-ink-dim">
            All {tracked.length} tracked KPIs are inside their green threshold.
          </span>
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-signal-badDim bg-base-panel px-4 py-3.5 sm:px-5">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="h-2 w-2 shrink-0 rounded-full bg-signal-bad" />
        <h2 className="font-display text-[11px] font-bold uppercase tracking-[0.09em] text-ink-dim">
          Problem Radar
        </h2>
        <span className="rounded-full bg-signal-bad px-2 py-[1px] text-[10px] font-bold text-base">
          {flags.length}
        </span>
        <span className="text-[11px] text-ink-faint">everything off target right now</span>
      </div>

      {/* Two columns once there are enough flags to push the KPI sections
          below the fold — the radar has to stay glanceable. */}
      <ul className={`grid gap-2 ${flags.length > 4 ? "lg:grid-cols-2" : ""}`}>
        {flags.map(({ kpi, severity, sectionTitle }) => (
          <li
            key={kpi.id}
            className={`flex items-start gap-3 rounded-lg bg-base-raised px-3 py-2.5 border-l-[3px] ${
              severity === "bad" ? "border-signal-bad" : "border-signal-warn"
            }`}
          >
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold text-ink">{kpi.label}</p>
              <p className="mt-0.5 text-[11.5px] leading-snug text-ink-dim">
                {sectionTitle} · {targetText(kpi)} · {kpi.detail}
              </p>
            </div>
            <span
              className={`shrink-0 font-mono text-[15px] font-semibold tabular ${
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
