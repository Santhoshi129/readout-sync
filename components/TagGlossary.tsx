"use client";
// Interactive tag glossary: searchable, collapsible groups. Every tag the
// system reads or writes, with what it means and which flow owns it.
import { useState, useMemo } from "react";
import { TagGroup } from "@/lib/tags";

export function TagGlossary({ groups, title }: { groups: TagGroup[]; title: string }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return groups;
    return groups
      .map((g) => ({
        ...g,
        tags: g.tags.filter(
          (t) =>
            t.tag.toLowerCase().includes(needle) ||
            t.meaning.toLowerCase().includes(needle) ||
            (t.writtenBy || "").toLowerCase().includes(needle)
        ),
      }))
      .filter((g) => g.tags.length > 0);
  }, [q, groups]);

  const searching = q.trim().length > 0;
  const total = groups.reduce((a, g) => a + g.tags.length, 0);

  return (
    <div className="card" style={{ padding: 32, marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 8, flexWrap: "wrap" }}>
        <div>
          <div className="eyebrow muted">{title}</div>
          <div style={{ color: "var(--ink-faint)", fontSize: 12.5, marginTop: 6 }}>
            {total} tags and statuses across {groups.length} groups. Click a group to expand; type to search.
          </div>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search tags..."
          style={{
            background: "#101010",
            border: "1px solid var(--border, #2a2a2a)",
            borderRadius: 8,
            color: "var(--ink, #eee)",
            padding: "8px 14px",
            fontSize: 13,
            minWidth: 220,
            outline: "none",
          }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
        {filtered.length === 0 && (
          <div style={{ color: "var(--ink-faint)", fontSize: 13.5, padding: "10px 0" }}>No tags match "{q}".</div>
        )}
        {filtered.map((g) => {
          const isOpen = searching || !!open[g.group];
          return (
            <div key={g.group} style={{ border: "1px solid var(--border-soft, #222)", borderRadius: 10, overflow: "hidden" }}>
              <button
                onClick={() => setOpen((o) => ({ ...o, [g.group]: !o[g.group] }))}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  background: "transparent",
                  border: "none",
                  color: "var(--ink, #eee)",
                  padding: "14px 18px",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span style={{ fontSize: 14.5, fontWeight: 700 }}>{g.group}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--ink-faint)", letterSpacing: "0.1em" }}>
                    {g.tags.length} TAGS
                  </span>
                  <span style={{ color: "var(--amber, #C9A84C)", fontSize: 13, transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s", display: "inline-block" }}>
                    &#9656;
                  </span>
                </span>
              </button>
              {isOpen && (
                <div style={{ padding: "0 18px 16px" }}>
                  <div style={{ color: "var(--ink-faint)", fontSize: 12.5, marginBottom: 12 }}>{g.blurb}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {g.tags.map((t) => (
                      <div key={t.tag} style={{ display: "grid", gridTemplateColumns: "minmax(180px, 260px) 1fr", gap: 16, alignItems: "start" }}>
                        <code
                          style={{
                            fontFamily: "var(--mono)",
                            fontSize: 11.5,
                            color: "var(--amber, #C9A84C)",
                            background: "rgba(201,168,76,0.08)",
                            border: "1px solid rgba(201,168,76,0.18)",
                            borderRadius: 6,
                            padding: "4px 8px",
                            lineHeight: 1.5,
                            wordBreak: "break-word",
                          }}
                        >
                          {t.tag}
                        </code>
                        <div style={{ fontSize: 13, color: "var(--ink-dim)", lineHeight: 1.55 }}>
                          {t.meaning}
                          {t.writtenBy && (
                            <span style={{ color: "var(--ink-faint)", fontSize: 11.5 }}> {" "}({t.writtenBy})</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
