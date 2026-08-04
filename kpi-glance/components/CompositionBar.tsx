"use client";

import { useState } from "react";

/**
 * Part-to-whole for a population, so a percentage can be read against the
 * split it came from.
 *
 * Segments carry a 2px surface gap and a legend with direct counts, so
 * identity never rests on colour alone and the chart is complete without
 * interaction. Hovering a segment or its legend entry highlights the pair
 * and states the count in words.
 */

export interface Segment {
  label: string;
  value: number;
  color: string;
}

/**
 * Alert types form an ordered severity scale, so they take a validated
 * single-hue ordinal ramp rather than four status hues. Four status hues
 * were tried first and failed outright — attendance-drop orange against
 * at-risk red measured normal-vision ΔE 9.6, under the hard floor of 15,
 * which labelling does not excuse.
 *
 * Red ramp on the #141414 card surface: monotone lightness, clear step
 * gaps, darkest step 2.49:1, hue spread 4°.
 */
export const SEG = {
  /** Population split: on the app vs not. */
  good: "#6fd39a",
  neutral: "#3a3a3a",
  /** Severity ramp, most severe first. */
  sev1: "#8f3a3a",
  sev2: "#b85252",
  sev3: "#d18686",
  sev4: "#e8b3b3",
};

export default function CompositionBar({
  title,
  segments,
  totalLabel,
}: {
  title: string;
  segments: Segment[];
  totalLabel: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  const usable = segments.filter((s) => Number.isFinite(s.value) && s.value > 0);
  const total = usable.reduce((sum, s) => sum + s.value, 0);
  if (usable.length < 2 || total <= 0) return null;

  const share = (v: number) => (v / total) * 100;

  return (
    <div className="rounded-2xl border border-base-line bg-base-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <p className="eyebrow">{title}</p>
        <p className="font-mono text-[11px] tabular text-ink-faint">
          {total.toLocaleString()} {totalLabel}
        </p>
      </div>

      <div className="relative mt-4">
        {active && (
          <div className="pointer-events-none absolute -top-1 left-0 z-10 -translate-y-full whitespace-nowrap rounded-md border border-base-line bg-base-raised px-2.5 py-1.5 shadow-lg">
            {(() => {
              const seg = usable.find((s) => s.label === active)!;
              return (
                <>
                  <span className="font-mono text-[11px] tabular text-ink">
                    {seg.value.toLocaleString()}
                  </span>
                  <span className="ml-2 text-[10.5px] text-ink-dim">
                    {seg.label} · {share(seg.value).toFixed(1)}% of {total.toLocaleString()}{" "}
                    {totalLabel}
                  </span>
                </>
              );
            })()}
          </div>
        )}

        <div className="flex h-5 w-full gap-[2px]">
          {usable.map((seg) => (
            <div
              key={seg.label}
              style={{
                width: `${share(seg.value)}%`,
                background: seg.color,
                opacity: active === null || active === seg.label ? 1 : 0.5,
              }}
              className="h-full cursor-default rounded-[3px] transition-opacity"
              onMouseEnter={() => setActive(seg.label)}
              onMouseLeave={() => setActive(null)}
            />
          ))}
        </div>
      </div>

      <ul className="mt-3.5 flex flex-wrap gap-x-4 gap-y-1.5">
        {usable.map((seg) => (
          <li
            key={seg.label}
            className="flex cursor-default items-center gap-1.5 text-[11px] transition-opacity"
            style={{ opacity: active === null || active === seg.label ? 1 : 0.5 }}
            onMouseEnter={() => setActive(seg.label)}
            onMouseLeave={() => setActive(null)}
          >
            <span
              className="h-2 w-2 shrink-0 rounded-[2px]"
              style={{ background: seg.color }}
              aria-hidden
            />
            <span className="text-ink-dim">{seg.label}</span>
            <span className="font-mono tabular text-ink">{seg.value.toLocaleString()}</span>
            <span className="text-ink-faint">
              {share(seg.value).toFixed(share(seg.value) < 10 ? 1 : 0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
