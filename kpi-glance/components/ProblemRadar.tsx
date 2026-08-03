import { Kpi, severityOf } from "@/lib/types";

export default function ProblemRadar({ allKpis }: { allKpis: Kpi[] }) {
  const problems = allKpis
    .map((kpi) => ({ kpi, severity: severityOf(kpi) }))
    .filter((x) => x.severity === "bad" || x.severity === "warn")
    .sort((a, b) => (a.severity === "bad" ? -1 : 1));

  if (problems.length === 0) {
    return (
      <div className="rounded-lg border border-signal-goodDim bg-base-panel px-4 py-3 flex items-center gap-2.5">
        <span className="h-2 w-2 rounded-full bg-signal-good shrink-0" />
        <p className="text-sm text-ink">
          Nothing flagged right now — every tracked KPI is inside its green threshold.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-signal-badDim bg-base-panel px-4 py-3">
      <div className="flex items-center gap-2.5 mb-2">
        <span className="h-2 w-2 rounded-full bg-signal-bad shrink-0" />
        <h2 className="font-display font-bold text-sm text-ink uppercase tracking-wide">
          Problem Radar — {problems.length} flagged
        </h2>
      </div>
      <ul className="flex flex-wrap gap-2">
        {problems.map(({ kpi, severity }) => (
          <li
            key={kpi.id}
            className={`text-xs font-medium rounded px-2 py-1 border ${
              severity === "bad"
                ? "border-signal-badDim text-signal-bad"
                : "border-signal-warnDim text-signal-warn"
            }`}
          >
            {kpi.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
