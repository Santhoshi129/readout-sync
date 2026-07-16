"use client";
import { useEffect, useState } from "react";
import { painPointLabel } from "@/lib/retention-research";

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

export function PainPointStackedBars({
  rows,
  active,
  onSelect,
}: {
  rows: [string, { weak: number; moderate: number; strong: number; total: number }][];
  active?: string | null;
  onSelect?: (pp: string) => void;
}) {
  const mounted = useMounted();
  const max = Math.max(1, ...rows.map(([, v]) => v.total));
  const [hoverKey, setHoverKey] = useState<string | null>(null);

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
        {rows.map(([pp, v], i) => {
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
              <div style={{ fontSize: 13.5, color: isActive ? "var(--amber)" : "var(--ink-dim)", fontWeight: isActive ? 700 : 400 }}>
                {painPointLabel(pp)}
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
      </div>
    </div>
  );
}
