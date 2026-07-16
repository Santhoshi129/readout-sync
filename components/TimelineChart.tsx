"use client";
import { useEffect, useState } from "react";

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

export function TimelineChart({ rows }: { rows: [string, number][] }) {
  const mounted = useMounted();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...rows.map(([, c]) => c));
  const height = 160;

  if (rows.length === 0) {
    return <div style={{ color: "var(--ink-faint)", fontSize: 13 }}>No dated findings yet.</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height, marginBottom: 10 }}>
        {rows.map(([q, c], i) => {
          const h = mounted ? Math.max(3, (c / max) * (height - 20)) : 0;
          return (
            <div
              key={q}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", minWidth: 8, cursor: "default" }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover((h2) => (h2 === i ? null : h2))}
            >
              {hover === i && (
                <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink)", marginBottom: 4, whiteSpace: "nowrap" }}>
                  {c}
                </div>
              )}
              <div
                style={{
                  width: "100%",
                  height: h,
                  borderRadius: "3px 3px 0 0",
                  background: hover === i ? "var(--amber-bright)" : "var(--amber)",
                  transition: "height 900ms cubic-bezier(0.16,1,0.3,1), background 150ms ease",
                  transitionDelay: `${i * 30}ms`,
                }}
              />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 6, height: rows.length > 12 ? 70 : 20 }}>
        {rows.map(([q], i) => (
          <div
            key={q}
            style={{
              flex: 1,
              display: "flex",
              alignItems: rows.length > 12 ? "flex-start" : "center",
              justifyContent: "center",
              textAlign: "center",
              fontFamily: "var(--mono)",
              fontSize: 10.5,
              fontWeight: hover === i ? 700 : 500,
              color: hover === i ? "var(--amber-bright)" : "var(--ink-dim)",
              writingMode: rows.length > 12 ? "vertical-rl" : "horizontal-tb",
              minWidth: 8,
              transition: "color 150ms ease",
            }}
          >
            {q.replace("20", "'")}
          </div>
        ))}
      </div>
    </div>
  );
}
