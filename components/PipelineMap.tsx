"use client";
// Live pipeline map: every stage of the GHL pipeline as a strip, with live
// counts and a short description on hover/click. Counts come straight from
// the Readout payload; nothing is hardcoded.
import { useState } from "react";
import { fmt } from "@/lib/format";

export interface StageDef {
  name: string;
  count: number | null;
  desc: string;
  tone?: "cold" | "warm" | "hot" | "amber" | "muted" | "bad";
}

const TONE: Record<string, string> = {
  cold: "var(--cold, #4c7dc9)",
  warm: "var(--warm, #c98a4c)",
  hot: "var(--hot, #c94c4c)",
  amber: "var(--amber, #C9A84C)",
  muted: "var(--muted, #555)",
  bad: "var(--bad, #e5484d)",
};

export function PipelineMap({ stages, title, note }: { stages: StageDef[]; title: string; note?: string }) {
  const [active, setActive] = useState<number | null>(null);
  const total = stages.reduce((a, s) => a + (s.count ?? 0), 0);

  return (
    <div className="card" style={{ padding: 32, marginBottom: 24 }}>
      <div className="eyebrow muted" style={{ marginBottom: 6 }}>{title}</div>
      {note && <div style={{ color: "var(--ink-faint)", fontSize: 12.5, marginBottom: 18 }}>{note}</div>}

      <div style={{ display: "flex", gap: 6, marginBottom: 18, borderRadius: 8, overflow: "hidden" }}>
        {stages.map((s, i) => {
          const share = total > 0 ? Math.max(2, ((s.count ?? 0) / total) * 100) : 100 / stages.length;
          return (
            <div
              key={s.name}
              onMouseEnter={() => setActive(i)}
              onClick={() => setActive(active === i ? null : i)}
              title={`${s.name}: ${fmt(s.count)}`}
              style={{
                flexBasis: `${share}%`,
                minWidth: 14,
                height: 34,
                background: TONE[s.tone || "cold"],
                opacity: active === null || active === i ? 0.95 : 0.3,
                transition: "opacity 0.15s, flex-basis 0.4s",
                cursor: "pointer",
                borderRadius: 4,
              }}
            />
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        {stages.map((s, i) => (
          <div
            key={s.name}
            onMouseEnter={() => setActive(i)}
            onClick={() => setActive(active === i ? null : i)}
            style={{
              border: `1px solid ${active === i ? TONE[s.tone || "cold"] : "var(--border-soft, #222)"}`,
              borderRadius: 10,
              padding: "12px 14px",
              cursor: "pointer",
              transition: "border-color 0.15s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: TONE[s.tone || "cold"], flexShrink: 0 }} />
              <span style={{ fontSize: 12.5, fontWeight: 700 }}>{s.name}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 6 }}>{fmt(s.count)}</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-faint)", marginTop: 2 }}>
              {total > 0 ? `${(((s.count ?? 0) / total) * 100).toFixed(1)}% of pipeline` : "no data yet"}
            </div>
            {active === i && (
              <div style={{ fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.5, marginTop: 8, borderTop: "1px solid var(--border-soft, #222)", paddingTop: 8 }}>
                {s.desc}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
