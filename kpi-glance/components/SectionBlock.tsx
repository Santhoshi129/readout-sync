import { Section } from "@/lib/types";
import KpiCard from "./KpiCard";
import { relativeSync } from "@/lib/format";

export default function SectionBlock({ section }: { section: Section }) {
  if (section.kpis.length === 0) return null;

  const synced = relativeSync(section.syncedAt);

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-base-line pb-2">
        <h2 className="font-display text-[15px] font-bold text-ink">{section.title}</h2>
        <span className="ml-auto text-[10px] uppercase tracking-wide text-ink-faint">
          {section.source}
          {synced && <span className="normal-case tracking-normal"> · {synced}</span>}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {section.kpis.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
      </div>
    </section>
  );
}
