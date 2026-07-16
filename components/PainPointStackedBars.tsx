"use client";
import { useEffect, useState } from "react";
import { painPointLabel } from "@/lib/retention-research";

const TIER_COLOR: Record<string, string> = {
  strong: "var(--hot)",
  moderate: "var(--amber)",
  weak: "var(--muted)",
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

  return (
    <div>
      <div className="compare-legend" style={{ marginBottom: 22 }}>
        {(["strong", "moderate", "weak"] as const).map((t) => (
          <span key={t}>
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
                className="bar-track thin"
                style={{ display: "flex", opacity: active && !isActive ? 0.45 : 1, transition: "opacity 150ms ease" }}
                title={`${painPointLabel(pp)}: ${v.total} (strong ${v.strong} · moderate ${v.moderate} · weak ${v.weak})`}
              >
                {(["strong", "moderate", "weak"] as const).map((t) => {
                  const w = mounted ? (v[t] / max) * 100 : 0;
                  return v[t] > 0 ? (
                    <div
                      key={t}
                      className="bar-fill"
                      style={{
                        width: `${w}%`,
                        background: TIER_COLOR[t],
                        transitionDelay: `${i * 50}ms`,
                        flex: "none",
                      }}
                    />
                  ) : null;
                })}
              </div>
              <div style={{ textAlign: "right", fontSize: 16, fontWeight: 700 }}>{v.total}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
