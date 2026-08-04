import { Severity } from "@/lib/types";

const stroke: Record<Severity, string> = {
  good: "#3DDC97",
  warn: "#F5B94D",
  bad: "#F2545B",
  neutral: "#8B93A7",
};

/**
 * Trend line for a single KPI. No axes, no legend — the card's value is the
 * label and the line only has to answer "which way is this going".
 *
 * Nothing is drawn with fewer than two real points; an absent sparkline
 * means the history genuinely isn't there yet, never an interpolated line.
 */
export default function Sparkline({
  values,
  severity,
  label,
}: {
  values: number[];
  severity: Severity;
  label: string;
}) {
  if (values.length < 2) return null;

  const w = 100;
  const h = 26;
  const pad = 3;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - pad - ((v - min) / span) * (h - pad * 2);
    return [x, y] as const;
  });

  const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const [lx, ly] = pts[pts.length - 1];
  const color = stroke[severity];

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="mt-2.5 h-[26px] w-full"
      role="img"
      aria-label={`${label} trend across the last ${values.length} daily readings`}
    >
      <path d={d} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
      {/* 2px surface ring so the head of the line stays legible over the mark */}
      <circle cx={lx} cy={ly} r={3.5} fill={color} stroke="#12161F" strokeWidth={2} />
    </svg>
  );
}
