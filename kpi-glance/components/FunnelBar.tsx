/**
 * Stage-by-stage drop-off, so a rate like "Interested Rate 7.4%" can be read
 * against the volumes it came from rather than in isolation.
 *
 * Ordinal single-hue ramp (blue, light → dark), validated for the dark
 * surface: the darkest step used is #184f95 at 2.23:1, above the 2:1 ordinal
 * floor. Every stage is directly labelled, so identity never rests on hue.
 */

export interface Stage {
  label: string;
  value: number;
  /** Optional note shown under the stage, e.g. a conversion off the prior step. */
  note?: string;
}

const RAMP = ["#86b6ef", "#5598e7", "#2a78d6", "#184f95"];

export default function FunnelBar({ title, stages }: { title: string; stages: Stage[] }) {
  const usable = stages.filter((s) => Number.isFinite(s.value));
  if (usable.length < 2 || usable[0].value <= 0) return null;

  const top = usable[0].value;

  return (
    <div className="rounded-xl border border-base-line bg-base-panel p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-dim">{title}</p>

      <div className="mt-3 flex flex-col gap-2">
        {usable.map((stage, i) => {
          const pct = Math.max(1.5, (stage.value / top) * 100);
          const prior = i > 0 ? usable[i - 1].value : null;
          const stepPct = prior && prior > 0 ? (stage.value / prior) * 100 : null;

          return (
            <div key={stage.label} className="flex items-center gap-3">
              <span className="w-[104px] shrink-0 text-[11px] leading-tight text-ink-dim sm:w-[128px]">
                {stage.label}
              </span>

              <div className="relative h-4 flex-1">
                <div
                  className="h-full rounded-[4px]"
                  style={{
                    width: `${pct}%`,
                    background: RAMP[Math.min(i, RAMP.length - 1)],
                  }}
                />
              </div>

              <span className="w-[86px] shrink-0 text-right font-mono text-[12px] tabular text-ink">
                {stage.value.toLocaleString()}
                {stepPct !== null && (
                  <span className="ml-1.5 text-[10.5px] text-ink-faint">
                    {stepPct < 10 ? stepPct.toFixed(1) : Math.round(stepPct)}%
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-2.5 text-[10.5px] leading-snug text-ink-faint">
        Each row shows the count at that stage; the small figure is the share carried over from the
        stage above it.
      </p>
    </div>
  );
}
