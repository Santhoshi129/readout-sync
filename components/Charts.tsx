"use client";
import { useState, useEffect } from "react";
import { fmt } from "@/lib/format";
import { Counter } from "@/components/Counter";
import { InfoTip } from "@/components/InfoTip";

const TONE: Record<string, string> = {
  cold: "var(--cold)",
  warm: "var(--warm)",
  hot: "var(--hot)",
  amber: "var(--amber)",
  muted: "var(--muted)",
  bad: "var(--bad)",
};

export function Ring({
  value,
  total,
  centerLabel,
  pctOverride,
}: {
  value: number | null;
  total: number | null;
  centerLabel?: string;
  // When the exact percentage is already computed server-side (e.g.
  // adoption_rate_pct), pass it here so this ring shows the identical
  // number as everywhere else on the page instead of re-deriving its own
  // rounded version, which can land on a different whole number (36.7%
  // upstream vs a locally rounded 37% here).
  pctOverride?: number | null;
}) {
  const v = value ?? 0;
  const t = total ?? 0;
  const trackable = t > 0;
  const pctNum = trackable ? (pctOverride ?? Math.round((v / t) * 100)) : 0;
  const pctDisplay = pctOverride != null ? pctOverride : pctNum;
  const R = 78;
  const C = 2 * Math.PI * R;
  const dash = (Math.min(pctNum, 100) / 100) * C;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
      <svg width="200" height="200" viewBox="0 0 200 200">
        <defs>
          <linearGradient id="ringgrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--amber-bright)" />
            <stop offset="100%" stopColor="var(--amber-deep)" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r={R} fill="none" stroke="#1e1e1e" strokeWidth="14" />
        <circle
          className="ring-arc"
          cx="100"
          cy="100"
          r={R}
          fill="none"
          stroke={trackable ? "url(#ringgrad)" : "var(--muted)"}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${C}`}
          transform="rotate(-90 100 100)"
        />
        <text x="100" y="96" textAnchor="middle" fontSize="42" fontWeight="800" fill={trackable ? "var(--amber)" : "var(--ink-faint)"}>
          {trackable ? `${pctDisplay}%` : "N/A"}
        </text>
        <text x="100" y="122" textAnchor="middle" fontSize="13" fill="var(--ink-faint)" fontFamily="var(--mono)">
          {trackable ? <>{fmt(v)} / {fmt(t)}</> : "denominator not tracked yet"}
        </text>
        {centerLabel && (
          <text x="100" y="140" textAnchor="middle" fontSize="10" fill="var(--ink-faint)" fontFamily="var(--mono)" letterSpacing="2">
            {centerLabel.toUpperCase()}
          </text>
        )}
      </svg>
    </div>
  );
}

export function Funnel({
  rows,
}: {
  rows: { label: string; value: number | null; tone?: string }[];
}) {
  const mounted = useMounted();
  const max = Math.max(1, ...rows.map((r) => r.value ?? 0));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {rows.map((r, i) => {
        const v = r.value ?? 0;
        const w = Math.max(2, (v / max) * 100);
        const prev = i > 0 ? rows[i - 1].value ?? 0 : null;
        const drop = prev && prev > 0 ? ((v / prev) * 100).toFixed(1) : null;
        return (
          <div key={r.label} className="chart-row" style={{ display: "grid", gridTemplateColumns: "160px 1fr 120px", alignItems: "center", gap: 18 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{r.label}</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.14em", color: "var(--ink-faint)", textTransform: "uppercase" }}>
                Step {String(i + 1).padStart(2, "0")}
              </div>
            </div>
            <div className="bar-track" title={`${r.label}: ${fmt(r.value)}${drop ? ` (${drop}% kept from previous step)` : ""}`}>
              <div
                className="bar-fill"
                style={{
                  width: mounted ? `${w}%` : 0,
                  transitionDelay: `${i * 90}ms`,
                  background: `linear-gradient(90deg, ${TONE[r.tone || "cold"]}, ${TONE[rows[Math.min(i + 1, rows.length - 1)].tone || "amber"]})`,
                }}
              />
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 26, fontWeight: 800 }}><Counter value={r.value} /></div>
              {drop && (
                <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--amber)" }}>{drop}% kept</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Bars({
  rows,
}: {
  rows: { label: string; value: number | null; tone?: string }[];
}) {
  const mounted = useMounted();
  const max = Math.max(1, ...rows.map((r) => r.value ?? 0));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {rows.map((r, i) => {
        const v = r.value ?? 0;
        const w = Math.max(1.5, (v / max) * 100);
        return (
          <div key={r.label} className="chart-row" style={{ display: "grid", gridTemplateColumns: "150px 1fr 64px", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 13.5, color: "var(--ink-dim)" }}>{r.label}</div>
            <div className="bar-track thin" title={`${r.label}: ${fmt(r.value)}`}>
              <div
                className="bar-fill"
                style={{ width: mounted ? `${w}%` : 0, transitionDelay: `${i * 60}ms`, background: TONE[r.tone || "amber"] }}
              />
            </div>
            <div style={{ textAlign: "right", fontSize: 16, fontWeight: 700 }}><Counter value={r.value} /></div>
          </div>
        );
      })}
    </div>
  );
}

// Triggers the grow-in transition on mount instead of bars appearing at full
// width instantly - a small page-load sequence rather than a static render.
function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

// Paired comparison (e.g. CrossFit vs HYROX) - a diverging "tug of war" bar
// per row, both series pulling from a shared center line. This is the
// standard shape for a two-way comparison (the kind an analyst would
// actually reach for) rather than two stacked progress bars, reads in
// roughly half the vertical space, and keeps the two sides on genuinely
// distinct colors (amber vs blue) instead of two shades of the same hue.
export function Compare({
  rows,
  labelA,
  labelB,
}: {
  rows: { label: string; a: number | null; b: number | null }[];
  labelA: string;
  labelB: string;
}) {
  const mounted = useMounted();
  const [hover, setHover] = useState<number | null>(null);

  // Headline used to sum every row's raw value across A and B - which is
  // wrong whenever the rows aren't independent, additive quantities. Two
  // concrete failures that shipped: (1) a "Combined" row that's already the
  // sum of the two rows above it got summed AGAIN into the total, silently
  // doubling the gap; (2) rows like "Contacts in CRM" and "Hot leads" got
  // added together even though hot leads is already a subset of contacts,
  // mixing a whole with one of its own parts. Neither is fixable by
  // filtering specific rows out (every Compare instance uses different
  // rows), so the headline now counts which side wins more ROWS instead of
  // summing raw magnitudes - that comparison is valid no matter what unit
  // or relationship the rows have to each other.
  const decided = rows.filter((r) => (r.a ?? 0) !== (r.b ?? 0));
  const aWins = decided.filter((r) => (r.a ?? 0) > (r.b ?? 0)).length;
  const bWins = decided.length - aWins;
  const leaderIsA = aWins >= bWins;

  const headline =
    decided.length === 0
      ? "No volume yet on either side."
      : aWins === bWins
      ? `Even split. ${labelA} and ${labelB} are each ahead on ${aWins} of ${decided.length} metrics.`
      : `${leaderIsA ? labelA : labelB} leads on ${leaderIsA ? aWins : bWins} of ${decided.length} metrics, ${leaderIsA ? labelB : labelA} on ${leaderIsA ? bWins : aWins}.`;

  return (
    <div>
      <div className="compare-headline">
        <span className="compare-headline-dot" style={{ background: leaderIsA ? "var(--series-a)" : "var(--series-b)" }} />
        {headline}
      </div>

      <div className="compare-legend">
        <span><i className="dot-legend" style={{ background: "var(--series-a)" }} /> {labelA}</span>
        <span><i className="dot-legend" style={{ background: "var(--series-b)" }} /> {labelB}</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {rows.map((r, i) => {
          const av = r.a ?? 0, bv = r.b ?? 0;
          // Per-row scaling, not a shared global max: a row like "Contacts
          // in CRM" (thousands) used to share one scale with a row like
          // "Hot leads" (tens), so the small row's bars were invisible
          // slivers even though it's the exact comparison someone opened
          // this card to read. Each row now scales against its own larger
          // side, so every row is legible regardless of absolute magnitude
          // differences between metrics.
          const rowMax = Math.max(1, av, bv);
          const aw = av > 0 ? Math.max(3, (av / rowMax) * 100) : 0;
          const bw = bv > 0 ? Math.max(3, (bv / rowMax) * 100) : 0;
          const rowLeaderIsA = av >= bv && av > 0;
          const rowLeaderIsB = bv > av;
          const rowBigger = Math.max(av, bv), rowSmaller = Math.min(av, bv);
          const rowDeltaPct = rowBigger > 0 ? Math.round(((rowBigger - rowSmaller) / rowBigger) * 100) : 0;
          return (
            <div
              key={r.label}
              className="compare-diverge-row"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover((h) => (h === i ? null : h))}
              onFocus={() => setHover(i)}
              onBlur={() => setHover((h) => (h === i ? null : h))}
              tabIndex={0}
            >
              <div className="compare-diverge-side left">
                <span className="compare-diverge-value"><Counter value={r.a} /></span>
                <div className="compare-diverge-track">
                  <div
                    className="compare-diverge-fill"
                    style={{ width: mounted ? `${aw}%` : 0, transitionDelay: `${i * 55}ms`, background: "var(--series-a)" }}
                  />
                </div>
              </div>

              <div className="compare-diverge-center">
                <div className="compare-diverge-label">{r.label}</div>
                <div className={`compare-leader-chip ${hover === i ? "on" : ""}`} style={{ color: rowLeaderIsA ? "var(--series-a)" : rowLeaderIsB ? "var(--series-b)" : "var(--ink-faint)" }}>
                  {rowLeaderIsA || rowLeaderIsB ? `${rowLeaderIsA ? labelA : labelB} +${rowDeltaPct}%` : "even"}
                </div>
              </div>

              <div className="compare-diverge-side right">
                <div className="compare-diverge-track">
                  <div
                    className="compare-diverge-fill"
                    style={{ width: mounted ? `${bw}%` : 0, transitionDelay: `${i * 55 + 25}ms`, background: "var(--series-b)" }}
                  />
                </div>
                <span className="compare-diverge-value"><Counter value={r.b} /></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Interactive categorical breakdown (e.g. reply outcomes: interested / not
// interested / auto-responder / auto-ack / other). A donut reads faster than
// a bar list for "what's the mix" questions - hovering a slice or a legend
// row highlights the other, and the center swaps from "total" to the
// hovered segment's own count and share, so the exact number is always one
// glance away without needing a native tooltip.
export function Donut({
  segments,
  centerLabel,
  centerValue,
  size = 200,
  compact = false,
}: {
  segments: { label: string; value: number | null; tone: string }[];
  centerLabel: string;
  // When a known authoritative total exists elsewhere (e.g. the raw
  // email_replied tag count), pass it here so the big number in the
  // middle matches that instead of the sum of these segments, which can
  // legitimately differ when classification runs behind or double-tags.
  centerValue?: number | null;
  // Smaller footprint for tight grids (e.g. 4-across) without changing
  // every other Donut on the dashboard.
  size?: number;
  compact?: boolean;
}) {
  const mounted = useMounted();
  const [hover, setHover] = useState<number | null>(null);
  const clean = segments.map((s) => ({ ...s, value: s.value ?? 0 }));
  const total = clean.reduce((a, s) => a + s.value, 0);
  const displayTotal = centerValue ?? total;
  const R = 70;
  const SW = 30;
  const C = 2 * Math.PI * R;

  let cursor = 0;
  const arcs = clean.map((s) => {
    const frac = total > 0 ? s.value / total : 0;
    const len = frac * C;
    const offset = -cursor;
    cursor += len;
    return { ...s, len, offset, pct: total > 0 ? Math.round(frac * 100) : 0 };
  });

  const active = hover != null ? arcs[hover] : null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: compact ? 16 : 36, flexWrap: "wrap" }}>
      <svg width={size} height={size} viewBox="0 0 200 200" style={{ flex: "none" }}>
        <circle cx="100" cy="100" r={R} fill="none" stroke="#161616" strokeWidth={SW} />
        {arcs.map((a, i) =>
          a.len > 0 ? (
            <circle
              key={a.label}
              cx="100"
              cy="100"
              r={R}
              fill="none"
              stroke={TONE[a.tone] || "var(--amber)"}
              strokeWidth={hover === i ? SW + 6 : SW}
              strokeDasharray={`${mounted ? a.len : 0} ${C}`}
              strokeDashoffset={a.offset}
              transform="rotate(-90 100 100)"
              style={{
                transition: "stroke-dasharray 900ms cubic-bezier(0.16,1,0.3,1), stroke-width 180ms ease, opacity 180ms ease",
                transitionDelay: `${i * 70}ms`,
                opacity: hover == null || hover === i ? 1 : 0.35,
                cursor: "pointer",
              }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover((h) => (h === i ? null : h))}
            />
          ) : null
        )}
        <text x="100" y={active ? 92 : 96} textAnchor="middle" fontSize={active ? 30 : 34} fontWeight="800" fill="var(--ink)">
          {active ? fmt(active.value) : fmt(displayTotal)}
        </text>
        <text x="100" y={active ? 114 : 120} textAnchor="middle" fontSize="11" fill="var(--ink-faint)" fontFamily="var(--mono)" letterSpacing="1.5">
          {(active ? `${active.label.toUpperCase()} \u00b7 ${active.pct}%` : centerLabel.toUpperCase())}
        </text>
      </svg>

      <div style={{ display: "flex", flexDirection: "column", gap: compact ? 6 : 10, flex: 1, minWidth: compact ? 110 : 200 }}>
        {arcs.map((a, i) => (
          <div
            key={a.label}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover((h) => (h === i ? null : h))}
            style={{
              display: "flex", alignItems: "center", gap: compact ? 6 : 10, cursor: "pointer",
              padding: compact ? "3px 4px" : "6px 8px", margin: compact ? "-3px -4px" : "-6px -8px", borderRadius: 8,
              background: hover === i ? "rgba(201,168,76,0.06)" : "transparent",
              transition: "background 150ms ease",
            }}
          >
            <i className="dot-legend" style={{ background: TONE[a.tone] || "var(--amber)", flex: "none" }} />
            <span style={{ fontSize: compact ? 11.5 : 13.5, color: "var(--ink-dim)", flex: 1 }}>{a.label}</span>
            <span style={{ fontSize: compact ? 12.5 : 14.5, fontWeight: 700 }}><Counter value={a.value} /></span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-faint)", width: 38, textAlign: "right" }}>{a.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
// Time-series trend line(s), built from readout_history snapshots. Honest
// about sparse data: with under 2 points it explains why instead of drawing
// a misleading flat/empty line. Multiple series share one y-scale so their
// shapes are comparable; each gets its own color and a value readout on
// hover via the nearest-point vertical guide.
export function Trend({
  points,
  series,
  height = 220,
}: {
  points: { ts: string; metrics: Record<string, number> }[];
  series: { key: string; label: string; tone: string }[];
  height?: number;
}) {
  const mounted = useMounted();
  const [hover, setHover] = useState<number | null>(null);

  if (points.length < 2) {
    return (
      <div style={{ color: "var(--ink-faint)", fontSize: 13.5, padding: "24px 0" }}>
        Not enough history yet to plot a trend - the sync job appends one snapshot every run, so this fills in over the next few hours/days. No placeholder line shown in the meantime.
      </div>
    );
  }

  const W = 800;
  const H = height;
  const padL = 8, padR = 8, padT = 16, padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const allVals = points.flatMap((p) => series.map((s) => p.metrics[s.key] ?? 0));
  const maxV = Math.max(1, ...allVals);
  const minV = Math.min(0, ...allVals);
  const range = maxV - minV || 1;

  // Time-proportional, not index-proportional: with 10-minute snapshots,
  // equal spacing per point made a handful of clustered-in-time points
  // look evenly spread across the whole width, which is what made the
  // line look like it was landing in a different, confusing spot every
  // time the data changed. Spacing by real elapsed time means gaps in
  // history show as visual gaps instead of being silently smoothed away.
  const t0 = new Date(points[0].ts).getTime();
  const t1 = new Date(points[points.length - 1].ts).getTime();
  const trange = t1 - t0 || 1;
  const x = (i: number) => padL + ((new Date(points[i].ts).getTime() - t0) / trange) * innerW;
  const y = (v: number) => padT + innerH - ((v - minV) / range) * innerH;

  const pathFor = (key: string) =>
    points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.metrics[key] ?? 0).toFixed(1)}`).join(" ");

  const first = new Date(points[0].ts);
  const last = new Date(points[points.length - 1].ts);
  const fmtDate = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <div>
      <div style={{ display: "flex", gap: 18, marginBottom: 14, flexWrap: "wrap" }}>
        {series.map((s) => (
          <span key={s.key} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "var(--ink-dim)" }}>
            <i className="dot-legend" style={{ background: TONE[s.tone] || "var(--amber)" }} />
            {s.label}
          </span>
        ))}
      </div>
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", overflow: "visible" }}
        onMouseLeave={() => setHover(null)}
      >
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={padL} x2={W - padR} y1={padT + innerH * f} y2={padT + innerH * f} stroke="#1e1e1e" strokeWidth="1" />
        ))}
        {series.map((s) => (
          <path
            key={s.key}
            d={pathFor(s.key)}
            fill="none"
            stroke={TONE[s.tone] || "var(--amber)"}
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            style={{
              strokeDasharray: 2000,
              strokeDashoffset: mounted ? 0 : 2000,
              transition: "stroke-dashoffset 900ms cubic-bezier(0.16,1,0.3,1)",
            }}
          />
        ))}
        {hover != null && (
          <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + innerH} stroke="var(--ink-faint)" strokeWidth="1" strokeDasharray="3 3" />
        )}
        {points.map((p, i) => (
          <rect
            key={i}
            x={x(i) - innerW / points.length / 2}
            y={padT}
            width={innerW / points.length}
            height={innerH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}
        {hover != null &&
          series.map((s) => (
            <circle key={s.key} cx={x(hover)} cy={y(points[hover].metrics[s.key] ?? 0)} r="4" fill={TONE[s.tone] || "var(--amber)"} />
          ))}
        <text x={padL} y={H - 6} fontSize="10.5" fill="var(--ink-faint)" fontFamily="var(--mono)">{fmtDate(first)}</text>
        <text x={W - padR} y={H - 6} fontSize="10.5" fill="var(--ink-faint)" fontFamily="var(--mono)" textAnchor="end">{fmtDate(last)}</text>
      </svg>
      {hover != null && (
        <div style={{ display: "flex", gap: 18, marginTop: 8, flexWrap: "wrap", fontFamily: "var(--mono)", fontSize: 12 }}>
          <span style={{ color: "var(--ink-faint)" }}>{new Date(points[hover].ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
          {series.map((s) => (
            <span key={s.key} style={{ color: TONE[s.tone] || "var(--amber)" }}>{s.label}: {fmt(points[hover].metrics[s.key] ?? 0)}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// Two-level reply breakdown. Top level is always Positive / Negative /
// Automated-or-other - the three outcomes anyone actually asks about first.
// "Automated" is a real grouping of auto-responder + auto-ack + uncategorized
// other (or auto-ack + needs-review for the IG Bridge variant) - nothing
// invented, just regrouped so the first thing you see is the 3-way outcome
// instead of a flat 5-way split where the automated noise is mixed in at
// the same visual weight as a real human reply. Click "Automated" to drill
// into what it's actually made of; collapses back on a second click.
export function ReplyBreakdown({
  positive,
  negative,
  automated,
  positiveLabel = "Positive",
  negativeLabel = "Negative",
  automatedLabel = "Automated / other",
  centerLabel = "replied",
  centerValue,
  hoverPrefix = "Hover for what's inside",
  breakdown,
}: {
  positive: number | null;
  negative: number | null;
  automated: number | null;
  positiveLabel?: string;
  negativeLabel?: string;
  automatedLabel?: string;
  centerLabel?: string;
  centerValue?: number | null;
  hoverPrefix?: string;
  breakdown: { label: string; value: number | null; tone: string }[];
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div>
      <Donut
        centerLabel={centerLabel}
        centerValue={centerValue}
        segments={[
          { label: positiveLabel, value: positive, tone: "hot" },
          { label: negativeLabel, value: negative, tone: "bad" },
          { label: automatedLabel, value: automated, tone: "muted" },
        ]}
      />
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          marginTop: 16, border: "1px solid var(--border-soft, #2a2a2a)", borderRadius: 10,
          padding: "10px 14px", cursor: "default",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--amber)", fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {hoverPrefix} &quot;{automatedLabel}&quot; ({fmt(automated)})
        </div>
        {hovered && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border-soft, #222)" }}>
            <Bars rows={breakdown} />
          </div>
        )}
      </div>
    </div>
  );
}

// Clean stat-tile grid: big number, short label, and a note that only
// expands on hover so the card stays uncluttered at rest but still
// explains itself when someone actually wants to know. This is the same
// visual language as the flow detail pages' "Report: live impact" tiles,
// reused here so the main dashboards get it too.
export function StatTiles({ tiles }: { tiles: { label: string; value: number | null; note?: string; tip?: string; tone?: string; suffix?: string; flag?: string }[] }) {
  return (
    <div className="grid grid-3" style={{ gap: 16 }}>
      {tiles.map((t, i) => (
        <StatTile key={i} {...t} />
      ))}
    </div>
  );
}

function StatTile({ label, value, note, tip, tone, suffix, flag }: { label: string; value: number | null; note?: string; tip?: string; tone?: string; suffix?: string; flag?: string }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      className="card"
      style={{ padding: 24, position: "relative", overflow: "hidden" }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div
        style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, ${TONE[tone || "amber"]}, transparent)`,
          opacity: hover ? 1 : 0.5, transition: "opacity 200ms ease",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: tone ? TONE[tone] : "var(--ink-faint)" }}>
          {label}
          {tip && <InfoTip text={tip} />}
        </div>
        {flag && flag !== "live" && (
          <span className={`chip ${flag}`} style={{ fontSize: 9 }}>
            {flag === "cached" ? "cached" : flag === "not-instrumented" ? "n/a" : "canary"}
          </span>
        )}
      </div>
      <div style={{ fontFamily: "var(--font-head)", fontSize: 32, fontWeight: 800, marginTop: 8 }}>
        <Counter value={value} />
        {suffix && value != null && <span className="stat-suffix">{suffix}</span>}
      </div>
      {note && (
        <div
          style={{
            color: "var(--ink-faint)", fontSize: 11.5, lineHeight: 1.5,
            maxHeight: hover ? 60 : 0, opacity: hover ? 1 : 0, marginTop: hover ? 10 : 0,
            overflow: "hidden", transition: "all 200ms ease",
          }}
        >
          {note}
        </div>
      )}
    </div>
  );
}


export function GeoList({ rows }: { rows: { label: string; count: number; names?: string[] }[] }) {
  const mounted = useMounted();
  const [expanded, setExpanded] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const top = rows.slice(0, expanded ? 20 : 8);
  const max = Math.max(1, ...top.map((r) => r.count));
  if (top.length === 0) {
    return <div style={{ color: "var(--ink-faint)", fontSize: 13.5 }}>No geo data yet. Populates once the CrossFit/HYROX clean-lead sheets have city/state filled in.</div>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {top.map((r, i) => {
        const w = Math.max(1.5, (r.count / max) * 100);
        const names = r.names || [];
        return (
          <div key={r.label}>
            <div
              className="chart-row"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover((h) => (h === i ? null : h))}
              style={{ display: "grid", gridTemplateColumns: "160px 1fr 48px", alignItems: "center", gap: 16, cursor: names.length ? "pointer" : "default" }}
            >
              <div style={{ fontSize: 13.5, color: "var(--ink-dim)" }}>{r.label}</div>
              <div className="bar-track thin">
                <div className="bar-fill" style={{ width: mounted ? `${w}%` : 0, transitionDelay: `${i * 60}ms`, background: hover === i ? "var(--amber-bright, #e0bc5f)" : "var(--amber)" }} />
              </div>
              <div style={{ textAlign: "right", fontSize: 15, fontWeight: 700 }}><Counter value={r.count} /></div>
            </div>
            {hover === i && names.length > 0 && (
              <div style={{ marginTop: 8, marginLeft: 0, display: "flex", flexWrap: "wrap", gap: 6, animation: "fadeIn 120ms ease" }}>
                {names.map((nm) => (
                  <span key={nm} style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-dim)", background: "rgba(201,168,76,0.08)", border: "1px solid var(--border-soft, #222)", borderRadius: 6, padding: "3px 8px" }}>
                    {nm}
                  </span>
                ))}
                {r.count > names.length && (
                  <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-faint)", padding: "3px 4px" }}>+{r.count - names.length} more</span>
                )}
              </div>
            )}
          </div>
        );
      })}
      {rows.length > 8 && (
        <button
          onClick={() => setExpanded((e) => !e)}
          style={{ background: "transparent", border: "1px solid var(--border, #2a2a2a)", borderRadius: 999, color: "var(--amber)", fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", padding: "6px 12px", cursor: "pointer", alignSelf: "flex-start", marginTop: 4 }}
        >
          {expanded ? "Show top 8" : `Show top 20 of ${rows.length}`}
        </button>
      )}
    </div>
  );
}
