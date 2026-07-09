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
  const max = Math.max(1, ...rows.flatMap((r) => [r.a ?? 0, r.b ?? 0]));
  return (
    <div>
      <div className="compare-legend">
        <span><i className="dot-legend" style={{ background: "var(--warm)" }} /> {labelA}</span>
        <span><i className="dot-legend" style={{ background: "var(--hot)" }} /> {labelB}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        {rows.map((r, i) => {
          const av = r.a ?? 0, bv = r.b ?? 0;
          const aw = Math.max(1.5, (av / max) * 100);
          const bw = Math.max(1.5, (bv / max) * 100);
          return (
            <div key={r.label} className="chart-row">
              <div style={{ fontSize: 13.5, color: "var(--ink-dim)", marginBottom: 8 }}>{r.label}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <div className="bar-track thin" style={{ flex: 1 }} title={`${labelA}: ${fmt(r.a)}`}>
                  <div className="bar-fill" style={{ width: mounted ? `${aw}%` : 0, transitionDelay: `${i * 60}ms`, background: "var(--warm)" }} />
                </div>
                <div style={{ width: 56, textAlign: "right", fontSize: 13, fontWeight: 700 }}><Counter value={r.a} /></div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="bar-track thin" style={{ flex: 1 }} title={`${labelB}: ${fmt(r.b)}`}>
                  <div className="bar-fill" style={{ width: mounted ? `${bw}%` : 0, transitionDelay: `${i * 60 + 30}ms`, background: "var(--hot)" }} />
                </div>
                <div style={{ width: 56, textAlign: "right", fontSize: 13, fontWeight: 700 }}><Counter value={r.b} /></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Top-locations breakdown from geo_distribution - computed by the backend
// on every load already, just never had anywhere to render until now.
export function GeoList({ rows }: { rows: { label: string; count: number }[] }) {
  const mounted = useMounted();
  const top = rows.slice(0, 8);
  const max = Math.max(1, ...top.map((r) => r.count));
  if (top.length === 0) {
    return <div style={{ color: "var(--ink-faint)", fontSize: 13.5 }}>No geo data yet — populates once the CrossFit/HYROX clean-lead sheets have city/state filled in.</div>;
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
    </div>
  );
}
