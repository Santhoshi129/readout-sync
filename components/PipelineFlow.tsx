"use client";
// Interactive pipeline flow diagram, v2.
//
// The first version computed node positions with hand-rolled column/row
// math and grew node boxes with a CSS `transform: scale()` layered on top -
// the connector arrows used the pre-transform coordinates, so boxes and
// arrows silently drifted apart from each other and from the grid cells
// meant to keep them separated. That's a whole class of bug (estimated
// geometry vs. rendered geometry disagreeing) rather than one typo, so this
// version doesn't estimate geometry at all: nodes are laid out with real
// CSS Grid (which physically cannot let two cells overlap), and the arrow
// overlay is drawn from positions measured directly off the rendered DOM
// nodes via getBoundingClientRect after mount and on resize. What you see
// on screen is what the arrows are drawn from - there's no second estimate
// that can disagree with it.
//
// Honesty constraint carried over from v1: GHL gives current stage counts,
// not measured transition volume between stages. Arrows show structure
// (which stage can lead to which), not weighted flow - the caption says so.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { fmt } from "@/lib/format";

export interface FlowNode {
  id: string;
  name: string;
  count: number | null;
  desc: string;
  tone?: "cold" | "warm" | "hot" | "amber" | "muted" | "bad";
  col: number;
  row: number;
  /** Optional interactive extra content, only rendered when this node is
   * expanded - e.g. a touch-step breakdown. Never shown by default. */
  extra?: React.ReactNode;
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
  totalOverride,
}: {
  nodes: FlowNode[];
  edges: FlowEdge[];
  title: string;
  note?: string;
  /** Use the real payload total (e.g. lead_gen.total_in_pipeline) for %
   * shares instead of summing only the nodes shown here, so the percentage
   * stays honest even if a node is omitted from this particular diagram. */
  totalOverride?: number | null;
}) {
  const [active, setActive] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [edgePaths, setEdgePaths] = useState<{ key: string; d: string; from: string; to: string }[]>([]);
  const [svgSize, setSvgSize] = useState({ w: 0, h: 0 });

  const sumShown = nodes.reduce((a, n) => a + (n.count ?? 0), 0);
  const total = totalOverride != null && totalOverride > 0 ? totalOverride : sumShown;
  const mismatch = totalOverride != null && totalOverride > 0 && Math.abs(totalOverride - sumShown) > 0;

  const cols = Math.max(...nodes.map((n) => n.col)) + 1;
  const rows = Math.max(...nodes.map((n) => n.row)) + 1;

  const measure = () => {
    const container = containerRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();
    setSvgSize({ w: cRect.width, h: cRect.height });
    const paths: { key: string; d: string; from: string; to: string }[] = [];
    for (const e of edges) {
      const a = nodeRefs.current[e.from];
      const b = nodeRefs.current[e.to];
      if (!a || !b) continue;
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      const x1 = ar.right - cRect.left;
      const y1 = ar.top - cRect.top + ar.height / 2;
      const x2 = br.left - cRect.left;
      const y2 = br.top - cRect.top + br.height / 2;
      const mx = (x1 + x2) / 2;
      paths.push({ key: `${e.from}->${e.to}`, d: `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`, from: e.from, to: e.to });
    }
    setEdgePaths(paths);
  };

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(() => measure());
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", measure);
    // Belt-and-braces re-measures: web font swap (Space Grotesk / Inter)
    // can shift box widths/heights after the first layout pass without
    // firing a ResizeObserver on the container if the grid absorbs it.
    // A couple of cheap follow-up measures after mount catches that.
    const t1 = setTimeout(measure, 150);
    const t2 = setTimeout(measure, 500);
    if (typeof document !== "undefined" && (document as any).fonts?.ready) {
      (document as any).fonts.ready.then(() => measure());
    }
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length, edges.length]);

  const activeNode = active ? nodes.find((n) => n.id === active) : null;
  const connectedIds = new Set(edgePaths.filter((p) => p.from === active || p.to === active).flatMap((p) => [p.from, p.to]));

  return (
    <div className="card" style={{ padding: 32, marginBottom: 24 }}>
      <div className="eyebrow muted" style={{ marginBottom: 6 }}>{title}</div>
      {note && <div style={{ color: "var(--ink-faint)", fontSize: 12.5, marginBottom: 6, maxWidth: 640 }}>{note}</div>}
      <div style={{ color: "var(--ink-faint)", fontSize: 11, marginBottom: 20, fontFamily: "var(--mono)", opacity: 0.75 }}>
        Node size reflects live count. Arrows show which stage can lead to which, not a measured transition volume (GHL doesn't track that). Click a stage for detail.
      </div>
      {mismatch && (
        <div className="stat-flag" style={{ marginBottom: 16, fontSize: 11.5 }}>
          Stages shown here sum to {fmt(sumShown)}, but total pipeline is {fmt(totalOverride)} - the difference is contacts outside these named stages. Percentages below use the real total.
        </div>
      )}

      <div ref={containerRef} style={{ position: "relative", minHeight: rows * 130 }}>
        <svg
          width={svgSize.w}
          height={svgSize.h}
          style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", overflow: "visible" }}
        >
          <defs>
            <marker id="pf-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--ink-faint)" />
            </marker>
            <marker id="pf-arrow-active" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--amber)" />
            </marker>
          </defs>
          {edgePaths.map((p) => {
            const isActive = active != null && (p.from === active || p.to === active);
            return (
              <path
                key={p.key}
                d={p.d}
                fill="none"
                stroke={isActive ? "var(--amber)" : "var(--border-soft, #2a2a2a)"}
                strokeWidth={isActive ? 2.25 : 1.5}
                opacity={active && !isActive ? 0.15 : 1}
                markerEnd={isActive ? "url(#pf-arrow-active)" : "url(#pf-arrow)"}
                style={{ transition: "opacity 150ms, stroke 150ms" }}
              />
            );
          })}
        </svg>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, minmax(90px, auto))`,
            columnGap: 56,
            rowGap: 20,
            position: "relative",
          }}
        >
          {nodes.map((n) => {
            const share = total > 0 ? ((n.count ?? 0) / total) * 100 : 0;
            const isActive = active === n.id;
            const isDim = active != null && !connectedIds.has(n.id) && !isActive;
            return (
              <div
                key={n.id}
                ref={(el) => { nodeRefs.current[n.id] = el; }}
                style={{ gridColumn: n.col + 1, gridRow: n.row + 1, alignSelf: "center" }}
              >
                <div
                  onClick={() => setActive(active === n.id ? null : n.id)}
                  style={{
                    cursor: "pointer",
                    opacity: isDim ? 0.3 : 1,
                    border: `1.5px solid ${isActive ? "var(--amber)" : TONE[n.tone || "cold"]}`,
                    borderRadius: 12,
                    background: "#141414",
                    padding: "14px 16px",
                    textAlign: "center",
                    transition: "opacity 150ms, border-color 150ms, transform 150ms",
                    transform: isActive ? "translateY(-2px)" : "none",
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, whiteSpace: "nowrap" }}>{n.name}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: TONE[n.tone || "cold"] }}>{fmt(n.count)}</div>
                  <div style={{ fontSize: 9.5, fontFamily: "var(--mono)", color: "var(--ink-faint)", marginTop: 4 }}>
                    {total > 0 ? `${share.toFixed(1)}%` : "no data"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {activeNode && (
        <div style={{ marginTop: 18, padding: "16px 18px", background: "rgba(201,168,76,0.06)", border: "1px solid var(--border-soft, #222)", borderRadius: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={{ width: 9, height: 9, borderRadius: 99, background: TONE[activeNode.tone || "cold"] }} />
            <span style={{ fontWeight: 700, fontSize: 14.5 }}>{activeNode.name}</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-faint)" }}>{fmt(activeNode.count)} live</span>
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-dim)", lineHeight: 1.55 }}>{activeNode.desc}</div>
          {activeNode.extra && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border-soft, #222)" }}>
              {activeNode.extra}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
