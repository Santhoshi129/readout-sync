"use client";
// Spreadsheet-style evidence table for Community Research. Flattens the
// pain-point/solution matrix into one row per solution (pain points with
// no solution get a single row with a placeholder), then makes every
// column sortable and the whole thing searchable/filterable client-side -
// the same UX pattern as RetentionLedger on Retention Signal, applied to
// this page's own data shape.
import { useMemo, useState, type CSSProperties } from "react";
import { PainPoint, label, description, effectivenessLabel, difficultyLabel } from "@/lib/retention-matrix";

type SortKey = "pain_point" | "mentions" | "effectiveness" | "difficulty";
type Perspective = "All" | "Member" | "Owner";

interface Row {
  pain_point: string;
  frequency: number;
  owner_mentions: number;
  member_mentions: number;
  solution: string | null;
  sol_frequency: number | null;
  effectiveness: number | null;
  difficulty: number | null;
}

const SORTS: { key: SortKey; label: string }[] = [
  { key: "mentions", label: "Mentions" },
  { key: "effectiveness", label: "Effectiveness" },
  { key: "difficulty", label: "Difficulty" },
  { key: "pain_point", label: "Pain point (A–Z)" },
];

export function EvidenceTable({ rows: painPoints }: { rows: PainPoint[] }) {
  const [q, setQ] = useState("");
  const [perspective, setPerspective] = useState<Perspective>("All");
  const [sort, setSort] = useState<SortKey>("mentions");

  const flat: Row[] = useMemo(() => {
    const out: Row[] = [];
    painPoints.forEach((pp) => {
      if (pp.solutions.length === 0) {
        out.push({
          pain_point: pp.pain_point, frequency: pp.frequency,
          owner_mentions: pp.owner_mentions, member_mentions: pp.member_mentions,
          solution: null, sol_frequency: null, effectiveness: null, difficulty: null,
        });
      } else {
        pp.solutions.forEach((s) => {
          out.push({
            pain_point: pp.pain_point, frequency: pp.frequency,
            owner_mentions: pp.owner_mentions, member_mentions: pp.member_mentions,
            solution: s.solution, sol_frequency: s.frequency,
            effectiveness: s.effectiveness, difficulty: s.difficulty,
          });
        });
      }
    });
    return out;
  }, [painPoints]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let filtered = flat.filter((r) => {
      if (perspective === "Member" && r.member_mentions === 0) return false;
      if (perspective === "Owner" && r.owner_mentions === 0) return false;
      if (needle) {
        const hay = [label(r.pain_point), r.solution || ""].join(" ").toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    const by: Record<SortKey, (a: Row, b: Row) => number> = {
      mentions: (a, b) => b.frequency - a.frequency,
      effectiveness: (a, b) => (b.effectiveness ?? -1) - (a.effectiveness ?? -1),
      difficulty: (a, b) => (a.difficulty ?? 99) - (b.difficulty ?? 99),
      pain_point: (a, b) => label(a.pain_point).localeCompare(label(b.pain_point)),
    };
    return [...filtered].sort(by[sort]);
  }, [flat, q, perspective, sort]);

  const chipStyle = (on: boolean): CSSProperties => ({
    background: on ? "rgba(201,168,76,0.12)" : "transparent",
    border: `1px solid ${on ? "var(--amber)" : "var(--border)"}`,
    borderRadius: 999,
    color: on ? "var(--amber)" : "var(--ink-dim)",
    fontFamily: "var(--mono)",
    fontSize: 10.5,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    padding: "6px 12px",
    cursor: "pointer",
    transition: "all 150ms ease",
    whiteSpace: "nowrap" as const,
  });

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 18, alignItems: "center" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search pain points or solutions…"
          style={{
            flex: "1 1 220px",
            background: "var(--card-raised)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "8px 12px",
            color: "var(--ink)",
            fontSize: 13,
            fontFamily: "var(--font)",
          }}
        />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(["All", "Member", "Owner"] as Perspective[]).map((p) => (
            <span key={p} style={chipStyle(perspective === p)} onClick={() => setPerspective(p)}>{p}</span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {SORTS.map((s) => (
            <span key={s.key} style={chipStyle(sort === s.key)} onClick={() => setSort(s.key)}>{s.label}</span>
          ))}
        </div>
      </div>

      <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-faint)", marginBottom: 10 }}>
        {visible.length} of {flat.length} rows
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 640 }}>
          <thead>
            <tr>
              {["Pain point", "Mentions", "Member / Owner", "Solution", "Effectiveness", "Difficulty"].map((h) => (
                <th key={h} style={{
                  textAlign: "left", fontFamily: "var(--mono)", fontSize: 10.5, textTransform: "uppercase",
                  letterSpacing: "0.05em", color: "var(--ink-faint)", padding: "0 14px 10px 0",
                  borderBottom: "1px solid var(--border)", whiteSpace: "nowrap",
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: "24px 0", color: "var(--ink-faint)", textAlign: "center" }}>No rows match this search/filter.</td></tr>
            ) : visible.map((r, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--border-soft)" }}>
                <td style={{ padding: "12px 14px 12px 0" }}>
                  <div style={{ fontWeight: 600 }}>{label(r.pain_point)}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-faint)", maxWidth: 260 }}>{description(r.pain_point)}</div>
                </td>
                <td style={{ padding: "12px 14px 12px 0", fontWeight: 700 }}>{r.frequency}</td>
                <td style={{ padding: "12px 14px 12px 0", fontFamily: "var(--mono)", fontSize: 12 }}>
                  <span style={{ color: "var(--cold)" }}>{r.member_mentions}M</span>
                  {" / "}
                  <span style={{ color: "var(--amber)" }}>{r.owner_mentions}O</span>
                </td>
                <td style={{ padding: "12px 14px 12px 0", color: r.solution ? "var(--ink)" : "var(--ink-faint)" }}>
                  {r.solution || "No solution surfaced yet"}
                </td>
                <td style={{ padding: "12px 14px 12px 0" }}>
                  {r.effectiveness != null ? (
                    <span title={`${r.effectiveness}/5`}>
                      <span style={{ color: r.effectiveness >= 4 ? "var(--hot)" : r.effectiveness <= 2 ? "var(--bad)" : "var(--ink-dim)" }}>{effectivenessLabel(r.effectiveness)}</span>
                    </span>
                  ) : "–"}
                </td>
                <td style={{ padding: "12px 14px 12px 0" }}>
                  {r.difficulty != null ? (
                    <span title={`${r.difficulty}/5`}>
                      <span style={{ color: r.difficulty <= 2 ? "var(--hot)" : r.difficulty >= 4 ? "var(--bad)" : "var(--ink-dim)" }}>{difficultyLabel(r.difficulty)}</span>
                    </span>
                  ) : "–"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
