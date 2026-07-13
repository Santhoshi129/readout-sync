"use client";
// Interactive pipeline flow diagram. Replaces the flat segmented-strip
// PipelineMap with an actual directed graph: nodes positioned by real
// pipeline logic (which stage leads to which), sized by live count.
//
// Honesty constraint: GHL gives us the CURRENT count sitting in each stage,
// not a measured transition volume between stages (we don't have "N contacts
// moved from No Response to Instagram Outreach last week" data). So edges
// here are drawn as uniform structural arrows showing which stage CAN lead
// to which - never weighted to imply a flow volume we haven't measured.
// Node size/color intensity is the only thing driven by live numbers, and
// that's explicit in the caption so nobody misreads a thin line as "low
// conversion" when it's actually just "no transition data is tracked."
import { useState } from "react";
import { fmt } from "@/lib/format";

export interface FlowNode {
  id: string;
  name: string;
  count: number | null;
  desc: string;
  tone?: "cold" | "warm" | "hot" | "amber" | "muted" | "bad";
  col: number; // layer / column, 0-indexed left to right
  row: number; // vertical slot within the column
}
export interface FlowEdge {
  from: string;
  to: string;
}

const TONE: Record<string, string> = {
  cold: "#4c7dc9",
  warm: "#c98a4c",
  hot: "#c94c4c",
  amber: "#C9A84C",
  muted: "#666",
  bad: "#e5484d",
};

export function PipelineFlow({
  nodes,
  edges,
  title,
  note,
}: {
  nodes: FlowNode[];
  edges: FlowEdge[];
  title: string;
  note?: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  const total = nodes.reduce((a, n) => a + (n.count ?? 0), 0);

  const cols = Math.max(...nodes.map((n) => n.col)) + 1;
  const rowsPerCol: Record<number, number> = {};
  nodes.forEach((n) => { rowsPerCol[n.col] = Math.max(rowsPerCol[n.col] ?? 0, n.row + 1); });
  const maxRows = Math.max(...Object.values(rowsPerCol));

  const W = 900;
  const H = Math.max(280, maxRows * 130);
  const colW = W / cols;
  const nodeW = Math.min(180, colW - 40);
  const nodeH = 64;

  const pos = (id: string) => {
    const n = nodes.find((x) => x.id === id)!;
    const colRows = rowsPerCol[n.col];
    const slotH = H / colRows;
    return {
      x: n.col * colW + colW / 2,
      y: slotH * n.row + slotH / 2,
      w: nodeW,
      h: nodeH,
    };
  };

  const activeNode = active ? nodes.find((n) => n.id === active) : null;
  const connectedEdges = active ? edges.filter((e) => e.from === active || e.to === active) : [];
  const connectedIds = new Set(connectedEdges.flatMap((e) => [e.from, e.to]));

  return (
    <div className="card" style={{ padding: 32, marginBottom: 24 }}>
      <div className="eyebrow muted" style={{ marginBottom: 6 }}>{title}</div>
      {note && <div style={{ color: "var(--ink-faint)", fontSize: 12.5, marginBottom: 6, maxWidth: 640 }}>{note}</div>}
      <div style={{ color: "var(--ink-faint)", fontSize: 11, marginBottom: 20, fontFamily: "var(--mono)", opacity: 0.75 }}>
        Node size = live count in that stage right now. Arrows show which stage can lead to which - not a measured transition volume (that isn't tracked in GHL).
      </div>

      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block", overflow: "visible" }}>
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--ink-faint)" />
          </marker>
          <marker id="arrowActive" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--amber)" />
          </marker>
        </defs>

        {edges.map((e, i) => {
          const a = pos(e.from);
          const b = pos(e.to);
          const isActive = active && (e.from === active || e.to === active);
          const x1 = a.x + a.w / 2, y1 = a.y;
          const x2 = b.x - b.w / 2, y2 = b.y;
          const mx = (x1 + x2) / 2;
          return (
            <path
              key={i}
              d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
              fill="none"
              stroke={isActive ? "var(--amber)" : "var(--border-soft, #222)"}
              strokeWidth={isActive ? 2 : 1.5}
              opacity={active && !isActive ? 0.15 : 1}
              markerEnd={isActive ? "url(#arrowActive)" : "url(#arrow)"}
              style={{ transition: "opacity 150ms, stroke 150ms" }}
            />
          );
        })}

        {nodes.map((n) => {
          const p = pos(n.id);
          const isActive = active === n.id;
          const isDim = active != null && !connectedIds.has(n.id) && !isActive;
          const share = total > 0 ? ((n.count ?? 0) / total) * 100 : 0;
          const scale = 0.85 + Math.min(0.3, share / 100);
          return (
            <g
              key={n.id}
              transform={`translate(${p.x}, ${p.y})`}
              onClick={() => setActive(active === n.id ? null : n.id)}
              style={{ cursor: "pointer", opacity: isDim ? 0.28 : 1, transition: "opacity 150ms" }}
            >
              <rect
                x={-p.w / 2}
                y={-p.h / 2}
                width={p.w}
                height={p.h}
                rx="12"
                fill="#141414"
                stroke={isActive ? "var(--amber)" : TONE[n.tone || "cold"]}
                strokeWidth={isActive ? 2.5 : 1.5}
                style={{ transform: `scale(${isActive ? scale + 0.04 : scale})`, transformOrigin: "center", transition: "transform 200ms cubic-bezier(0.16,1,0.3,1)" }}
              />
              <text x="0" y={-p.h / 2 + 22} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--ink)">
                {n.name}
              </text>
              <text x="0" y="6" textAnchor="middle" fontSize="20" fontWeight="800" fill={TONE[n.tone || "cold"]}>
                {fmt(n.count)}
              </text>
              <text x="0" y={p.h / 2 - 10} textAnchor="middle" fontSize="9.5" fontFamily="var(--mono)" fill="var(--ink-faint)">
                {total > 0 ? `${share.toFixed(1)}% of pipeline` : "no data"}
              </text>
            </g>
          );
        })}
      </svg>

      {activeNode && (
        <div style={{ marginTop: 8, padding: "16px 18px", background: "rgba(201,168,76,0.06)", border: "1px solid var(--border-soft, #222)", borderRadius: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={{ width: 9, height: 9, borderRadius: 99, background: TONE[activeNode.tone || "cold"] }} />
            <span style={{ fontWeight: 700, fontSize: 14.5 }}>{activeNode.name}</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-faint)" }}>{fmt(activeNode.count)} live</span>
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-dim)", lineHeight: 1.55 }}>{activeNode.desc}</div>
        </div>
      )}
    </div>
  );
}
