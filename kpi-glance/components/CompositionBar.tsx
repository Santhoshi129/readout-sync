/**
 * Part-to-whole for a population, so a percentage can be read against the
 * split it came from.
 *
 * Segments are separated by a 2px surface gap and carry a legend with direct
 * counts, so identity never rests on colour alone. Status hues are only used
 * where the segment genuinely is a status; anything that is a plain category
 * takes the de-emphasis grey.
 */

export interface Segment {
  label: string;
  value: number;
  color: string;
}

/**
 * Alert types form an ordered severity scale, so they take a validated
 * single-hue ordinal ramp (red, light -> dark) rather than four status
 * hues. Four status colours failed the normal-vision separation floor
 * outright -- attendance-drop orange against at-risk red measured dE 9.6,
 * below the hard floor of 15, which no amount of labelling excuses.
 *
 * Ordinal ramp checks on the #12161F panel: monotone lightness, adjacent
 * dL gaps clear, darkest step 2.54:1 vs surface, hue spread 8 degrees.
 */
export const SEG = {
  /** Population split: on the app vs not. */
  good: "#3DDC97",
  neutral: "#5A6274",
  /** Severity ramp, most severe first. */
  sev1: "#a82424",
  sev2: "#df4f4f",
  sev3: "#ef8a8a",
  sev4: "#f7bdbd",
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
  const usable = segments.filter((s) => Number.isFinite(s.value) && s.value > 0);
  const total = usable.reduce((sum, s) => sum + s.value, 0);
  if (usable.length < 2 || total <= 0) return null;

  return (
    <div className="rounded-xl border border-base-line bg-base-panel p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-dim">{title}</p>
        <p className="font-mono text-[11.5px] tabular text-ink-faint">
          {total.toLocaleString()} {totalLabel}
        </p>
      </div>

      <div className="mt-3 flex h-4 w-full gap-[2px] overflow-hidden rounded-[4px]">
        {usable.map((seg) => (
          <div
            key={seg.label}
            style={{ width: `${(seg.value / total) * 100}%`, background: seg.color }}
            className="h-full first:rounded-l-[4px] last:rounded-r-[4px]"
          />
        ))}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {usable.map((seg) => (
          <li key={seg.label} className="flex items-center gap-1.5 text-[11px]">
            <span
              className="h-2 w-2 shrink-0 rounded-[2px]"
              style={{ background: seg.color }}
              aria-hidden
            />
            <span className="text-ink-dim">{seg.label}</span>
            <span className="font-mono tabular text-ink">{seg.value.toLocaleString()}</span>
            <span className="text-ink-faint">
              {((seg.value / total) * 100).toFixed(seg.value / total < 0.1 ? 1 : 0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
