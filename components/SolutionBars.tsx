"use client";
import { useEffect, useState } from "react";
import { Counter } from "@/components/Counter";
import { solutionCategoryLabel } from "@/lib/retention-research";

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

export function SolutionBars({
  rows,
  active,
  onSelect,
}: {
  rows: [string, number][];
  active?: string | null;
  onSelect?: (s: string) => void;
}) {
  const mounted = useMounted();
  const max = Math.max(1, ...rows.map(([, c]) => c));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {rows.map(([s, c], i) => {
        const isActive = active === s;
        const w = Math.max(1.5, (c / max) * 100);
        return (
          <div
            key={s}
            className="chart-row"
            onClick={() => onSelect?.(s)}
            style={{
              display: "grid",
              gridTemplateColumns: "180px 1fr 44px",
              alignItems: "center",
              gap: 16,
              cursor: onSelect ? "pointer" : "default",
              padding: "4px 8px",
              margin: "-4px -8px",
              borderRadius: 8,
              background: isActive ? "rgba(201,168,76,0.08)" : "transparent",
            }}
          >
            <div style={{ fontSize: 13.5, color: isActive ? "var(--amber)" : "var(--ink-dim)", fontWeight: isActive ? 700 : 400 }}>
              {solutionCategoryLabel(s)}
            </div>
            <div className="bar-track thin" title={`${solutionCategoryLabel(s)}: ${c}`} style={{ opacity: active && !isActive ? 0.45 : 1, transition: "opacity 150ms ease" }}>
              <div className="bar-fill" style={{ width: mounted ? `${w}%` : 0, transitionDelay: `${i * 60}ms`, background: "var(--amber)" }} />
            </div>
            <div style={{ textAlign: "right", fontSize: 16, fontWeight: 700 }}>
              <Counter value={c} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
