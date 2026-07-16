"use client";
import { useEffect, useState } from "react";
import { painPointLabel } from "@/lib/retention-research";

const TIER_COLOR: Record<string, string> = {
  strong: "var(--hot)",
  moderate: "var(--amber)",
  weak: "var(--muted)",
};

const TIER_DEF: Record<string, string> = {
  strong: "Strong: the classifier found this specific, credible, and unambiguous, high trust it's a real, on-topic retention finding.",
  moderate: "Moderate: plausible and on-topic, but the source was less specific or less certain than a strong-tier finding.",
  weak: "Weak: worth watching, not yet a settled fact, treat as a lead rather than something to build a conclusion on.",
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
                className="bar-track thin"
                style={{ display: "flex", opacity: active && !isActive ? 0.45 : 1, transition: "opacity 150ms ease" }}
              >
                {(["strong", "moderate", "weak"] as const).map((t) => {
                  const w = mounted ? (v[t] / max) * 100 : 0;
                  return v[t] > 0 ? (
                    <div
                      key={t}
                      className="bar-fill"
                      title={`${TIER_DEF[t]} ${v[t]} of ${v.total} ${painPointLabel(pp)} findings are ${t}-tier.`}
                      style={{
                        width: `${w}%`,
                        background: TIER_COLOR[t],
                        transitionDelay: `${i * 50}ms`,
                        flex: "none",
                        cursor: "help",
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
