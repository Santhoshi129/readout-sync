import { Kpi } from "@/lib/types";
import KpiCard from "./KpiCard";

export default function SectionBlock({
  title,
  question,
  kpis,
}: {
  title: string;
  question: string;
  kpis: Kpi[];
}) {
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-2.5">
        <h2 className="font-display font-bold text-lg text-ink">{title}</h2>
        <span className="text-xs text-ink-faint uppercase tracking-wide">{question}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
      </div>
    </section>
  );
}
