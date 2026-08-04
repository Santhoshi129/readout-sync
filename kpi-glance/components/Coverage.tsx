import { Section } from "@/lib/types";

/**
 * What this dashboard covers and what it doesn't, stated on the page rather
 * than left for someone to ask about in a meeting. Live rows are derived
 * from the sections that actually rendered, so this panel cannot drift out
 * of step with reality.
 */

export interface Pending {
  label: string;
  blocker: string;
  needs: string;
}

const DESCRIPTIONS: Record<string, string> = {
  "product-usage": "How much of the paying member base has actually adopted the app.",
  "member-health": "Which members are drifting — at risk, needing attention, or dropping attendance.",
  pipeline: "Whether the gym-owner pipeline is filling and converting to real interest.",
  outreach: "Whether email and Instagram are earning replies at all.",
};

export default function Coverage({
  sections,
  pending,
}: {
  sections: Section[];
  pending: Pending[];
}) {
  const trackedCount = sections.flatMap((s) => s.kpis).filter((k) => k.threshold !== null).length;

  return (
    <section className="rounded-2xl border border-base-line bg-base-card p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="font-display text-[17px] font-bold text-ink">What this covers</h2>
        <span className="eyebrow ml-auto">
          {trackedCount} KPIs tracked · {pending.length} areas pending
        </span>
      </div>

      <p className="mt-2.5 max-w-3xl text-[12.5px] leading-relaxed text-ink-dim">
        A threshold view, not a report. Every figure is scored green, amber or red against an agreed
        target, and the Problem Radar at the top lists only what is currently off. For raw counts and
        the editorial breakdown of each automation, the Readout dashboard remains the place to look —
        this page deliberately does not duplicate it.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-x-8 gap-y-5 lg:grid-cols-2">
        <div>
          <p className="eyebrow">Live now</p>
          <ul className="mt-2.5 flex flex-col gap-2">
            {sections.map((s) => (
              <li key={s.id} className="flex gap-2.5">
                <span
                  className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-signal-good"
                  aria-hidden
                />
                <p className="text-[12px] leading-snug text-ink-dim">
                  <span className="font-medium text-ink">{s.title}</span>
                  {" — "}
                  {DESCRIPTIONS[s.id] ?? `${s.kpis.length} KPIs.`}{" "}
                  <span className="text-ink-faint">
                    {s.kpis.length} KPI{s.kpis.length === 1 ? "" : "s"} from {s.source}.
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="eyebrow">Not built yet</p>
          <ul className="mt-2.5 flex flex-col gap-2">
            {pending.map((p) => (
              <li key={p.label} className="flex gap-2.5">
                <span
                  className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-ink-muted"
                  aria-hidden
                />
                <p className="text-[12px] leading-snug text-ink-dim">
                  <span className="font-medium text-ink">{p.label}</span>
                  {" — "}
                  {p.blocker}{" "}
                  <span className="text-amber">Needs: {p.needs}</span>
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-5 border-t border-base-lineSoft pt-3.5 text-[11px] leading-relaxed text-ink-faint">
        Nothing here is estimated. A KPI without a confirmed source is left off the page entirely
        rather than filled with a placeholder, and a trend line is drawn only where real daily history
        exists. Thresholds are working placeholders until Kimberly supplies benchmarks.
      </p>
    </section>
  );
}
