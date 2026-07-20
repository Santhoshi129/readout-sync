"use client";
import { useEffect, useState } from "react";
import { Counter } from "@/components/Counter";
import { AppRelevance, APP_RELEVANCE_MEANING } from "@/lib/retention-research";
import { NumberTip } from "@/components/NumberTip";

const TONE: Record<string, string> = { hot: "var(--hot)", amber: "var(--amber)", muted: "var(--muted)" };

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

export function AppRelevanceDonut({
  segments,
  active,
  onSelect,
}: {
  segments: { key: AppRelevance; label: string; count: number; tone: string }[];
  active?: AppRelevance | null;
  onSelect?: (key: AppRelevance) => void;
}) {
  const mounted = useMounted();
  const [hover, setHover] = useState<number | null>(null);
  const total = segments.reduce((a, s) => a + s.count, 0);
  const R = 70;
  const SW = 30;
  const C = 2 * Math.PI * R;

  let cursor = 0;
  const arcs = segments.map((s) => {
    const frac = total > 0 ? s.count / total : 0;
    const len = frac * C;
    const offset = -cursor;
    cursor += len;
    return { ...s, len, offset, pct: total > 0 ? Math.round(frac * 100) : 0 };
  });

  const highlighted = hover != null ? arcs[hover] : active ? arcs.find((a) => a.key === active) : null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 36, flexWrap: "wrap" }}>
      <svg width={200} height={200} viewBox="0 0 200 200" style={{ flex: "none" }}>
        <circle cx="100" cy="100" r={R} fill="none" stroke="#161616" strokeWidth={SW} />
        {arcs.map((a, i) =>
          a.len > 0 ? (
            <circle
              key={a.key}
              cx="100"
              cy="100"
              r={R}
              fill="none"
              stroke={TONE[a.tone] || "var(--amber)"}
              strokeWidth={hover === i || active === a.key ? SW + 6 : SW}
              strokeDasharray={`${mounted ? a.len : 0} ${C}`}
              strokeDashoffset={a.offset}
              transform="rotate(-90 100 100)"
              style={{
                transition: "stroke-dasharray 900ms cubic-bezier(0.16,1,0.3,1), stroke-width 180ms ease, opacity 180ms ease",
                transitionDelay: `${i * 70}ms`,
                opacity: (hover == null && !active) || hover === i || active === a.key ? 1 : 0.35,
                cursor: onSelect ? "pointer" : "default",
              }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover((h) => (h === i ? null : h))}
              onClick={() => onSelect?.(a.key)}
            />
          ) : null
        )}
        <text x="100" y={highlighted ? 92 : 96} textAnchor="middle" fontSize={highlighted ? 30 : 34} fontWeight="800" fill="var(--ink)">
          {highlighted ? highlighted.count : total}
        </text>
        <text x="100" y={highlighted ? 114 : 120} textAnchor="middle" fontSize="11" fill="var(--ink-faint)" fontFamily="var(--mono)" letterSpacing="1.5">
          {(highlighted ? `${highlighted.label.split(": ")[0].toUpperCase()} \u00b7 ${highlighted.pct}%` : "FINDINGS")}
        </text>
      </svg>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, minWidth: 200 }}>
        {arcs.map((a, i) => {
          const isActive = active === a.key;
          return (
            <div
              key={a.key}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover((h) => (h === i ? null : h))}
              onClick={() => onSelect?.(a.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                cursor: onSelect ? "pointer" : "default",
                padding: "6px 8px",
                margin: "-6px -8px",
                borderRadius: 8,
                background: hover === i || isActive ? "rgba(201,168,76,0.06)" : "transparent",
                transition: "background 150ms ease",
              }}
            >
              <i className="dot-legend" style={{ background: TONE[a.tone] || "var(--amber)", flex: "none" }} />
              <span style={{ fontSize: 13.5, color: isActive ? "var(--amber)" : "var(--ink-dim)", flex: 1, fontWeight: isActive ? 700 : 400 }}>
                {a.label}
              </span>
              <NumberTip text={APP_RELEVANCE_MEANING[a.key]} align="right">
                <span style={{ fontSize: 14.5, fontWeight: 700, borderBottom: "1px dotted var(--ink-faint)" }}>
                  <Counter value={a.count} />
                </span>
              </NumberTip>
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-faint)", width: 38, textAlign: "right" }}>{a.pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
