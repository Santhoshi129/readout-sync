"use client";
import { useEffect, useState } from "react";
import { Counter } from "@/components/Counter";
import { solutionCategoryLabel, SolutionExample, NO_SOLUTION_KEY } from "@/lib/retention-research";

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

const VISIBLE_CAP = 15;

export function SolutionBars({
  rows,
  active,
  onSelect,
  examples,
}: {
  rows: [string, number][];
  active?: string | null;
  onSelect?: (s: string) => void;
  examples?: Record<string, SolutionExample[]>;
}) {
  const mounted = useMounted();
  const max = Math.max(1, ...rows.map(([, c]) => c));
  const [hoverLabel, setHoverLabel] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  // rows arrives pre-sorted by count descending. Past a point every extra
  // row is a one-off, low-signal category - showing all of them at once is
  // what made this chart slow to actually read. Cap what renders by
  // default and let the tail expand on demand instead.
  const tail = rows.slice(VISIBLE_CAP);
  const visible = expanded ? rows : rows.slice(0, VISIBLE_CAP);
  const tailAllSame = tail.length > 0 && tail.every(([, c]) => c === tail[0][1]);
  const tailLabel = tail.length === 0 ? "" : tailAllSame
    ? `+${tail.length} more ${tail.length === 1 ? "category" : "categories"} (mentioned ${tail[0][1] === 1 ? "once" : `${tail[0][1]}x`} each)`
    : `+${tail.length} more categories (${tail[tail.length - 1][1]}-${tail[0][1]} mentions each)`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {visible.map(([s, c], i) => {
        const isActive = active === s;
        const w = Math.max(1.5, (c / max) * 100);
        const ex = examples?.[s];
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
            <div
              style={{ position: "relative" }}
              onMouseEnter={(e) => {
                e.stopPropagation();
                setHoverLabel(s);
              }}
              onMouseLeave={() => setHoverLabel((h) => (h === s ? null : h))}
              onClick={(e) => {
                e.stopPropagation();
                setHoverLabel((h) => (h === s ? null : s));
              }}
            >
              <div
                style={{
                  fontSize: 13.5,
                  color: isActive ? "var(--amber)" : "var(--ink-dim)",
                  fontWeight: isActive ? 700 : 400,
                  cursor: ex?.length || s === NO_SOLUTION_KEY ? "pointer" : "default",
                  borderBottom: ex?.length || s === NO_SOLUTION_KEY ? "1px dotted var(--ink-faint)" : "none",
                  display: "inline-block",
                }}
              >
                {solutionCategoryLabel(s)}
              </div>
              {hoverLabel === s && s === NO_SOLUTION_KEY ? (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    marginTop: 8,
                    width: 300,
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
                  This isn&apos;t a solution. It&apos;s every finding where nobody described trying anything at all. People venting about the problem without saying what (if anything) they did about it. Treat this count as a floor on unaddressed problem space, not a real fix category.
                </div>
              ) : hoverLabel === s && ex?.length ? (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    marginTop: 8,
                    width: 300,
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
                  <div style={{ fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: "0.06em", color: "var(--ink-faint)", marginBottom: 8 }}>
                    HOW THIS ACTUALLY PLAYED OUT
                  </div>
                  {ex.map((e, idx) => (
                    <div key={idx} style={{ marginBottom: idx < ex.length - 1 ? 5 : 0 }} title={e.text}>
                      • {e.short}
                    </div>
                  ))}
                </div>
              ) : null}
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
  );
}
