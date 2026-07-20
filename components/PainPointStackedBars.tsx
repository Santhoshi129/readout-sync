"use client";
import { useEffect, useState } from "react";
import { painPointLabel, PainPointExample, PAIN_POINT_MEANING } from "@/lib/retention-research";

const TIER_COLOR: Record<string, string> = {
  strong: "var(--hot)",
  moderate: "var(--amber)",
  weak: "var(--muted)",
};

const TIER_DEF: Record<string, string> = {
  strong: "Strong: specific, credible, unambiguous. High trust it's a real, on-topic retention finding.",
  moderate: "Moderate: plausible and on-topic, but less specific or less certain than strong.",
  weak: "Weak: worth watching, not yet settled. Treat as a lead, not a conclusion.",
};

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

const VISIBLE_CAP = 15;

export function PainPointStackedBars({
  rows,
  active,
  onSelect,
  examples,
}: {
  rows: [string, { weak: number; moderate: number; strong: number; total: number }][];
  active?: string | null;
  onSelect?: (pp: string) => void;
  examples?: Record<string, PainPointExample[]>;
}) {
  const mounted = useMounted();
  const max = Math.max(1, ...rows.map(([, v]) => v.total));
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [hoverLabel, setHoverLabel] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Same reasoning as SolutionBars: rows arrive sorted by total descending,
  // and past a point every extra row is a one-off category. Cap the
  // default render and let the tail expand on demand.
  const tail = rows.slice(VISIBLE_CAP);
  const visibleRows = expanded ? rows : rows.slice(0, VISIBLE_CAP);
  const tailAllSame = tail.length > 0 && tail.every(([, v]) => v.total === tail[0][1].total);
  const tailLabel = tail.length === 0 ? "" : tailAllSame
    ? `+${tail.length} more ${tail.length === 1 ? "category" : "categories"} (mentioned ${tail[0][1].total === 1 ? "once" : `${tail[0][1].total}x`} each)`
    : `+${tail.length} more categories (${tail[tail.length - 1][1].total}-${tail[0][1].total} mentions each)`;

  return (
    <div>
      <div className="compare-legend" style={{ marginBottom: 22 }}>
        {(["strong", "moderate", "weak"] as const).map((t) => (
          <span key={t} title={TIER_DEF[t]} style={{ cursor: "help" }}>
            <i className="dot-legend" style={{ background: TIER_COLOR[t] }} /> {t[0].toUpperCase() + t.slice(1)}
          </span>
        ))}
        {onSelect && (
          <span style={{ marginLeft: "auto", color: "var(--ink-faint)", fontStyle: "italic" }}>
            click a row to filter findings below
          </span>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {visibleRows.map(([pp, v], i) => {
          const isActive = active === pp;
          return (
            <div
              key={pp}
              className="chart-row"
              onClick={() => onSelect?.(pp)}
              style={{
                display: "grid",
                gridTemplateColumns: "220px 1fr 44px",
                alignItems: "center",
                gap: 16,
                cursor: onSelect ? "pointer" : "default",
                padding: "4px 8px",
                margin: "-4px -8px",
                borderRadius: 8,
                background: isActive ? "rgba(201,168,76,0.08)" : "transparent",
                transition: "background 150ms ease",
              }}
            >
              <div
                style={{ position: "relative" }}
                onMouseEnter={() => setHoverLabel(pp)}
                onMouseLeave={() => setHoverLabel((h) => (h === pp ? null : h))}
              >
                <div
                  style={{
                    fontSize: 13.5,
                    color: isActive ? "var(--amber)" : "var(--ink-dim)",
                    fontWeight: isActive ? 700 : 400,
                    cursor: PAIN_POINT_MEANING[pp] || examples?.[pp]?.length ? "help" : "default",
                    borderBottom: PAIN_POINT_MEANING[pp] || examples?.[pp]?.length ? "1px dotted var(--ink-faint)" : "none",
                    display: "inline-block",
                  }}
                >
                  {painPointLabel(pp)}
                </div>
                {hoverLabel === pp ? (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      marginTop: 8,
                      width: 320,
                      background: "var(--card-raised)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      padding: "12px 14px",
                      fontSize: 12,
                      color: "var(--ink-dim)",
                      lineHeight: 1.55,
                      zIndex: 60,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                      cursor: "default",
                    }}
                  >
                    {PAIN_POINT_MEANING[pp] && (
                      <div style={{ color: "var(--ink)", marginBottom: examples?.[pp]?.length ? 10 : 0, paddingBottom: examples?.[pp]?.length ? 10 : 0, borderBottom: examples?.[pp]?.length ? "1px solid var(--border-soft)" : "none" }}>
                        {PAIN_POINT_MEANING[pp]}
                      </div>
                    )}
                    {examples?.[pp]?.length ? (
                      <>
                        <div style={{ fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: "0.06em", color: "var(--ink-faint)", marginBottom: 6 }}>
                          IN THEIR OWN WORDS
                        </div>
                        {examples[pp].map((ex, idx) => (
                          <div key={idx} style={{ marginBottom: idx < examples[pp].length - 1 ? 5 : 0 }} title={ex.reasoning}>
                            • {ex.short}
                          </div>
                        ))}
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  padding: "10px 0",
                  margin: "-10px 0",
                  opacity: active && !isActive ? 0.45 : 1,
                  transition: "opacity 150ms ease",
                }}
              >
                <div className="bar-track thin" style={{ display: "flex", width: "100%" }}>
                  {(["strong", "moderate", "weak"] as const).map((t) => {
                    const w = mounted ? (v[t] / max) * 100 : 0;
                    const key = `${pp}:${t}`;
                    if (v[t] === 0) return null;
                    return (
                      <div
                        key={t}
                        onMouseEnter={(e) => {
                          e.stopPropagation();
                          setHoverKey(key);
                        }}
                        onMouseLeave={() => setHoverKey((h) => (h === key ? null : h))}
                        style={{
                          width: `${w}%`,
                          flex: "none",
                          cursor: "help",
                          position: "relative",
                        }}
                      >
                        <div
                          className="bar-fill"
                          style={{
                            width: "100%",
                            background: TIER_COLOR[t],
                            transitionDelay: `${i * 50}ms`,
                          }}
                        />
                        {hoverKey === key && (
                          <div
                            style={{
                              position: "absolute",
                              bottom: "140%",
                              left: "50%",
                              transform: "translateX(-50%)",
                              width: 220,
                              background: "var(--card-raised)",
                              border: "1px solid var(--border)",
                              borderRadius: 10,
                              padding: "10px 12px",
                              fontSize: 12,
                              color: "var(--ink-dim)",
                              lineHeight: 1.5,
                              zIndex: 50,
                              boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                              pointerEvents: "none",
                            }}
                          >
                            <div style={{ color: "var(--ink)", fontWeight: 700, marginBottom: 4 }}>
                              {v[t]} of {v.total} findings
                            </div>
                            {TIER_DEF[t]}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{ textAlign: "right", fontSize: 16, fontWeight: 700 }}>{v.total}</div>
            </div>
          );
        })}
        {tail.length > 0 && (
          <button
            onClick={() => setExpanded((e) => !e)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "none",
              border: "none",
              padding: "6px 8px",
              margin: "2px -8px 0",
              color: "var(--ink-faint)",
              fontSize: 12.5,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <span style={{ transform: expanded ? "rotate(90deg)" : "none", transition: "transform 150ms ease", display: "inline-block" }}>▸</span>
            {expanded ? "Show fewer" : tailLabel}
          </button>
        )}
      </div>
    </div>
  );
}
