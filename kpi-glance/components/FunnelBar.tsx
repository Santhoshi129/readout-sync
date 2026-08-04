"use client";

import { useState } from "react";
import { FUNNEL_RAMP as RAMP, Stage } from "@/lib/chart-tokens";

/**
 * Stage-by-stage drop-off, so a rate like "Interested Rate 7.4%" can be read
 * against the volumes it came from rather than in isolation.
 *
 * Every stage is directly labelled with its count and carry-over share, so
 * the chart is complete without interaction; hovering a row adds the drop
 * from the previous stage and the share of the very top of the funnel.
 *
 * Amber ordinal ramp taken from Readout's own accent, validated light→dark
 * on the #141414 card surface: monotone lightness, clear step gaps, darkest
 * step 3.85:1 against the surface.
 */



export default function FunnelBar({ title, stages }: { title: string; stages: Stage[] }) {
  const [active, setActive] = useState<number | null>(null);
  const usable = stages.filter((s) => Number.isFinite(s.value));
  if (usable.length < 2 || usable[0].value <= 0) return null;

  const top = usable[0].value;

  return (
    <div className="rounded-2xl border border-base-line bg-base-card p-5">
      <p className="eyebrow">{title}</p>

      <div className="mt-4 flex flex-col gap-2.5">
        {usable.map((stage, i) => {
          const pct = Math.max(1.5, (stage.value / top) * 100);
          const prior = i > 0 ? usable[i - 1].value : null;
          const stepPct = prior && prior > 0 ? (stage.value / prior) * 100 : null;
          const dropped = prior !== null ? prior - stage.value : null;
          const isActive = active === i;

          return (
            <div
              key={stage.label}
              className="relative flex items-center gap-3 rounded-md px-1 py-0.5 transition-colors hover:bg-base-raised"
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
            >
              <span className="w-[110px] shrink-0 text-[11.5px] leading-tight text-ink-dim sm:w-[132px]">
                {stage.label}
              </span>

              <div className="h-4 flex-1">
                <div
                  className="h-full rounded-[4px] transition-opacity"
                  style={{
                    width: `${pct}%`,
                    background: RAMP[Math.min(i, RAMP.length - 1)],
                    opacity: active === null || isActive ? 1 : 0.55,
                  }}
                />
              </div>

              <span className="w-[92px] shrink-0 text-right font-mono text-[12px] tabular text-ink">
                {stage.value.toLocaleString()}
                {stepPct !== null && (
                  <span className="ml-1.5 text-[10.5px] text-ink-faint">
                    {stepPct < 10 ? stepPct.toFixed(1) : Math.round(stepPct)}%
                  </span>
                )}
              </span>

              {isActive && (
                <div className="pointer-events-none absolute right-0 top-full z-10 mt-1 whitespace-nowrap rounded-md border border-base-line bg-base-raised px-2.5 py-1.5 shadow-lg">
                  <span className="font-mono text-[11px] tabular text-ink">
                    {stage.value.toLocaleString()}
                  </span>
                  <span className="ml-2 text-[10.5px] text-ink-dim">
                    {((stage.value / top) * 100).toFixed(1)}% of the top of the funnel
                    {dropped !== null && dropped > 0 && ` · ${dropped.toLocaleString()} lost here`}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[10.5px] leading-snug text-ink-faint">
        Count at each stage; the small figure is the share carried over from the stage above.
      </p>
    </div>
  );
}
