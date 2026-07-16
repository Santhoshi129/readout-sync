"use client";
import { useEffect, useState } from "react";
import { Counter } from "@/components/Counter";

const SEVERITY_TONE = ["var(--muted)", "var(--muted)", "var(--amber)", "var(--amber)", "var(--bad)"];

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

export function SeverityBars({
  rows,
  active,
  onSelect,
}: {
  rows: { severity: number; count: number }[];
  active?: number | null;
  onSelect?: (severity: number) => void;
}) {
  const mounted = useMounted();
  const max = Math.max(1, ...rows.map((r) => r.count));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {rows.map((r, i) => {
        const isActive = active === r.severity;
        const w = Math.max(1.5, (r.count / max) * 100);
        return (
          <div
            key={r.severity}
            className="chart-row"
            onClick={() => onSelect?.(r.severity)}
            style={{
              display: "grid",
              gridTemplateColumns: "70px 1fr 44px",
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
              {r.severity} / 5
            </div>
            <div
              className="bar-track thin"
              title={`Severity ${r.severity}: ${r.count}`}
              style={{ opacity: active != null && !isActive ? 0.45 : 1, transition: "opacity 150ms ease" }}
            >
              <div
                className="bar-fill"
                style={{ width: mounted ? `${w}%` : 0, transitionDelay: `${i * 60}ms`, background: SEVERITY_TONE[r.severity - 1] }}
              />
            </div>
            <div style={{ textAlign: "right", fontSize: 16, fontWeight: 700 }}>
              <Counter value={r.count} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
