import { Section } from "@/lib/types";
import KpiCard from "./KpiCard";
import { relativeSync } from "@/lib/format";

export default function SectionBlock({ section }: { section: Section }) {
  if (section.kpis.length === 0) return null;

  const synced = relativeSync(section.syncedAt);

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-base-line pb-2.5">
        <h2 className="font-display text-[17px] font-bold text-ink">{section.title}</h2>
        {section.purpose && (
          <span className="text-[12px] text-ink-faint">{section.purpose}</span>
        )}
        <span className="eyebrow ml-auto">
          {section.source}
          {synced && ` · ${synced}`}
        </span>
      </div>

      {/*
        A limitation the numbers below cannot speak for themselves about —
        stated before them, not after, so it is read first.
      */}
      {section.caveat && (
        <div className="mb-3 flex gap-2.5 rounded-xl border border-signal-warnDim bg-signal-warnDim/15 px-4 py-3">
          <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-signal-warn" aria-hidden />
          <p className="text-[11.5px] leading-relaxed text-ink-dim">{section.caveat}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {section.kpis.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
      </div>
    </section>
  );
}
