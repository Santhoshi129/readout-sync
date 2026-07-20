"use client";
import { useEffect, useState } from "react";
import { Counter } from "@/components/Counter";
import { perspectiveLabel, PERSPECTIVE_MEANING } from "@/lib/retention-research";
import { NumberTip } from "@/components/NumberTip";

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

const PERSPECTIVE_TONE: Record<string, string> = {
  owner: "var(--amber)",
  member: "var(--hot)",
  vendor: "var(--warm)",
  coach: "var(--cold)",
  employee: "var(--cold)",
  unclear: "var(--muted)",
};

export function PerspectiveBars({
  rows,
  active,
  onSelect,
}: {
  rows: [string, number][];
  active?: string | null;
  onSelect?: (p: string) => void;
}) {
  const mounted = useMounted();
  const max = Math.max(1, ...rows.map(([, c]) => c));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {rows.map(([p, c], i) => {
        const isActive = active === p;
        const w = Math.max(1.5, (c / max) * 100);
        return (
          <div
            key={p}
            className="chart-row"
            onClick={() => onSelect?.(p)}
            style={{
              display: "grid",
              gridTemplateColumns: "150px 1fr 44px",
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
              {perspectiveLabel(p)}
            </div>
            <div className="bar-track thin" title={`${perspectiveLabel(p)}: ${c}`} style={{ opacity: active && !isActive ? 0.45 : 1, transition: "opacity 150ms ease" }}>
              <div className="bar-fill" style={{ width: mounted ? `${w}%` : 0, transitionDelay: `${i * 60}ms`, background: PERSPECTIVE_TONE[p] || "var(--amber)" }} />
            </div>
            <div style={{ textAlign: "right" }}>
              <NumberTip text={PERSPECTIVE_MEANING[p] || "Who's actually behind this count."} align="right">
                <span style={{ fontSize: 16, fontWeight: 700, borderBottom: "1px dotted var(--ink-faint)" }}>
                  <Counter value={c} />
                </span>
              </NumberTip>
            </div>
          </div>
        );
      })}
    </div>
  );
}
