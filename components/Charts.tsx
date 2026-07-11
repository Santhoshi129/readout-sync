"use client";
import { useState, useEffect } from "react";
import { fmt } from "@/lib/format";
import { Counter } from "@/components/Counter";

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
}: {
  value: number | null;
  total: number | null;
  centerLabel?: string;
}) {
  const v = value ?? 0;
  const t = total ?? 0;
  const trackable = t > 0;
  const pctNum = trackable ? Math.round((v / t) * 100) : 0;
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
          {trackable ? `${pctNum}%` : "N/A"}
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

// Paired comparison bars (e.g. CrossFit vs HYROX) - two series sharing one
// scale so a CEO/CMO can read "which channel is ahead" at a glance, not
// two separate charts they have to mentally overlay themselves.
//
// Beyond the raw bars, this computes a live, plain-English headline from
// the actual numbers (who's ahead, by how much) so the takeaway lands in
// the first second - and a hover state that opens a per-row detail panel
// instead of relying on a native title="" tooltip.
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
  const max = Math.max(1, ...rows.flatMap((r) => [r.a ?? 0, r.b ?? 0]));

  const totalA = rows.reduce((s, r) => s + (r.a ?? 0), 0);
  const totalB = rows.reduce((s, r) => s + (r.b ?? 0), 0);
  const leaderIsA = totalA >= totalB;
  const bigger = Math.max(totalA, totalB);
  const smaller = Math.min(totalA, totalB);
  const ratio = smaller > 0 ? bigger / smaller : bigger > 0 ? Infinity : 1;
  const marginPct = bigger > 0 ? Math.round(((bigger - smaller) / bigger) * 100) : 0;

  const headline =
    totalA === 0 && totalB === 0
      ? "No volume yet on either side."
      : marginPct < 10
      ? `Neck and neck - ${labelA} and ${labelB} are within ${Math.max(marginPct, 1)}% of each other overall.`
      : `${leaderIsA ? labelA : labelB} is ahead of ${leaderIsA ? labelB : labelA} by ${marginPct}%${
          isFinite(ratio) && ratio >= 1.5 ? ` (${ratio.toFixed(1)}\u00d7)` : ""
        } across the funnel.`;

  const active = hover != null ? rows[hover] : null;

  return (
    <div>
      <div className="compare-headline">
        <span className="compare-headline-dot" style={{ background: leaderIsA ? "var(--warm)" : "var(--hot)" }} />
        {headline}
      </div>

      <div className="compare-legend">
        <span><i className="dot-legend" style={{ background: "var(--warm)" }} /> {labelA}</span>
        <span><i className="dot-legend" style={{ background: "var(--hot)" }} /> {labelB}</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        {rows.map((r, i) => {
          const av = r.a ?? 0, bv = r.b ?? 0;
          const aw = Math.max(1.5, (av / max) * 100);
          const bw = Math.max(1.5, (bv / max) * 100);
          const rowLeaderIsA = av >= bv && av > 0;
          const rowLeaderIsB = bv > av;
          return (
            <div
              key={r.label}
              className="chart-row compare-row"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover((h) => (h === i ? null : h))}
              onFocus={() => setHover(i)}
              onBlur={() => setHover((h) => (h === i ? null : h))}
              tabIndex={0}
            >
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontSize: 13.5, color: "var(--ink-dim)" }}>{r.label}</div>
                {(rowLeaderIsA || rowLeaderIsB) && (
                  <div
                    className="compare-leader-chip"
                    style={{ color: rowLeaderIsA ? "var(--warm)" : "var(--hot)" }}
                  >
                    {rowLeaderIsA ? labelA : labelB} leads
                  </div>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <div className="bar-track thin" style={{ flex: 1 }}>
                  <div className="bar-fill" style={{ width: mounted ? `${aw}%` : 0, transitionDelay: `${i * 60}ms`, background: "var(--warm)" }} />
                </div>
                <div style={{ width: 56, textAlign: "right", fontSize: 13, fontWeight: 700 }}><Counter value={r.a} /></div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="bar-track thin" style={{ flex: 1 }}>
                  <div className="bar-fill" style={{ width: mounted ? `${bw}%` : 0, transitionDelay: `${i * 60 + 30}ms`, background: "var(--hot)" }} />
                </div>
                <div style={{ width: 56, textAlign: "right", fontSize: 13, fontWeight: 700 }}><Counter value={r.b} /></div>
              </div>

              {/* Detail strip - only the hovered/focused row expands it, so the
                  chart stays calm at rest and rewards a closer look. */}
              <div className={`compare-detail ${hover === i ? "open" : ""}`}>
                <span>{labelA} {fmt(r.a)}</span>
                <span className="compare-detail-sep">·</span>
                <span>{labelB} {fmt(r.b)}</span>
                <span className="compare-detail-sep">·</span>
                <span>
                  {av + bv > 0
                    ? `split ${Math.round((av / (av + bv)) * 100)} / ${Math.round((bv / (av + bv)) * 100)}`
                    : "no volume yet"}
                </span>
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
}: {
  segments: { label: string; value: number | null; tone: string }[];
  centerLabel: string;
}) {
  const mounted = useMounted();
  const [hover, setHover] = useState<number | null>(null);
  const clean = segments.map((s) => ({ ...s, value: s.value ?? 0 }));
  const total = clean.reduce((a, s) => a + s.value, 0);
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
    <div style={{ display: "flex", alignItems: "center", gap: 36, flexWrap: "wrap" }}>
      <svg width="200" height="200" viewBox="0 0 200 200" style={{ flex: "none" }}>
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
          {active ? fmt(active.value) : fmt(total)}
        </text>
        <text x="100" y={active ? 114 : 120} textAnchor="middle" fontSize="11" fill="var(--ink-faint)" fontFamily="var(--mono)" letterSpacing="1.5">
          {(active ? `${active.label.toUpperCase()} \u00b7 ${active.pct}%` : centerLabel.toUpperCase())}
        </text>
      </svg>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, minWidth: 200 }}>
        {arcs.map((a, i) => (
          <div
            key={a.label}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover((h) => (h === i ? null : h))}
            style={{
              display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
              padding: "6px 8px", margin: "-6px -8px", borderRadius: 8,
              background: hover === i ? "rgba(201,168,76,0.06)" : "transparent",
              transition: "background 150ms ease",
            }}
          >
            <i className="dot-legend" style={{ background: TONE[a.tone] || "var(--amber)", flex: "none" }} />
            <span style={{ fontSize: 13.5, color: "var(--ink-dim)", flex: 1 }}>{a.label}</span>
            <span style={{ fontSize: 14.5, fontWeight: 700 }}><Counter value={a.value} /></span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-faint)", width: 38, textAlign: "right" }}>{a.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
export function GeoList({ rows }: { rows: { label: string; count: number }[] }) {
  const mounted = useMounted();
  const [expanded, setExpanded] = useState(false);
  const top = rows.slice(0, expanded ? 20 : 8);
  const max = Math.max(1, ...top.map((r) => r.count));
  if (top.length === 0) {
    return <div style={{ color: "var(--ink-faint)", fontSize: 13.5 }}>No geo data yet. Populates once the CrossFit/HYROX clean-lead sheets have city/state filled in.</div>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {top.map((r, i) => {
        const w = Math.max(1.5, (r.count / max) * 100);
        return (
          <div key={r.label} className="chart-row" style={{ display: "grid", gridTemplateColumns: "160px 1fr 48px", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 13.5, color: "var(--ink-dim)" }}>{r.label}</div>
            <div className="bar-track thin" title={`${r.label}: ${fmt(r.count)}`}>
              <div className="bar-fill" style={{ width: mounted ? `${w}%` : 0, transitionDelay: `${i * 60}ms`, background: "var(--amber)" }} />
            </div>
            <div style={{ textAlign: "right", fontSize: 15, fontWeight: 700 }}><Counter value={r.count} /></div>
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
