"use client";
import { useState, useEffect } from "react";
import { Counter } from "@/components/Counter";
import { label, description, PainPoint } from "@/lib/retention-matrix";

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

// Clickable ranked bar list (member vs owner mentions, stacked) with an
// attached drill-down panel showing that pain point's solutions. Unlike
// the shared Bars component, rows here are interactive - clicking one
// filters the detail panel below without navigating away, so someone can
// walk the full list without losing place.
export function PainPointRanking({ rows }: { rows: PainPoint[] }) {
  const mounted = useMounted();
  const [selected, setSelected] = useState<string>(rows[0]?.pain_point ?? "");
  const max = Math.max(1, ...rows.map((r) => r.frequency));
  const active = rows.find((r) => r.pain_point === selected);

  return (
    <div className="grid grid-2" style={{ gap: 24, alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map((r, i) => {
          const memberW = (r.member_mentions / max) * 100;
          const ownerW = (r.owner_mentions / max) * 100;
          const isActive = r.pain_point === selected;
          return (
            <button
              key={r.pain_point}
              onClick={() => setSelected(r.pain_point)}
              style={{
                all: "unset",
                cursor: "pointer",
                display: "grid",
                gridTemplateColumns: "168px 1fr 40px",
                alignItems: "center",
                gap: 14,
                padding: "8px 10px",
                margin: "-8px -10px",
                borderRadius: 8,
                background: isActive ? "rgba(201,168,76,0.08)" : "transparent",
                border: isActive ? "1px solid var(--border)" : "1px solid transparent",
                transition: "background 150ms ease, border-color 150ms ease",
              }}
            >
              <span style={{ fontSize: 13.5, color: isActive ? "var(--ink)" : "var(--ink-dim)", fontWeight: isActive ? 600 : 400, textAlign: "left" }}>
                {label(r.pain_point)}
              </span>
              <span className="bar-track thin" style={{ display: "flex", overflow: "hidden", borderRadius: 4 }}>
                <span style={{ width: mounted ? `${memberW}%` : 0, background: "var(--cold)", transition: `width 700ms cubic-bezier(0.16,1,0.3,1) ${i * 50}ms` }} />
                <span style={{ width: mounted ? `${ownerW}%` : 0, background: "var(--amber)", transition: `width 700ms cubic-bezier(0.16,1,0.3,1) ${i * 50}ms` }} />
              </span>
              <span style={{ textAlign: "right", fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>
                <Counter value={r.frequency} />
              </span>
            </button>
          );
        })}
        <div style={{ display: "flex", gap: 18, marginTop: 6, fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-faint)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}><i className="dot-legend" style={{ background: "var(--cold)" }} />Member mentions</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}><i className="dot-legend" style={{ background: "var(--amber)" }} />Owner mentions</span>
        </div>
      </div>

      <div className="card" style={{ padding: 22 }}>
        {active ? (
          <>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>{label(active.pain_point)}</div>
            <div style={{ fontSize: 13, color: "var(--ink-faint)", marginBottom: 18 }}>{description(active.pain_point)}</div>
            {active.solutions.length === 0 ? (
              <div style={{ color: "var(--ink-faint)", fontSize: 13, padding: "16px 0" }}>
                No solutions surfaced yet for this pain point — discussions describe the problem, not a fix.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    {["Solution mentioned", "Mentions", "Effectiveness", "Difficulty"].map((h) => (
                      <th key={h} style={{ textAlign: "left", fontFamily: "var(--mono)", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-faint)", padding: "0 10px 8px 0", borderBottom: "1px solid var(--border-soft)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {active.solutions.map((s) => (
                    <tr key={s.solution}>
                      <td style={{ padding: "10px 10px 10px 0", borderBottom: "1px solid var(--border-soft)" }}>{s.solution}</td>
                      <td style={{ padding: "10px 10px 10px 0", borderBottom: "1px solid var(--border-soft)" }}>{s.frequency}</td>
                      <td style={{ padding: "10px 10px 10px 0", borderBottom: "1px solid var(--border-soft)" }}>
                        {s.effectiveness != null ? `${s.effectiveness}/5` : "–"}
                      </td>
                      <td style={{ padding: "10px 10px 10px 0", borderBottom: "1px solid var(--border-soft)" }}>
                        {s.difficulty != null ? `${s.difficulty}/5` : "–"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        ) : (
          <div style={{ color: "var(--ink-faint)", fontSize: 13 }}>Select a pain point to see its solutions.</div>
        )}
      </div>
    </div>
  );
}
