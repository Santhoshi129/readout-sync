"use client";
import { useEffect, useState } from "react";
import { Counter } from "@/components/Counter";

const SEVERITY_TONE = ["var(--muted)", "var(--muted)", "var(--amber)", "var(--amber)", "var(--bad)"];
const SEVERITY_DEF: Record<number, string> = {
  1: "Passing annoyance, mentioned in passing, not described as a reason to leave.",
  2: "Noticeable irritation, but not framed as close to a breaking point.",
  3: "A real complaint, the kind of thing that adds up over time.",
  4: "Described as a genuine factor in someone leaving or seriously considering it.",
  5: "Stated directly as the reason, or close to it, someone left or nearly left.",
};

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
  const [hover, setHover] = useState<number | null>(null);

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
              style={{ position: "relative", padding: "10px 0", margin: "-10px 0" }}
              onMouseEnter={() => setHover(r.severity)}
              onMouseLeave={() => setHover((h) => (h === r.severity ? null : h))}
            >
              <div
                className="bar-track thin"
                style={{ opacity: active != null && !isActive ? 0.45 : 1, transition: "opacity 150ms ease", cursor: "help" }}
              >
                <div
                  className="bar-fill"
                  style={{ width: mounted ? `${w}%` : 0, transitionDelay: `${i * 60}ms`, background: SEVERITY_TONE[r.severity - 1] }}
                />
              </div>
              {hover === r.severity && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "140%",
                    left: 0,
                    width: 240,
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
                    {r.count} findings at severity {r.severity}
                  </div>
                  {SEVERITY_DEF[r.severity]}
                </div>
              )}
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
